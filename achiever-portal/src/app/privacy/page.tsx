import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { institutionName, portalName } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy & terms" };

// TEMPLATE TEXT — have your institution's legal/data-protection office review before launch.
export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="wrap" style={{ maxWidth: 820, padding: "56px 16px", display: "flex", flexDirection: "column", gap: 18, lineHeight: 1.7 }}>
        <span className="eyebrow">Template — review before launch</span>
        <h1 style={{ margin: 0 }}>Privacy policy</h1>
        <p>
          {portalName} is operated by {institutionName}. It stores the information needed to review and recognise student
          achievements: your email address, full name, university VID, project submissions and supporting evidence.
        </p>
        <h2>What is public</h2>
        <p>
          Only achievements approved by the administrator are published. A published achievement shows your name (or initials),
          the achievement title, its category, rank and a short public remark. Your email address, VID, evidence files and
          faculty remarks are never shown publicly.
        </p>
        <h2>Who can see your submission</h2>
        <p>You, the faculty members assigned to review it, and the portal administrator.</p>
        <h2>Retention and your rights</h2>
        <p>[Describe retention periods, how to request correction or deletion, and the contact for data-protection queries.]</p>
        <h2 id="terms">Terms of use</h2>
        <p>
          By submitting, you declare that the information and evidence are accurate and that you have the right to share them.
          False submissions may be removed and reported to the institution.
        </p>
        <h2 id="accessibility">Accessibility</h2>
        <p>
          This portal aims to meet WCAG 2.1 AA. If something is hard to use, contact [recognition-office@example.edu].
        </p>
      </article>
    </PublicShell>
  );
}
