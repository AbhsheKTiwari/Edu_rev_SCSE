import { redirect } from "next/navigation";
import { getSession, HOME_PATHS } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Sends a signed-in user to the right portal for their (server-verified) role. */
export default async function PortalRouter() {
  const { user, profile } = await getSession();
  if (!user) redirect("/student/login");
  if (!profile || profile.access_status !== "active") redirect("/unauthorized");
  redirect(HOME_PATHS[profile.role]);
}
