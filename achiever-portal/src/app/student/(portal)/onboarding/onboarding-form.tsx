"use client";

import { useActionState } from "react";
import { saveOnboarding, type FormState } from "@/lib/actions/student";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: FormState = { ok: false, message: null, errors: {} };

export function OnboardingForm({ fullName, vid, vidLocked }: { fullName: string; vid: string; vidLocked: boolean }) {
  const [state, action] = useActionState(saveOnboarding, initial);
  return (
    <form action={action} className="form" noValidate>
      {state.message && (
        <div className="alert alert-error" role="alert">
          {state.message}
        </div>
      )}
      <div className="field">
        <label htmlFor="fullName">Full name (as in university records)</label>
        <input
          id="fullName"
          name="fullName"
          className="input"
          defaultValue={fullName}
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          aria-invalid={state.errors.fullName ? true : undefined}
          aria-describedby={state.errors.fullName ? "fullName-err" : undefined}
        />
        {state.errors.fullName && (
          <span id="fullName-err" className="error">
            {state.errors.fullName}
          </span>
        )}
      </div>
      <div className="field">
        <label htmlFor="vid">University VID</label>
        <input
          id="vid"
          name="vid"
          className="input"
          defaultValue={vid}
          required
          readOnly={vidLocked}
          pattern="[A-Za-z0-9-]{4,20}"
          maxLength={20}
          style={{ textTransform: "uppercase" }}
          aria-invalid={state.errors.vid ? true : undefined}
          aria-describedby="vid-hint"
        />
        <span id="vid-hint" className={state.errors.vid ? "error" : "hint"}>
          {state.errors.vid ?? (vidLocked ? "Locked. Contact the administrator to correct it." : "4–20 letters, digits or hyphens.")}
        </span>
      </div>
      <SubmitButton pendingText="Saving…">Save and continue</SubmitButton>
    </form>
  );
}
