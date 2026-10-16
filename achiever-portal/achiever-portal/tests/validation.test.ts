import { describe, expect, it } from "vitest";
import { emailSchema, evaluationSchema, inviteSchema, onboardingSchema, otpSchema, parseTeamMembers, submissionSchema } from "@/lib/validation";

const today = "2026-10-16";
const valid = {
  title: "Hostel energy dashboard",
  description: "A dashboard that tracks hostel electricity usage and cut waste by 12% over a month.",
  category: "Project",
  teamMembers: "Riya Saxena, Manav Arora",
  submissionDate: today,
  publicSummary: "",
  projectUrl: "https://github.com/example/energy",
  declaration: "on",
};

describe("student email verification inputs", () => {
  it("normalises email and validates OTP codes", () => {
    expect(emailSchema.parse("  Student@Example.EDU ")).toBe("student@example.edu");
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(otpSchema.safeParse("123456").success).toBe(true);
    expect(otpSchema.safeParse("12ab56").success).toBe(false);
  });
});

describe("onboarding", () => {
  it("uppercases VID and rejects bad characters", () => {
    expect(onboardingSchema.parse({ fullName: "Meera Iyer", vid: "ab-1234" }).vid).toBe("AB-1234");
    expect(onboardingSchema.safeParse({ fullName: "Meera Iyer", vid: "12" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ fullName: "<script>", vid: "AB1234" }).success).toBe(false);
  });
});

describe("submission validation", () => {
  const schema = submissionSchema(today);

  it("accepts a complete submission", () => {
    const r = schema.parse(valid);
    expect(r.teamMembers).toEqual(["Riya Saxena", "Manav Arora"]);
    expect(r.publicSummary).toBeNull();
  });

  it("only allows the five categories", () => {
    expect(schema.safeParse({ ...valid, category: "Sports" }).success).toBe(false);
    for (const c of ["Research", "Placement", "Revenue Generation", "Project", "Other"]) {
      expect(schema.safeParse({ ...valid, category: c }).success).toBe(true);
    }
  });

  it("rejects future dates, missing declaration and non-https links", () => {
    expect(schema.safeParse({ ...valid, submissionDate: "2026-10-17" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, declaration: undefined }).success).toBe(false);
    expect(schema.safeParse({ ...valid, projectUrl: "http://insecure.example" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, projectUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("limits team size", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `Member ${i + 1}`).join("\n");
    expect(schema.safeParse({ ...valid, teamMembers: eleven }).success).toBe(false);
    expect(parseTeamMembers("A B,\n C D , ,")).toEqual(["A B", "C D"]);
  });
});

describe("evaluation validation", () => {
  it("drafts can be incomplete; final submissions need recommendation + confirmation", () => {
    expect(evaluationSchema.safeParse({ intent: "draft" }).success).toBe(true);
    expect(evaluationSchema.safeParse({ intent: "submit", recommendation: "yes" }).success).toBe(false);
    expect(evaluationSchema.safeParse({ intent: "submit", recommendation: "yes", confirmFinal: "on" }).success).toBe(true);
  });
  it("bounds scores", () => {
    expect(evaluationSchema.safeParse({ intent: "draft", score: "101" }).success).toBe(false);
    expect(evaluationSchema.safeParse({ intent: "draft", originality: "11" }).success).toBe(false);
    expect(evaluationSchema.parse({ intent: "draft", score: "" }).score).toBeNull();
  });
});

describe("invitation validation", () => {
  it("binds to email OR domain, not both", () => {
    expect(inviteSchema.safeParse({ email: "a@uni.edu", emailDomain: "uni.edu", expiresInDays: "7", maxUses: "1" }).success).toBe(false);
    expect(inviteSchema.parse({ emailDomain: "@Uni.Edu.in", expiresInDays: "7", maxUses: "1" }).emailDomain).toBe("uni.edu.in");
    expect(inviteSchema.safeParse({ expiresInDays: "90", maxUses: "1" }).success).toBe(false);
  });
});
