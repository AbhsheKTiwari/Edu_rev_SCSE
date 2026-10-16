import { PortalShell } from "@/components/portal-shell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("student");
  return (
    <PortalShell
      roleLabel="Student portal"
      userLabel={profile.full_name ?? profile.email}
      items={[
        { href: "/student/dashboard", label: "My submissions" },
        { href: "/student/submit", label: "Submit a project" },
        { href: "/student/onboarding", label: "My profile" },
        { href: "/", label: "Public homepage" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
