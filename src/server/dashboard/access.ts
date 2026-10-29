import "server-only";
import { redirect } from "next/navigation";
import { storeUrl } from "@/lib/storeUrl";
import { getCurrentStaff, type StaffMember } from "@/server/staff/session";
import { getStoreOr404, type Store } from "@/server/stores/getStore";

/**
 * Every owner-dashboard page and action starts here (§6): a staff session for this store with
 * the manager role. No session → the dashboard login; a cashier → the login with a notice.
 */
export async function requireManager(
  storeSlug: string,
): Promise<{ store: Store; manager: StaffMember }> {
  const store = await getStoreOr404(storeSlug);
  const staff = await getCurrentStaff(store.id);
  const login = storeUrl(store.slug, "/login", "dashboard");
  if (!staff) redirect(login);
  if (staff.role !== "manager") redirect(`${login}?reason=managersOnly`);
  return { store, manager: staff };
}
