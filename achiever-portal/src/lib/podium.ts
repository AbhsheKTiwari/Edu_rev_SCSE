/**
 * Arrange achievers for display.
 * - Exactly three: [rank 2, rank 1, rank 3] (left, centre, right).
 * - Two: [rank 2, rank 1].  One: [rank 1].
 * - Everyone from rank 4 onward goes into `rest`, in rank order.
 * The number of achievers is never hard-coded.
 */
export function arrangePodium<T extends { rank: number }>(list: readonly T[]): { podium: T[]; rest: T[] } {
  const sorted = [...list].sort((a, b) => a.rank - b.rank);
  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  let podium: T[];
  if (top.length === 3) podium = [top[1], top[0], top[2]];
  else if (top.length === 2) podium = [top[1], top[0]];
  else podium = top;
  return { podium, rest };
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
