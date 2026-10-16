"use client";

import { useState } from "react";
import type { PublicAchiever } from "@/lib/types";
import { ordinal } from "@/lib/podium";

const LIMIT = 8;

/** Achievers ranked 4th and below. Shows 8, then "Show all" — never squeezes 20+ into the podium. */
export function RestGallery({ items, total }: { items: PublicAchiever[]; total: number }) {
  const [showAll, setShowAll] = useState(false);
  if (items.length === 0) return null;
  const visible = showAll ? items : items.slice(0, LIMIT);
  const label =
    items.length > LIMIT && !showAll
      ? `Showing ${LIMIT} of ${items.length} more`
      : `${items.length} more achiever${items.length === 1 ? "" : "s"}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, font: "600 20px/1.3 var(--f-display)" }}>Also recognised</h3>
        <span className="small muted">{label}</span>
      </div>
      <ol className="gallery" id="rest-gallery">
        {visible.map((g) => (
          <li key={g.id} className="g-card">
            <div className="g-avatar" aria-hidden="true">
              {g.initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <span style={{ font: "700 12px/1 var(--f-body)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                {ordinal(g.rank)}
              </span>
              <span style={{ font: "600 17px/1.3 var(--f-display)" }}>{g.displayName}</span>
              <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink-2)" }}>{g.title}</span>
              <div>
                <span className="cat">{g.category}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {items.length > LIMIT && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            className="btn btn-outline"
            aria-expanded={showAll}
            aria-controls="rest-gallery"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show fewer" : `Show all ${total} achievers`}
          </button>
        </div>
      )}
    </div>
  );
}
