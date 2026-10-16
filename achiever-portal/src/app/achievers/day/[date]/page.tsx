import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { AchieversSection } from "@/components/achievers/achievers-section";
import { getPeriodAchievers, today } from "@/lib/achievements";
import { formatLong, isValidISODate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Params = Promise<{ date: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { date } = await params;
  return { title: isValidISODate(date) ? `Achievers of ${formatLong(date)}` : "Achievers" };
}

export default async function DayPage({ params }: { params: Params }) {
  const { date } = await params;
  const t = today();
  if (!isValidISODate(date)) notFound();
  if (date > t) redirect("/"); // no future dates

  const res = await getPeriodAchievers("day", date);
  return (
    <PublicShell>
      <AchieversSection mode="day" date={date} today={t} items={res.items} error={res.error} />
    </PublicShell>
  );
}
