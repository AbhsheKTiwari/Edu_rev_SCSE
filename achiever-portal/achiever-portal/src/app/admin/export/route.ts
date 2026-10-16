import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { buildSubmissionQuery, readFilters } from "@/lib/admin-queries";
import { toCsv } from "@/lib/csv";
import { logAudit } from "@/lib/audit";
import { rowsOf, type SubmissionRow } from "@/lib/types";

/** CSV export of submissions (admin only). Evidence files and faculty remarks are not included. */
export async function GET(request: NextRequest) {
  const { supabase, user, profile } = await getSession();
  if (!supabase || !user || !profile || profile.role !== "admin" || profile.access_status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const f = readFilters((k) => request.nextUrl.searchParams.get(k) ?? "");
  const { data, error } = await buildSubmissionQuery(supabase, f).limit(5000);
  if (error) return NextResponse.json({ error: "Export failed" }, { status: 500 });

  const rows = rowsOf<SubmissionRow>(data).map((r) => ({ ...r, team_members: r.team_members.join("; ") }));
  const csv = toCsv(rows, [
    { key: "reference_code", header: "Reference" },
    { key: "id", header: "Submission ID" },
    { key: "student_vid", header: "VID" },
    { key: "student_name", header: "Student name" },
    { key: "title", header: "Title" },
    { key: "category", header: "Category" },
    { key: "team_members", header: "Team members" },
    { key: "submission_date", header: "Submission date" },
    { key: "status", header: "Status" },
    { key: "eligibility_reason", header: "Eligibility reason" },
    { key: "project_url", header: "Project URL" },
    { key: "created_at", header: "Created at" },
  ]);

  await logAudit(user.id, "submissions.exported", "submission", null, { filters: f, rows: rows.length });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
