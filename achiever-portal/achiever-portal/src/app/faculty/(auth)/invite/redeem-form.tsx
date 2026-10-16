"use client";

import { useActionState } from "react";
import { redeemInvite, type RedeemState } from "@/lib/actions/faculty";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: RedeemState = { ok: false, message: null };

export function RedeemForm() {
  const [state, action] = useActionState(redeemInvite, initial);
  return (
    <form action={action} className="form" noValidate>
      {state.message && (
        <div className={`alert ${state.ok ? "alert-ok" : "alert-error"}`} role="alert">
          {state.message}
        </div>
      )}
      <div className="field">
        <label htmlFor="code">Invitation code</label>
        <input
          id="code"
          name="code"
          className="input"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          style={{ textTransform: "uppercase", letterSpacing: ".08em" }}
        />
        <span className="hint">Codes expire and can only be used a limited number of times.</span>
      </div>
      <SubmitButton pendingText="Checking…">Redeem invitation</SubmitButton>
    </form>
  );
}
