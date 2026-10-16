import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { FlashFromParams } from "@/components/ui/status";
import { firstParam, rowsOf, type SearchParams } from "@/lib/types";

export const metadata: Metadata = { title: "Admin overview" };

interface AuditRow {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  actor_id: string | null;
}

export default async function AdminDashboard({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("admin");
  const admin = createAdminClient(); // used only for counts across all users, after the admin check above

  const count = async (p: PromiseLike<{ count: number | null }>) => (await p).count ?? 0;
  const [students, submissions, assignments, completed, eligible, published] = await Promise.all([
    count(admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")),
    count(supabase.from("submissions").select("id", { count: "exact", head: true })),
    count(supabase.from("evaluation_assignments").select("id", { count: "exact", head: true })),
    count(supabase.from("evaluations").select("id", { count: "exact", head: true }).eq("status", "submitted")),
    count(supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "eligible")),
    count(admin.from("achievements").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", false)),
  ]);
  const { data: auditData } = await admin
    .from("audit_logs")
    .select("id, action, entity_type, created_at, actor_id")
    .order("created_at", { ascending: false })
    .limit(15);
  const logs = rowsOf<AuditRow>(auditData);
  const pending = Math.max(0, assignments - completed);

  const stats = [
    { label: "Registered students", value: students, href: null },
    { label: "Total submissions", value: submissions, href: "/admin/submissions" },
    { label: "Pending reviews", value: pending, href: "/admin/evaluations" },
    { label: "Completed reviews", value: completed, href: "/admin/evaluations" },
    { label: "Eligible submissions", value: eligible, href: "/admin/submissions?status=eligible" },
    { label: "Published achievements", value: published, href: "/admin/winners" },
  ];

  return (
    <>
      <div>
        <span className="eyebrow">Administrator</span>
        <h1 className="page-title">Overview</h1>
      </div>
      <FlashFromParams notice={firstParam(sp.notice)} error={firstParam(sp.error)} />
      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <b>{s.value}</b>
            <span>{s.href ? <Link href={s.href}>{s.label}</Link> : s.label}</span>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Live counts from the production database (demo records excluded).
      </p>

      <div className="panel">
        <h2>Recent activity (audit log)</h2>
        {logs.length === 0 ? (
          <p className="muted">No activity recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Action</th>
                  <th scope="col">Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{fmtDateTime(l.created_at)}</td>
                    <td>
                      <code>{l.action}</code>
                    </td>
                    <td>{l.entity_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
