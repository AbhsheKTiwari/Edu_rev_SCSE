import { CircleAlert, CircleCheck, Info } from "lucide-react";

const SUBMISSION_LABELS: Record<string, { label: string; tone: string }> = {
  submitted: { label: "Submitted", tone: "badge-info" },
  under_review: { label: "Under review", tone: "badge-warn" },
  eligible: { label: "Eligible", tone: "badge-ok" },
  ineligible: { label: "Not eligible", tone: "badge-danger" },
  published: { label: "Published", tone: "badge-brand" },
  withdrawn: { label: "Withdrawn", tone: "badge-neutral" },
};

export function SubmissionStatusBadge({ status }: { status: string }) {
  const s = SUBMISSION_LABELS[status] ?? { label: status, tone: "badge-neutral" };
  return <span className={`badge ${s.tone}`}>{s.label}</span>;
}

const EVAL_LABELS: Record<string, { label: string; tone: string }> = {
  not_assigned: { label: "Not assigned", tone: "badge-neutral" },
  pending: { label: "Pending", tone: "badge-warn" },
  draft: { label: "Draft", tone: "badge-info" },
  submitted: { label: "Submitted", tone: "badge-ok" },
};

export function EvaluationStatusBadge({ status }: { status: "not_assigned" | "pending" | "draft" | "submitted" }) {
  const s = EVAL_LABELS[status];
  return <span className={`badge ${s.tone}`}>{s.label}</span>;
}

export function Notice({ kind, children }: { kind: "ok" | "error" | "info" | "warn"; children: React.ReactNode }) {
  const Icon = kind === "ok" ? CircleCheck : kind === "error" ? CircleAlert : Info;
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={20} aria-hidden="true" style={{ flex: "none", marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

/** Shows ?notice= / ?error= messages set by server actions after redirect. */
export function FlashFromParams({ notice, error }: { notice?: string; error?: string }) {
  return (
    <>
      {notice && <Notice kind="ok">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
    </>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
