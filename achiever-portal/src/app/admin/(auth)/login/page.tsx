import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = { title: "Administrator login", robots: { index: false } };

export default function AdminLogin() {
  return (
    <AuthPage
      portal="admin"
      title="Administrator login"
      intro="Restricted area. Administrator accounts are created only through the documented server-side bootstrap process."
    />
  );
}
