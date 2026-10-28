import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/server/customers/currentCustomer";
import { exportCustomerData } from "@/server/customers/dataExport";
import { getStoreOr404 } from "@/server/stores/getStore";

/** "Download my data" (§4.4): the signed-in customer's data as a JSON file. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/s/[storeSlug]/account/export">,
) {
  const store = await getStoreOr404((await params).storeSlug);
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "signedOut" }, { status: 401 });

  const data = await exportCustomerData(customer);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${store.slug}-my-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
