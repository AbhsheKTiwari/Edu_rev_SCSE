"use client";

import { useActionState } from "react";
import { sendOtp, verifyOtp, type OtpState, type PortalKind } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: OtpState = { step: "email", email: "", message: null, error: null };

export function OtpLoginForm({ portal, emailHint }: { portal: PortalKind; emailHint?: string }) {
  const [sendState, sendAction] = useActionState(sendOtp, initial);
  const [verifyState, verifyAction] = useActionState(verifyOtp, initial);

  const onCodeStep = sendState.step === "code" && verifyState.step !== "email";
  const email = sendState.email;

  if (!onCodeStep) {
    return (
      <form action={sendAction} className="form" noValidate>
        <input type="hidden" name="portal" value={portal} />
        {sendState.error && (
          <div className="alert alert-error" role="alert">
            {sendState.error}
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            autoComplete="email"
            required
            defaultValue={sendState.email}
            aria-invalid={sendState.error ? true : undefined}
            aria-describedby="email-hint"
          />
          <span id="email-hint" className="hint">
            {emailHint ?? "We will email you a one-time sign-in code. No password needed."}
          </span>
        </div>
        <SubmitButton pendingText="Sending code…">Send sign-in code</SubmitButton>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="form" noValidate>
      <input type="hidden" name="portal" value={portal} />
      <input type="hidden" name="email" value={email} />
      {sendState.message && !verifyState.error && (
        <div className="alert alert-info" role="status">
          {sendState.message}
        </div>
      )}
      {verifyState.error && (
        <div className="alert alert-error" role="alert">
          {verifyState.error}
        </div>
      )}
      <div className="field">
        <label htmlFor="token">Sign-in code sent to {email}</label>
        <input
          id="token"
          name="token"
          className="input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={10}
          required
          autoFocus
          aria-invalid={verifyState.error ? true : undefined}
          style={{ letterSpacing: ".3em", fontSize: 20 }}
        />
      </div>
      <SubmitButton pendingText="Verifying…">Verify and sign in</SubmitButton>
      <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
        Use a different email / resend
      </button>
    </form>
  );
}
