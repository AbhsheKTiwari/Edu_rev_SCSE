import { describe, expect, it } from "vitest";
import { demoAchievers, demoCount } from "@/lib/demo-data";
import { addDays } from "@/lib/dates";

const today = "2026-10-16";

describe("demo data", () => {
  it("covers 0, 1, 2, 3, 5 and 20 achievers across recent days", () => {
    const counts = new Set(Array.from({ length: 7 }, (_, k) => demoCount("day", addDays(today, -k), today)));
    for (const n of [0, 1, 2, 3, 5, 20]) expect(counts.has(n)).toBe(true);
  });

  it("is clearly flagged as demo and has consecutive ranks", () => {
    const list = demoAchievers("day", addDays(today, -2), today);
    expect(list.length).toBe(20);
    expect(list.every((a) => a.isDemo)).toBe(true);
    expect(list.map((a) => a.rank)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("never exposes private fields", () => {
    const [a] = demoAchievers("day", today, today);
    expect(Object.keys(a).sort()).toEqual(["category", "displayName", "id", "initials", "isDemo", "periodStart", "periodType", "publicRemark", "rank", "title"]);
  });
});
