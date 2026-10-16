import type { PublicAchiever } from "@/lib/types";
import { ordinal } from "@/lib/podium";

export function Podium({ items }: { items: PublicAchiever[] }) {
  return (
    <div className="podium">
      {items.map((p) => (
        <article key={p.id} className={`pod pod-r${p.rank}`} aria-label={`${ordinal(p.rank)} place: ${p.displayName}`}>
          <div className="pod-card">
            <span className="rank-badge">{ordinal(p.rank)} place</span>
            <div className="avatar" aria-hidden="true">
              {p.initials}
            </div>
            <div className="pod-info">
              <h3 className="pod-name">{p.displayName}</h3>
              <p className="pod-title">{p.title}</p>
              <div>
                <span className="cat">{p.category}</span>
              </div>
              {p.publicRemark && <p className="remark">“{p.publicRemark}”</p>}
            </div>
          </div>
          <div className="plinth" aria-hidden="true">
            {p.rank}
          </div>
        </article>
      ))}
    </div>
  );
}
