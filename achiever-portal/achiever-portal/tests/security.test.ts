import { describe, expect, it } from "vitest";
import { generateInviteCode, hashInviteCode, hashesEqual, normalizeInviteCode } from "@/lib/invitations";
import { contentMatchesExtension, detectMime, sanitizeFileName, validateFileMeta } from "@/lib/files";
import { csvCell, toCsv } from "@/lib/csv";
import { conflictWarnings } from "@/lib/conflicts";

const SECRET = "x".repeat(64);

describe("invitation codes", () => {
  it("are long, random and formatted", () => {
    const a = generateInviteCode();
    const b = generateInviteCode();
    expect(a).not.toBe(b);
    expect(normalizeInviteCode(a)).toHaveLength(24);
    expect(a).toMatch(/^([A-Z2-9]{4}-){5}[A-Z2-9]{4}$/);
  });

  it("hash is stable for formatting differences but differs per code and secret", () => {
    const code = "ABCD-EFGH-JKLM-NPQR-STUV-WXYZ";
    const h = hashInviteCode(code, SECRET);
    expect(h).toHaveLength(64);
    expect(hashInviteCode("abcd efgh jklm npqr stuv wxyz", SECRET)).toBe(h);
    expect(hashInviteCode(code, "y".repeat(64))).not.toBe(h);
    expect(hashesEqual(h, hashInviteCode(code, SECRET))).toBe(true);
    expect(h).not.toContain("ABCD"); // the code itself is never stored
  });

  it("refuses a weak secret", () => {
    expect(() => hashInviteCode("ABCD", "short")).toThrow();
  });
});

describe("file restrictions", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);

  it("detects real content types from magic bytes", () => {
    expect(detectMime(pdf)).toBe("application/pdf");
    expect(detectMime(png)).toBe("image/png");
    expect(detectMime(exe)).toBeNull();
  });

  it("rejects renamed files (e.g. an .exe renamed to .pdf)", () => {
    expect(contentMatchesExtension("report.pdf", pdf)).toBe(true);
    expect(contentMatchesExtension("report.pdf", exe)).toBe(false);
    expect(contentMatchesExtension("photo.png", pdf)).toBe(false);
    expect(contentMatchesExtension("slides.pptx", zip)).toBe(true);
  });

  it("enforces extension allow-list and size", () => {
    expect(validateFileMeta("a.pdf", 1000, 10 * 1048576)).toBeNull();
    expect(validateFileMeta("a.exe", 1000, 10 * 1048576)).toMatch(/not an allowed type/);
    expect(validateFileMeta("a.svg", 1000, 10 * 1048576)).toMatch(/not an allowed type/); // SVG can carry scripts
    expect(validateFileMeta("a.pdf", 11 * 1048576, 10 * 1048576)).toMatch(/larger than/);
    expect(validateFileMeta("a.pdf", 0, 10 * 1048576)).toMatch(/empty/);
  });

  it("sanitises file names", () => {
    expect(sanitizeFileName("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFileName('a<b>"c".pdf')).toBe("a_b_c_.pdf");
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formula injection", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell("+91 98765")).toBe("'+91 98765");
    expect(csvCell("normal")).toBe("normal");
    expect(toCsv([{ a: "x,y" }], [{ key: "a", header: "A" }])).toBe('A\r\n"x,y"\r\n');
  });
});

describe("conflict of interest hints", () => {
  it("flags reviewers who are the student or a team member", () => {
    const w = conflictWarnings(
      { studentEmail: "s@uni.edu", studentName: "Riya Saxena", teamMembers: ["Manav Arora"] },
      [
        { id: "1", email: "S@uni.edu", full_name: null },
        { id: "2", email: "m@uni.edu", full_name: "Manav  Arora" },
        { id: "3", email: "ok@uni.edu", full_name: "Dr. Someone" },
      ],
    );
    expect(w).toHaveLength(2);
  });
});
