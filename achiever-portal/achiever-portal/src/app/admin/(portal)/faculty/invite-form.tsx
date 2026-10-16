"use client";

import { useActionState, useState } from "react";
import { createInvitation, type InviteState } from "@/lib/actions/admin";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: InviteState = { ok: false, code: null, message: null, errors: {} };

export function InviteForm() {
  const [state, action] = useActionState(createInvitation, initial);
  const [copied, setCopied] = useState(false);
  const e = state.errors;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {state.ok && state.code && (
        <div className="alert alert-ok" role="status" style={{ flexDirection: "column" }}>
          <strong>Invitation created. Copy this code now — it will not be shown again.</strong>
          <div className="code-box" style={{ width: "100%" }}>
            {state.code}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.code ?? "");
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Copied" : "Copy code"}
          </button>
          <span className="small">The faculty member redeems it at /faculty/invite after verifying their email.</span>
        </div>
      )}
      {state.message && (
        <div className="alert alert-error" role="alert">
          {state.message}
        </div>
      )}
      <form action={action} className="form">
        <div className="form-row">
          <div className="field">
            <label htmlFor="email">Bind to email (optional)</label>
            <input id="email" name="email" type="email" className="input" aria-invalid={e.email ? true : undefined} />
            {e.email && <span className="error">{e.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="emailDomain">…or bind to domain (optional)</label>
            <input id="emailDomain" name="emailDomain" className="input" placeholder="university.edu.in" aria-invalid={e.emailDomain ? true : undefined} />
            {e.emailDomain && <span className="error">{e.emailDomain}</span>}
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="expiresInDays">Expires after (days)</label>
            <input id="expiresInDays" name="expiresInDays" type="number" min={1} max={30} defaultValue={7} className="input" required />
          </div>
          <div className="field">
            <label htmlFor="maxUses">Maximum uses</label>
            <input id="maxUses" name="maxUses" type="number" min={1} max={50} defaultValue={1} className="input" required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="note">Internal note (optional)</label>
          <input id="note" name="note" className="input" maxLength={200} placeholder="e.g. Dept. of Computer Applications" />
        </div>
        <div>
          <SubmitButton pendingText="Generating…">Generate invitation code</SubmitButton>
        </div>
      </form>
    </div>
  );
}
