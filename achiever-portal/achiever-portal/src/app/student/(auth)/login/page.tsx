import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";
import { firstParam, type SearchParams } from "@/lib/types";

export const metadata: Metadata = { title: "Student login", robots: { index: false } };

export default async function StudentLogin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <AuthPage
      portal="student"
      title="Student login"
      intro="Sign in with your email to submit projects and track their review status. First time here? The same form creates your account."
      linkError={firstParam(sp.error) === "link"}
    />
  );
}
