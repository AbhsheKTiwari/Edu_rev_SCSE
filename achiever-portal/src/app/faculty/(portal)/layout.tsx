import { PortalShell } from "@/components/portal-shell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("faculty");
  return (
    <PortalShell
      roleLabel="Faculty portal"
      userLabel={profile.full_name ?? profile.email}
      items={[
        { href: "/faculty/dashboard", label: "My evaluations" },
        { href: "/", label: "Public homepage" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
