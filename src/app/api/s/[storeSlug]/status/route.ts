import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/server/customers/currentCustomer";
import { getCustomerStatus } from "@/server/customers/status";
import { redemptionCompleted } from "@/server/rewards/redemptions";
import { getStoreOr404 } from "@/server/stores/getStore";

/**
 * Live status for the customer app, polled every 3 s while the screen is visible (spec §3).
 * `?redemption=<id>` also reports whether that code has been confirmed at the counter.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/s/[storeSlug]/status">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "signedOut" }, { status: 401, headers: noStore });
  }

  const redemptionId = new URL(request.url).searchParams.get("redemption");
  const [status, redeemed] = await Promise.all([
    getCustomerStatus(store, customer),
    redemptionId ? redemptionCompleted(store, customer, redemptionId) : Promise.resolve(false),
  ]);
  return NextResponse.json({ ...status, redeemed }, { headers: noStore });
}

const noStore = { "Cache-Control": "no-store" };
