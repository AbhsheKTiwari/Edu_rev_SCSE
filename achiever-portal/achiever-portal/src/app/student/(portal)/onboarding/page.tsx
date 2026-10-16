import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "My profile" };

export default async function OnboardingPage() {
  const { profile } = await requireRole("student");
  const firstTime = !profile.vid || !profile.full_name;
  return (
    <>
      <div>
        <span className="eyebrow">{firstTime ? "One-time setup" : "Profile"}</span>
        <h1 className="page-title">{firstTime ? "Complete your student profile" : "My profile"}</h1>
      </div>
      <div className="panel" style={{ maxWidth: 640 }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Signed in as <strong>{profile.email}</strong>. Your VID and full name are attached to every submission. Your VID can
          only be set once — contact the administrator if it needs correcting.
        </p>
        <OnboardingForm fullName={profile.full_name ?? ""} vid={profile.vid ?? ""} vidLocked={Boolean(profile.vid)} />
      </div>
    </>
  );
}
