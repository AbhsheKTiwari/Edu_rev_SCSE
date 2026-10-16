"use client";

import { useActionState } from "react";
import { saveEvaluation, type EvalState } from "@/lib/actions/faculty";
import { SubmitButton } from "@/components/ui/submit-button";
import { RUBRIC_CRITERIA } from "@/lib/validation";
import type { EvaluationRow } from "@/lib/types";

const initial: EvalState = { ok: false, message: null, errors: {} };

export function EvaluationForm({
  submissionId,
  rubricEnabled,
  existing,
}: {
  submissionId: string;
  rubricEnabled: boolean;
  existing: EvaluationRow | null;
}) {
  const [state, action] = useActionState(saveEvaluation, initial);
  const e = state.errors;

  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="submissionId" value={submissionId} />
      {state.message && (
        <div className={`alert ${state.ok ? "alert-ok" : "alert-error"}`} role={state.ok ? "status" : "alert"}>
          {state.message}
        </div>
      )}

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={e.recommendation ? "rec-err" : undefined}>
        <legend className="label" style={{ marginBottom: 8 }}>
          Recommendation (required to submit)
        </legend>
        <div style={{ display: "flex", gap: 20 }}>
          <label className="check">
            <input type="radio" name="recommendation" value="yes" defaultChecked={existing?.recommendation === "yes"} /> Yes — recommend
          </label>
          <label className="check">
            <input type="radio" name="recommendation" value="no" defaultChecked={existing?.recommendation === "no"} /> No
          </label>
        </div>
        {e.recommendation && (
          <span id="rec-err" className="error">
            {e.recommendation}
          </span>
        )}
      </fieldset>

      <div className="field" style={{ maxWidth: 220 }}>
        <label htmlFor="score">Overall score (0–100, optional)</label>
        <input id="score" name="score" type="number" min={0} max={100} step="0.5" className="input" defaultValue={existing?.score ?? ""} aria-invalid={e.score ? true : undefined} />
        {e.score && <span className="error">{e.score}</span>}
      </div>

      {rubricEnabled && (
        <fieldset style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
          <legend className="label" style={{ padding: "0 6px" }}>
            Rubric (0–10 each, optional)
          </legend>
          <div className="form-row">
            {RUBRIC_CRITERIA.map((c) => (
              <div key={c.key} className="field">
                <label htmlFor={c.key}>{c.label}</label>
                <input
                  id={c.key}
                  name={c.key}
                  type="number"
                  min={0}
                  max={10}
                  step="0.5"
                  className="input"
                  defaultValue={existing?.criteria_scores?.[c.key] ?? ""}
                  aria-invalid={e[c.key] ? true : undefined}
                />
                {e[c.key] && <span className="error">{e[c.key]}</span>}
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <div className="field">
        <label htmlFor="privateRemarks">Private remarks</label>
        <textarea id="privateRemarks" name="privateRemarks" className="textarea" maxLength={4000} defaultValue={existing?.private_remarks ?? ""} />
        <span className="hint">Visible only to you and the administrator. Never shown to students or the public.</span>
      </div>

      <label className="check">
        <input type="checkbox" name="confirmFinal" aria-invalid={e.confirmFinal ? true : undefined} />
        <span>I confirm this evaluation is final. I understand it will be locked after submission.</span>
      </label>
      {e.confirmFinal && <span className="error">{e.confirmFinal}</span>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <SubmitButton name="intent" value="draft" variant="ghost" pendingText="Saving…">
          Save draft
        </SubmitButton>
        <SubmitButton
          name="intent"
          value="submit"
          pendingText="Submitting…"
          confirmMessage="Submit this evaluation as final? It cannot be changed afterwards without the administrator reopening it."
        >
          Submit final evaluation
        </SubmitButton>
      </div>
    </form>
  );
}
