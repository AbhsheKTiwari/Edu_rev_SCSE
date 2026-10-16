import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { FlashFromParams } from "@/components/ui/status";
import { SubmitButton } from "@/components/ui/submit-button";
import { revokeInvitation, setFacultyAccess } from "@/lib/actions/admin";
import { firstParam, rowsOf, type Profile, type SearchParams } from "@/lib/types";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Faculty & invitations" };

interface InvitationRow {
  id: string;
  email: string | null;
  email_domain: string | null;
  expires_at: string;
  max_uses: number;
  use_count: number;
  note: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default async function AdminFaculty({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("admin");
  const admin = createAdminClient();

  const [{ data: facData }, { data: invData }, { data: aData }, { data: eData }] = await Promise.all([
    supabase.from("profiles").select("id, email, role, access_status, full_name, vid, onboarded_at").eq("role", "faculty").order("email"),
    // Explicit column list: the code_hash column is NEVER selected or sent to the browser.
    admin
      .from("access_invitations")
      .select("id, email, email_domain, expires_at, max_uses, use_count, note, revoked_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("evaluation_assignments").select("faculty_id"),
    supabase.from("evaluations").select("evaluator_id, status"),
  ]);
  const faculty = rowsOf<Profile>(facData);
  const invites = rowsOf<InvitationRow>(invData);
  const assignedCount = new Map<string, number>();
  rowsOf<{ faculty_id: string }>(aData).forEach((a) => assignedCount.set(a.faculty_id, (assignedCount.get(a.faculty_id) ?? 0) + 1));
  const doneCount = new Map<string, number>();
  rowsOf<{ evaluator_id: string; status: string }>(eData).forEach((e) => {
    if (e.status === "submitted") doneCount.set(e.evaluator_id, (doneCount.get(e.evaluator_id) ?? 0) + 1);
  });
  const now = Date.now();

  const inviteStatus = (i: InvitationRow) =>
    i.revoked_at ? ["Revoked", "badge-danger"] : Date.parse(i.expires_at) <= now ? ["Expired", "badge-neutral"] : i.use_count >= i.max_uses ? ["Used", "badge-ok"] : ["Active", "badge-info"];

  return (
    <>
      <div>
        <span className="eyebrow">Administrator</span>
        <h1 className="page-title">Faculty &amp; invitations</h1>
      </div>
      <FlashFromParams notice={firstParam(sp.notice)} error={firstParam(sp.error)} />

      <div className="panel">
        <h2>Generate an invitation</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Only administrators can invite faculty. The code is shown once — copy it and send it to the faculty member privately. Only a
          secure hash is stored.
        </p>
        <InviteForm />
      </div>

      <div className="panel">
        <h2>Faculty accounts</h2>
        {faculty.length === 0 ? (
          <p className="muted">No faculty yet. Generate an invitation above.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Faculty</th>
                  <th scope="col">Access</th>
                  <th scope="col">Reviews completed</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.full_name ?? "—"}
                      <div className="small muted">{f.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${f.access_status === "active" ? "badge-ok" : "badge-danger"}`}>{f.access_status}</span>
                    </td>
                    <td>
                      {doneCount.get(f.id) ?? 0} / {assignedCount.get(f.id) ?? 0}
                    </td>
                    <td>
                      <form action={setFacultyAccess}>
                        <input type="hidden" name="facultyId" value={f.id} />
                        {f.access_status === "active" ? (
                          <>
                            <input type="hidden" name="action" value="revoke" />
                            <SubmitButton size="sm" variant="danger" confirmMessage={`Revoke faculty access for ${f.email}?`}>
                              Revoke access
                            </SubmitButton>
                          </>
                        ) : (
                          <>
                            <input type="hidden" name="action" value="restore" />
                            <SubmitButton size="sm" variant="ghost">
                              Restore access
                            </SubmitButton>
                          </>
                        )}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Invitations</h2>
        {invites.length === 0 ? (
          <p className="muted">No invitations yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Bound to</th>
                  <th scope="col">Uses</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Status</th>
                  <th scope="col">Note</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => {
                  const [label, tone] = inviteStatus(i);
                  return (
                    <tr key={i.id}>
                      <td>{i.email ?? (i.email_domain ? `@${i.email_domain}` : "Any verified email")}</td>
                      <td>
                        {i.use_count}/{i.max_uses}
                      </td>
                      <td>{fmtDateTime(i.expires_at)}</td>
                      <td>
                        <span className={`badge ${tone}`}>{label}</span>
                      </td>
                      <td>{i.note ?? "—"}</td>
                      <td>
                        {label === "Active" && (
                          <form action={revokeInvitation}>
                            <input type="hidden" name="invitationId" value={i.id} />
                            <SubmitButton size="sm" variant="danger" confirmMessage="Revoke this invitation? It can no longer be used.">
                              Revoke
                            </SubmitButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
