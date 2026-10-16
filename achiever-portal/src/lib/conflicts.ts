// Simple, explainable conflict-of-interest checks shown to the admin (not automatic blocks).

export interface ConflictSubject {
  studentEmail: string;
  studentName: string;
  teamMembers: string[];
}

export interface Reviewer {
  id: string;
  email: string;
  full_name: string | null;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function conflictWarnings(subject: ConflictSubject, reviewers: Reviewer[]): string[] {
  const out: string[] = [];
  const team = subject.teamMembers.map(norm);
  for (const r of reviewers) {
    const label = r.full_name ?? r.email;
    if (r.email && norm(r.email) === norm(subject.studentEmail)) {
      out.push(`${label} uses the same email as the student.`);
    }
    if (r.full_name) {
      const n = norm(r.full_name);
      if (n === norm(subject.studentName)) out.push(`${label} has the same name as the student.`);
      if (team.includes(n)) out.push(`${label} is listed as a team member.`);
    }
  }
  return out;
}
