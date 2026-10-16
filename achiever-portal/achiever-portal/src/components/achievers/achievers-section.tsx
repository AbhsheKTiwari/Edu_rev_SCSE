import Link from "next/link";
import { Trophy } from "lucide-react";
import { Podium } from "@/components/achievers/podium";
import { RestGallery } from "@/components/achievers/rest-gallery";
import { PeriodNav, SwipeArea } from "@/components/achievers/period-nav";
import { arrangePodium } from "@/lib/podium";
import { formatLong, formatShort, formatWeekRange, periodHref, periodNavigation, weekStart } from "@/lib/dates";
import type { PublicAchiever } from "@/lib/types";

interface Props {
  mode: "day" | "week";
  date: string; // any date inside the period
  today: string;
  items: PublicAchiever[];
  error: string | null;
  headingLevel?: "h1" | "h2";
}

export function AchieversSection({ mode, date, today, items, error, headingLevel = "h1" }: Props) {
  const nav = periodNavigation(mode, date, today);
  const isDay = mode === "day";
  const { podium, rest } = arrangePodium(items);
  const n = items.length;

  let heading: string;
  if (isDay) {
    if (nav.isCurrent) heading = "Today's achievers";
    else if (nav.next === today) heading = "Yesterday's achievers";
    else heading = `Achievers of ${formatShort(nav.periodStart)}`;
  } else {
    const thisWeek = weekStart(today);
    if (nav.isCurrent) heading = "This week's achievers";
    else if (nav.next === thisWeek) heading = "Last week's achievers";
    else heading = `Week of ${formatShort(nav.periodStart)}`;
  }

  const periodLabel = isDay ? formatLong(nav.periodStart) : formatWeekRange(nav.periodStart);
  const countLabel = n === 0 ? "No achievers yet" : n === 1 ? "1 achiever" : `${n} achievers`;
  const H = headingLevel;

  const prevHref = periodHref(mode, nav.prev, today);
  const nextHref = nav.next ? periodHref(mode, nav.next, today) : null;
  const currentHref = nav.isCurrent ? null : isDay ? "/" : `/achievers/week/${weekStart(today)}`;
  const shareUrl = isDay ? `/achievers/day/${nav.periodStart}` : `/achievers/week/${nav.periodStart}`;

  return (
    <section id="achievers" aria-labelledby="ach-h" className="ach-section">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div className="ach-head">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="eyebrow">Celebrating Student Excellence · {isDay ? "Daily achievers" : "Weekly achievers"}</span>
            <H id="ach-h" className="ach-title">
              {heading}
            </H>
            <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 16 }}>
              {periodLabel} · {countLabel}
            </p>
          </div>
          <nav className="seg" aria-label="Recognition period">
            <Link href="/" aria-current={isDay ? "page" : undefined}>
              Daily achievers
            </Link>
            <Link href={`/achievers/week/${weekStart(today)}`} aria-current={!isDay ? "page" : undefined}>
              Weekly achievers
            </Link>
          </nav>
        </div>

        <PeriodNav
          mode={mode}
          dateValue={nav.periodStart}
          maxDate={today}
          prevHref={prevHref}
          nextHref={nextHref}
          currentHref={currentHref}
          shareUrl={shareUrl}
        />

        <SwipeArea prevHref={prevHref} nextHref={nextHref}>
          {error ? (
            <div className="alert alert-error" role="alert">
              {error} <Link href={shareUrl}>Retry</Link>
            </div>
          ) : n === 0 ? (
            <div className="empty">
              <Trophy size={40} aria-hidden="true" color="var(--ink-3)" />
              <h3>No achievements published for {isDay ? "this day" : "this week"}</h3>
              <p>Reviews may still be in progress. Results appear here once the administrator approves them.</p>
              <Link className="btn btn-outline" href={prevHref}>
                {isDay ? "Previous day" : "Previous week"}
              </Link>
            </div>
          ) : (
            <>
              <Podium items={podium} />
              <RestGallery items={rest} total={n} />
            </>
          )}
        </SwipeArea>
        <p className="small muted" style={{ margin: 0 }}>
          Tip: on touch screens, swipe left or right over the winners to move between periods.
        </p>
      </div>
    </section>
  );
}
