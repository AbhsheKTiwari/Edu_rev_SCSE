import type { Category, PeriodType, PublicAchiever } from "@/lib/types";
import { addDays, diffDays, weekStart } from "@/lib/dates";
import { initialsOf } from "@/lib/podium";

// SYNTHETIC demo records only. Shown only when NEXT_PUBLIC_DEMO_MODE=true,
// always under a visible DEMO banner. None of these are real students.

const NAMES = [
  "Aanya Kapoor", "Rohan Verma", "Ishita Bansal", "Kabir Malhotra", "Meera Iyer", "Arjun Sethi",
  "Simran Gill", "Dev Khanna", "Tara Menon", "Nikhil Rao", "Priya Nair", "Yash Thakur",
  "Zoya Qureshi", "Ira Bhatt", "Ananya Das", "Siddharth Pillai", "Kavya Reddy", "Aditya Chauhan",
  "Riya Saxena", "Manav Arora", "Neha Kulkarni", "Vikram Bedi", "Kunal Mishra", "Sana Farooqui",
];

const CATS: Category[] = ["Research", "Placement", "Revenue Generation", "Project", "Other"];

const TITLES: Record<Category, string[]> = {
  Research: [
    "Low-cost soil moisture sensing for small farms",
    "Lightweight model for early crop-disease detection",
    "Survey of regional-language speech datasets",
    "Paper accepted at a peer-reviewed conference",
  ],
  Placement: [
    "Campus placement offer — software engineering",
    "Pre-placement offer after summer internship",
    "Placement offer — data analyst role",
  ],
  "Revenue Generation": [
    "Student venture reached its first paying customers",
    "Analytics engagement for a local retailer",
    "Campus pop-up store with sustainable products",
  ],
  Project: [
    "Accessible timetable app for visually impaired students",
    "IoT library seat-availability finder",
    "Hostel energy-usage dashboard",
  ],
  Other: [
    "Inter-university debate finalist",
    "Lead volunteer, community literacy drive",
    "Hackathon finalist with a civic-tech prototype",
  ],
};

const REMARKS = [
  "Rigorous method and clear documentation.",
  "Strong real-world impact, well evidenced.",
  "Original idea executed with care.",
  "Commended for teamwork and initiative.",
  "Thoughtful design with measurable results.",
];

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Varies the number of achievers by period so every layout can be seen. */
export function demoCount(mode: PeriodType, periodStart: string, today: string): number {
  const k = mode === "day" ? Math.abs(diffDays(periodStart, today)) : Math.abs(diffDays(periodStart, weekStart(today)) / 7);
  return mode === "day" ? [3, 5, 20, 0, 1, 2, 4][k % 7] : [5, 12, 3, 8][k % 4];
}

export function demoAchievers(mode: PeriodType, periodStart: string, today: string): PublicAchiever[] {
  const n = demoCount(mode, periodStart, today);
  const seed = Math.abs(diffDays(periodStart, "2026-01-01")) * 11 + (mode === "week" ? 5 : 0);
  const out: PublicAchiever[] = [];
  for (let i = 0; i < n; i++) {
    const name = NAMES[mod(seed + i * 7, NAMES.length)];
    const category = CATS[mod(seed + i * 3, CATS.length)];
    const titles = TITLES[category];
    out.push({
      id: `demo-${mode}-${periodStart}-${i + 1}`,
      rank: i + 1,
      displayName: name,
      initials: initialsOf(name),
      title: titles[mod(seed + i, titles.length)],
      category,
      publicRemark: REMARKS[mod(seed + i * 2, REMARKS.length)],
      periodType: mode,
      periodStart,
      isDemo: true,
    });
  }
  return out;
}

export function demoRecent(today: string): PublicAchiever[] {
  const out: PublicAchiever[] = [];
  for (let k = 0; out.length < 5 && k < 30; k++) {
    const d = addDays(today, -k);
    const first = demoAchievers("day", d, today)[0];
    if (first) out.push(first);
  }
  return out;
}

export function demoByCategory(category: Category, today: string, limit: number): PublicAchiever[] {
  const out: PublicAchiever[] = [];
  for (let k = 0; out.length < limit && k < 30; k++) {
    for (const a of demoAchievers("day", addDays(today, -k), today)) {
      if (a.category === category && out.length < limit && !out.some((o) => o.title === a.title)) out.push(a);
    }
  }
  return out;
}
