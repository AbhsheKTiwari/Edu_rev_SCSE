// File rules for evidence uploads. Pure functions: usable in browser, server and tests.

export interface AllowedType {
  ext: string[];
  mime: string;
  label: string;
}

export const ALLOWED_TYPES: AllowedType[] = [
  { ext: ["pdf"], mime: "application/pdf", label: "PDF" },
  { ext: ["png"], mime: "image/png", label: "PNG image" },
  { ext: ["jpg", "jpeg"], mime: "image/jpeg", label: "JPEG image" },
  { ext: ["webp"], mime: "image/webp", label: "WebP image" },
  { ext: ["docx"], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word document" },
  { ext: ["pptx"], mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PowerPoint" },
];

export const ACCEPT_ATTR = ALLOWED_TYPES.flatMap((t) => t.ext.map((e) => "." + e)).join(",");
export const MAX_FILES_PER_SUBMISSION = 5;

export function extensionOf(name: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(name);
  return m ? m[1].toLowerCase() : "";
}

export function typeForExtension(name: string): AllowedType | null {
  const ext = extensionOf(name);
  return ALLOWED_TYPES.find((t) => t.ext.includes(ext)) ?? null;
}

/** Identify the REAL file type from its first bytes ("magic numbers"). */
export function detectMime(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) {
    return "application/pdf"; // %PDF-
  }
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    return "application/zip"; // docx / pptx are zip containers
  }
  return null;
}

/** True when the bytes match what the file extension claims. */
export function contentMatchesExtension(name: string, bytes: Uint8Array): boolean {
  const t = typeForExtension(name);
  if (!t) return false;
  const detected = detectMime(bytes);
  if (!detected) return false;
  if (t.ext.includes("docx") || t.ext.includes("pptx")) return detected === "application/zip";
  return detected === t.mime;
}

export function validateFileMeta(name: string, size: number, maxBytes: number): string | null {
  if (!typeForExtension(name)) {
    return `"${name}" is not an allowed type. Allowed: ${ALLOWED_TYPES.map((t) => t.label).join(", ")}.`;
  }
  if (size <= 0) return `"${name}" is empty.`;
  if (size > maxBytes) return `"${name}" is larger than ${Math.round(maxBytes / 1048576)} MB.`;
  return null;
}

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 200) || "file";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
