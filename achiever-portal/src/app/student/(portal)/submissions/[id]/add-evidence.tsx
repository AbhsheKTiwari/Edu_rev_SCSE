"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadEvidence } from "@/components/evidence-uploader";
import { ACCEPT_ATTR, validateFileMeta } from "@/lib/files";

export function AddEvidence({ submissionId, maxUploadMb, remaining }: { submissionId: string; maxUploadMb: number; remaining: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("more") as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const problems = files.map((f) => validateFileMeta(f.name, f.size, maxUploadMb * 1048576)).filter((p): p is string => Boolean(p));
    if (!files.length) return setMsgs(["Choose at least one file."]);
    if (files.length > remaining) return setMsgs([`You can add ${remaining} more file(s).`]);
    if (problems.length) return setMsgs(problems);
    setMsgs([]);
    setBusy("Uploading…");
    const res = await uploadEvidence(submissionId, files, (d, t) => setBusy(`Uploading ${d}/${t}…`));
    setBusy(null);
    setMsgs(res.filter((r) => !r.ok).map((r) => r.error ?? `Could not upload ${r.name}`));
    input.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form" style={{ marginTop: 16 }}>
      <div className="field">
        <label htmlFor="more">Add evidence</label>
        <input id="more" name="more" type="file" multiple accept={ACCEPT_ATTR} className="input" />
      </div>
      {msgs.map((m) => (
        <div key={m} className="alert alert-error" role="alert">
          {m}
        </div>
      ))}
      <div>
        <button className="btn btn-outline" type="submit" disabled={Boolean(busy)}>
          {busy ?? "Upload files"}
        </button>
      </div>
    </form>
  );
}
