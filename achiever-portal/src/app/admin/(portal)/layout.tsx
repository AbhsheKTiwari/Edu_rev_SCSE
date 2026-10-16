import { PortalShell } from "@/components/portal-shell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("admin");
  return (
    <PortalShell
      roleLabel="Administrator"
      userLabel={profile.full_name ?? profile.email}
      items={[
        { href: "/admin/dashboard", label: "Overview" },
        { href: "/admin/submissions", label: "Submissions" },
        { href: "/admin/faculty", label: "Faculty & invitations" },
        { href: "/admin/evaluations", label: "Evaluations & ranking" },
        { href: "/admin/winners", label: "Winners & publishing" },
        { href: "/admin/settings", label: "Settings" },
        { href: "/", label: "Public homepage" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
