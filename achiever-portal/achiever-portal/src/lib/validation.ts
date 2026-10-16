import { z } from "zod";
import { CATEGORIES } from "@/lib/types";
import { isValidISODate } from "@/lib/dates";

// Shared validation used on BOTH the client (instant feedback) and the server (the real check).

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Enter your email address.")
  .max(254)
  .email("Enter a valid email address.");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/, "Enter the numeric code from the email.");

export const vidSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,20}$/, "VID must be 4–20 letters, digits or hyphens.");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Name is too long.")
  .regex(/^[\p{L}][\p{L} .'-]*$/u, "Use letters, spaces, dots, apostrophes or hyphens only.");

export const onboardingSchema = z.object({
  fullName: fullNameSchema,
  vid: vidSchema,
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

export function parseTeamMembers(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function submissionSchema(today: string) {
  return z.object({
    title: z.string().trim().min(5, "Title must be at least 5 characters.").max(160),
    description: z.string().trim().min(30, "Describe the project in at least 30 characters.").max(5000),
    category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Choose a category." }) }),
    teamMembers: z
      .string()
      .optional()
      .transform((v) => parseTeamMembers(v ?? ""))
      .pipe(
        z
          .array(z.string().min(2, "Each team member name needs 2+ characters.").max(120))
          .max(10, "List at most 10 team members."),
      ),
    submissionDate: z
      .string()
      .refine(isValidISODate, "Enter a valid date.")
      .refine((d) => d <= today, "Submission date cannot be in the future."),
    publicSummary: optionalText(400),
    projectUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^https:\/\/[^\s]+$/i.test(v), "Link must start with https://"),
    declaration: z.literal("on", { errorMap: () => ({ message: "You must confirm the declaration." }) }),
  });
}

export const RUBRIC_CRITERIA = [
  { key: "originality", label: "Originality" },
  { key: "impact", label: "Impact" },
  { key: "execution", label: "Execution quality" },
  { key: "evidence", label: "Evidence & documentation" },
] as const;

const optionalNumber = (min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), `Enter a number from ${min} to ${max}.`);

export const evaluationSchema = z
  .object({
    intent: z.enum(["draft", "submit"]),
    recommendation: z.enum(["yes", "no"]).optional(),
    score: optionalNumber(0, 100),
    originality: optionalNumber(0, 10),
    impact: optionalNumber(0, 10),
    execution: optionalNumber(0, 10),
    evidence: optionalNumber(0, 10),
    privateRemarks: optionalText(4000),
    confirmFinal: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.intent === "submit") {
      if (!v.recommendation) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["recommendation"], message: "Choose Yes or No before submitting." });
      }
      if (v.confirmFinal !== "on") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmFinal"], message: "Confirm that this evaluation is final." });
      }
    }
  });

export const inviteSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || z.string().email().safeParse(v).success, "Enter a valid email."),
    emailDomain: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v ? v.replace(/^@/, "") : null))
      .refine((v) => v === null || /^[a-z0-9.-]+\.[a-z]{2,}$/.test(v), "Enter a domain like university.edu.in"),
    expiresInDays: z.coerce.number().int().min(1).max(30),
    maxUses: z.coerce.number().int().min(1).max(50),
    note: optionalText(200),
  })
  .refine((v) => !(v.email && v.emailDomain), {
    message: "Bind the invitation to an email OR a domain, not both.",
    path: ["emailDomain"],
  });

export const achievementSchema = z.object({
  submissionId: z.string().uuid(),
  periodType: z.enum(["day", "week"]),
  periodStart: z.string().refine(isValidISODate, "Invalid date."),
  rank: z.coerce.number().int().min(1).max(100),
  publicRemark: optionalText(280),
  rationale: z.string().trim().min(10, "Record why this submission was selected (10+ characters).").max(2000),
});

export const settingsSchema = z.object({
  submissionsOpen: z.string().optional().transform((v) => v === "on"),
  submissionDeadline: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Invalid deadline."),
  maxSubmissionsPerDay: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 50), "Enter 1–50 or leave empty."),
  rankingMethod: z.enum(["votes", "score", "combined"]),
  voteWeight: z.coerce.number().min(0).max(1),
  minEvaluations: z.coerce.number().int().min(1).max(20),
  rubricEnabled: z.string().optional().transform((v) => v === "on"),
});

/** Flatten Zod errors to { field: firstMessage } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
