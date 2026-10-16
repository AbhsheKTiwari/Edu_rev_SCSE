import { PublicShell } from "@/components/public-shell";
import { AchieversSection } from "@/components/achievers/achievers-section";
import { AboutHero, CategoryCards, RecentList, ResearchAndPlacements } from "@/components/home-sections";
import { getByCategory, getPeriodAchievers, getRecentAchievers, today } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = today();
  const [period, recent, research, placements] = await Promise.all([
    getPeriodAchievers("day", t),
    getRecentAchievers(5),
    getByCategory("Research", 3),
    getByCategory("Placement", 4),
  ]);

  return (
    <PublicShell>
      {/* Achiever details come first, as approved in the design review. */}
      <AchieversSection mode="day" date={t} today={t} items={period.items} error={period.error} />
      <AboutHero />
      <CategoryCards />
      <ResearchAndPlacements research={research} placements={placements} />
      <RecentList items={recent} />
    </PublicShell>
  );
}
