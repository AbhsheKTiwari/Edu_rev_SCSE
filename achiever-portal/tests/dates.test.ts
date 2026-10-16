import { describe, expect, it } from "vitest";
import {
  addDays,
  isMonday,
  isValidISODate,
  isoToZonedLocal,
  periodHref,
  periodNavigation,
  todayISO,
  weekStart,
  zonedLocalToISO,
} from "@/lib/dates";

describe("date validation", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isValidISODate("2026-10-16")).toBe(true);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("16-10-2026")).toBe(false);
    expect(isValidISODate("2026-10-16T00:00")).toBe(false);
  });
});

describe("week handling", () => {
  it("finds the Monday of a week", () => {
    expect(weekStart("2026-10-16")).toBe("2026-10-12"); // Friday → Monday
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // Sunday belongs to the same ISO week
    expect(isMonday("2026-10-12")).toBe(true);
    expect(isMonday("2026-10-13")).toBe(false);
  });
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });
});

describe("period navigation", () => {
  const today = "2026-10-16";

  it("daily: previous exists, next is blocked on today", () => {
    const nav = periodNavigation("day", today, today);
    expect(nav).toMatchObject({ periodStart: today, prev: "2026-10-15", next: null, isCurrent: true });
  });

  it("daily: yesterday can go forward to today", () => {
    const nav = periodNavigation("day", "2026-10-15", today);
    expect(nav.next).toBe(today);
    expect(nav.isCurrent).toBe(false);
  });

  it("weekly: aligns to Monday and blocks the future week", () => {
    const nav = periodNavigation("week", "2026-10-14", today);
    expect(nav).toMatchObject({ periodStart: "2026-10-12", prev: "2026-10-05", next: null, isCurrent: true });
    const last = periodNavigation("week", "2026-10-05", today);
    expect(last.next).toBe("2026-10-12");
  });

  it("builds shareable URLs (today's daily view is the homepage)", () => {
    expect(periodHref("day", today, today)).toBe("/");
    expect(periodHref("day", "2026-10-15", today)).toBe("/achievers/day/2026-10-15");
    expect(periodHref("week", "2026-10-12", today)).toBe("/achievers/week/2026-10-12");
  });
});

describe("time zones", () => {
  it("todayISO respects Asia/Kolkata (UTC+5:30)", () => {
    // 2026-10-16 20:00 UTC is already 17 Oct 01:30 in India
    expect(todayISO("Asia/Kolkata", new Date("2026-10-16T20:00:00Z"))).toBe("2026-10-17");
    expect(todayISO("UTC", new Date("2026-10-16T20:00:00Z"))).toBe("2026-10-16");
  });
  it("converts datetime-local values typed in IST", () => {
    expect(zonedLocalToISO("2026-10-20T17:30", "Asia/Kolkata")).toBe("2026-10-20T12:00:00.000Z");
    expect(isoToZonedLocal("2026-10-20T12:00:00.000Z", "Asia/Kolkata")).toBe("2026-10-20T17:30");
    expect(zonedLocalToISO("bad", "Asia/Kolkata")).toBeNull();
  });
});
