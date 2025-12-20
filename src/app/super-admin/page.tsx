import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createSupabaseRouteClient } from "../auth/supabaseServer";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";

function normalizeRoles(rawRoles: unknown): string[] {
  if (!rawRoles) return [];
  if (Array.isArray(rawRoles)) {
    return rawRoles
      .map((role) => (typeof role === "string" ? role.toLowerCase() : String(role || "").toLowerCase()))
      .filter(Boolean);
  }
  if (typeof rawRoles === "string") {
    return [rawRoles.toLowerCase()];
  }
  return [];
}

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/"); // Force regular auth flow before granting access
  }

  const roles = normalizeRoles((session.user as any)?.app_metadata?.roles);
  const isSuperAdmin =
    roles.includes("superadmin") ||
    Boolean((session.user as any)?.user_metadata?.isSuperAdmin) ||
    Boolean((session.user as any)?.isSuperAdmin);

  if (!isSuperAdmin) {
    notFound();
  }

  const email = session.user.email ?? "Super Admin";

  return (
    <SuperAdminDashboard accessToken={session.access_token} email={email} />
  );
}
