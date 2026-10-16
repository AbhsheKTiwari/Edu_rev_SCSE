import { Download, FileText } from "lucide-react";
import { formatBytes } from "@/lib/files";
import type { SubmissionFileRow } from "@/lib/types";

/** Download links go through /api/files/[id], which checks permission and issues a 60-second signed URL. */
export function FileList({ files }: { files: SubmissionFileRow[] }) {
  if (files.length === 0) return <p className="muted">No evidence files uploaded.</p>;
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {files.map((f) => (
        <li key={f.id} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <FileText size={18} aria-hidden="true" />
          <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{f.original_name}</span>
          <span className="small muted">{formatBytes(f.size_bytes)}</span>
          <a className="btn btn-ghost btn-sm" href={`/api/files/${f.id}`} rel="noopener noreferrer" target="_blank">
            <Download size={16} aria-hidden="true" /> Download
          </a>
        </li>
      ))}
    </ul>
  );
}
