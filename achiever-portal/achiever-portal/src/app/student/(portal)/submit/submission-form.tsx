"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSubmission, type CreateSubmissionState } from "@/lib/actions/student";
import { uploadEvidence } from "@/components/evidence-uploader";
import { ACCEPT_ATTR, MAX_FILES_PER_SUBMISSION, validateFileMeta } from "@/lib/files";
import { CATEGORIES } from "@/lib/types";
import { submissionSchema, fieldErrors } from "@/lib/validation";

interface Props {
  studentName: string;
  studentVid: string;
  today: string;
  maxUploadMb: number;
}

export function SubmissionForm({ studentName, studentVid, today, maxUploadMb }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const files = (fd.getAll("evidence") as File[]).filter((f) => f && f.size > 0);
    fd.delete("evidence"); // files go directly to storage, not through the server action

    // 1. Instant client-side validation (the server validates again).
    const parsed = submissionSchema(today).safeParse({
      title: fd.get("title"),
      description: fd.get("description"),
      category: fd.get("category"),
      teamMembers: fd.get("teamMembers") ?? "",
      submissionDate: fd.get("submissionDate"),
      publicSummary: fd.get("publicSummary") ?? "",
      projectUrl: fd.get("projectUrl") ?? "",
      declaration: fd.get("declaration"),
    });
    const errs: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);
    if (files.length === 0) errs.evidence = "Attach at least one supporting file.";
    if (files.length > MAX_FILES_PER_SUBMISSION) errs.evidence = `Attach at most ${MAX_FILES_PER_SUBMISSION} files.`;
    for (const f of files) {
      const p = validateFileMeta(f.name, f.size, maxUploadMb * 1048576);
      if (p) errs.evidence = p;
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      setMessage("Please fix the highlighted fields.");
      form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    // 2. Create the submission record.
    setMessage(null);
    setBusy("Saving your submission…");
    const initial: CreateSubmissionState = { ok: false, message: null, errors: {}, submissionId: null, uploadPrefix: null };
    let res: CreateSubmissionState;
    try {
      res = await createSubmission(initial, fd);
    } catch {
      setBusy(null);
      setMessage("Network problem — your submission was not saved. Please try again.");
      return;
    }
    if (!res.ok || !res.submissionId) {
      setBusy(null);
      setErrors(res.errors);
      setMessage(res.message ?? "Please fix the highlighted fields.");
      return;
    }

    // 3. Upload evidence files to private storage.
    const results = await uploadEvidence(res.submissionId, files, (done, total) => setBusy(`Uploading evidence ${done}/${total}…`));
    const failed = results.filter((r) => !r.ok).length;
    const q = failed ? `?created=1&failed=${failed}` : "?created=1";
    router.push(`/student/submissions/${res.submissionId}${q}`);
  }

  const err = (k: string) =>
    errors[k] ? (
      <span id={`${k}-err`} className="error">
        {errors[k]}
      </span>
    ) : null;
  const inv = (k: string) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-err` } : {});

  return (
    <form className="form" onSubmit={onSubmit} noValidate aria-busy={busy ? true : undefined}>
      {message && (
        <div className="alert alert-error" role="alert">
          {message}
        </div>
      )}

      <div className="form-row">
        <div className="field">
          <span className="label">Student full name</span>
          <input className="input" value={studentName} readOnly aria-label="Student full name (from your profile)" />
        </div>
        <div className="field">
          <span className="label">Student VID</span>
          <input className="input" value={studentVid} readOnly aria-label="Student VID (from your profile)" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="title">Project title *</label>
        <input id="title" name="title" className="input" required minLength={5} maxLength={160} {...inv("title")} />
        {err("title")}
      </div>

      <div className="field">
        <label htmlFor="description">Project description *</label>
        <textarea id="description" name="description" className="textarea" required minLength={30} maxLength={5000} rows={6} {...inv("description")} />
        <span className="hint">What did you do, what was the outcome, and what evidence supports it?</span>
        {err("description")}
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="category">Category *</label>
          <select id="category" name="category" className="select" required defaultValue="" {...inv("category")}>
            <option value="" disabled>
              Choose a category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {err("category")}
        </div>
        <div className="field">
          <label htmlFor="submissionDate">Submission date *</label>
          <input id="submissionDate" name="submissionDate" type="date" className="input" required defaultValue={today} max={today} {...inv("submissionDate")} />
          {err("submissionDate")}
        </div>
      </div>

      <div className="field">
        <label htmlFor="teamMembers">Team members (if any)</label>
        <textarea id="teamMembers" name="teamMembers" className="textarea" rows={3} style={{ minHeight: 80 }} {...inv("teamMembers")} />
        <span className="hint">One name per line or separated by commas. Up to 10.</span>
        {err("teamMembers")}
      </div>

      <div className="field">
        <label htmlFor="publicSummary">Public summary (optional)</label>
        <textarea id="publicSummary" name="publicSummary" className="textarea" rows={3} maxLength={400} style={{ minHeight: 80 }} {...inv("publicSummary")} />
        <span className="hint">Up to 400 characters. May be used on the public page if your work is recognised.</span>
        {err("publicSummary")}
      </div>

      <div className="field">
        <label htmlFor="projectUrl">Repository or project link (optional)</label>
        <input id="projectUrl" name="projectUrl" type="url" className="input" placeholder="https://" maxLength={500} {...inv("projectUrl")} />
        {err("projectUrl")}
      </div>

      <div className="field">
        <label htmlFor="evidence">Supporting evidence *</label>
        <input id="evidence" name="evidence" type="file" className="input" multiple accept={ACCEPT_ATTR} {...inv("evidence")} />
        <span className="hint">
          PDF, PNG, JPEG, WebP, Word (.docx) or PowerPoint (.pptx). Up to {MAX_FILES_PER_SUBMISSION} files, {maxUploadMb} MB each. Files are stored
          privately.
        </span>
        {err("evidence")}
      </div>

      <label className="check">
        <input type="checkbox" name="declaration" required {...inv("declaration")} />
        <span>I declare that the information and evidence submitted are accurate and that I have the right to share them. *</span>
      </label>
      {err("declaration")}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={Boolean(busy)}>
          {busy ? "Please wait…" : "Submit project"}
        </button>
        {busy && (
          <span role="status" aria-live="polite" className="small muted">
            {busy}
          </span>
        )}
      </div>
    </form>
  );
}
