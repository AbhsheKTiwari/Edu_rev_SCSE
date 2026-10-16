"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  mode: "day" | "week";
  dateValue: string; // for the date input
  maxDate: string;
  prevHref: string;
  nextHref: string | null;
  currentHref: string | null; // "back to today/this week" when viewing the past
  shareUrl: string;
}

export function PeriodNav({ mode, dateValue, maxDate, prevHref, nextHref, currentHref, shareUrl }: Props) {
  const router = useRouter();
  const isDay = mode === "day";

  return (
    <div className="period-nav">
      <Link className="icon-btn" href={prevHref} aria-label={isDay ? "Previous day" : "Previous week"} scroll={false}>
        <ChevronLeft size={20} aria-hidden="true" />
      </Link>
      <Link className="btn btn-ghost" href={prevHref} scroll={false}>
        {isDay ? "Previous day" : "Previous week"}
      </Link>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--ink-2)" }}>
        <span>{isDay ? "Date" : "Any day in week"}</span>
        <input
          type="date"
          value={dateValue}
          max={maxDate}
          onChange={(e) => {
            const v = e.target.value;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v > maxDate) return;
            router.push(isDay ? `/achievers/day/${v}` : `/achievers/week/${v}`, { scroll: false });
          }}
        />
      </label>
      {currentHref && (
        <Link className="btn btn-ghost" href={currentHref} scroll={false}>
          {isDay ? "Back to today" : "Back to this week"}
        </Link>
      )}
      {nextHref ? (
        <Link className="icon-btn" href={nextHref} aria-label={isDay ? "Next day" : "Next week"} scroll={false}>
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
      ) : (
        <span className="icon-btn" aria-disabled="true" aria-label={isDay ? "Next day (not available)" : "Next week (not available)"} role="img">
          <ChevronRight size={20} aria-hidden="true" />
        </span>
      )}
      <span className="share-chip">Shareable link: {shareUrl}</span>
    </div>
  );
}

/** Swipe left/right over the winners to move between periods (touch devices). */
export function SwipeArea({ prevHref, nextHref, children }: { prevHref: string; nextHref: string | null; children: React.ReactNode }) {
  const router = useRouter();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  return (
    <div
      aria-live="polite"
      style={{ display: "flex", flexDirection: "column", gap: 36, paddingTop: 12 }}
      onTouchStart={(e) => {
        startX.current = e.changedTouches[0]?.clientX ?? null;
        startY.current = e.changedTouches[0]?.clientY ?? null;
      }}
      onTouchEnd={(e) => {
        if (startX.current === null || startY.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? startX.current) - startX.current;
        const dy = (e.changedTouches[0]?.clientY ?? startY.current) - startY.current;
        startX.current = null;
        startY.current = null;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return; // ignore vertical scrolls
        if (dx > 0) router.push(prevHref, { scroll: false });
        else if (nextHref) router.push(nextHref, { scroll: false });
      }}
    >
      {children}
    </div>
  );
}
