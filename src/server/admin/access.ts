import "server-only";
import { redirect } from "next/navigation";
import { getCurrentAdmin, type PlatformAdmin } from "./session";

/** Every /admin page and action starts here: no platform-admin session → the admin login. */
export async function requireAdmin(): Promise<PlatformAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
