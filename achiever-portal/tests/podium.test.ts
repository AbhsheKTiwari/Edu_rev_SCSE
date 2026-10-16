import { describe, expect, it } from "vitest";
import { arrangePodium, initialsOf, ordinal } from "@/lib/podium";

const make = (n: number) => Array.from({ length: n }, (_, i) => ({ rank: i + 1, id: `a${i + 1}` }));

describe("arrangePodium", () => {
  it("handles zero achievers", () => {
    expect(arrangePodium([])).toEqual({ podium: [], rest: [] });
  });

  it("one achiever stands alone in the centre", () => {
    expect(arrangePodium(make(1)).podium.map((a) => a.rank)).toEqual([1]);
  });

  it("two achievers: rank 2 left, rank 1 right/centre", () => {
    expect(arrangePodium(make(2)).podium.map((a) => a.rank)).toEqual([2, 1]);
  });

  it("exactly three: rank 2 left, rank 1 centre, rank 3 right", () => {
    const { podium, rest } = arrangePodium(make(3));
    expect(podium.map((a) => a.rank)).toEqual([2, 1, 3]);
    expect(rest).toEqual([]);
  });

  it("five: podium keeps hierarchy, ranks 4–5 go to the gallery", () => {
    const { podium, rest } = arrangePodium(make(5));
    expect(podium.map((a) => a.rank)).toEqual([2, 1, 3]);
    expect(rest.map((a) => a.rank)).toEqual([4, 5]);
  });

  it("twenty and more never squeeze into the podium", () => {
    for (const n of [20, 57]) {
      const { podium, rest } = arrangePodium(make(n));
      expect(podium).toHaveLength(3);
      expect(rest).toHaveLength(n - 3);
      expect(rest[0].rank).toBe(4);
    }
  });

  it("sorts unsorted input by rank", () => {
    const shuffled = [{ rank: 3 }, { rank: 1 }, { rank: 4 }, { rank: 2 }];
    const { podium, rest } = arrangePodium(shuffled);
    expect(podium.map((a) => a.rank)).toEqual([2, 1, 3]);
    expect(rest.map((a) => a.rank)).toEqual([4]);
  });
});

describe("ordinal & initials", () => {
  it("formats ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
  });
  it("builds initials", () => {
    expect(initialsOf("Aanya Kapoor")).toBe("AK");
    expect(initialsOf("  meera  ")).toBe("M");
    expect(initialsOf("")).toBe("?");
  });
});
