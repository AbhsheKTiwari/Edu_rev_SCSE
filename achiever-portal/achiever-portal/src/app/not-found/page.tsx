import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { NotFoundContent } from "@/components/not-found-content";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

// Explicit /not-found route (required by the specification). Unknown URLs use app/not-found.tsx.
export default function NotFoundPage() {
  return (
    <PublicShell>
      <NotFoundContent />
    </PublicShell>
  );
}
