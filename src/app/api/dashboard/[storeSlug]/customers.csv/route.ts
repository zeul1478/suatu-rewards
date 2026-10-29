import { customersCsv } from "@/server/dashboard/export";
import { getCurrentStaff } from "@/server/staff/session";
import { getStoreOr404 } from "@/server/stores/getStore";

/** CSV export of the store's customers (§11), masked. Managers only. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/dashboard/[storeSlug]/customers.csv">,
) {
  const { storeSlug } = await ctx.params;
  const store = await getStoreOr404(storeSlug);
  const staff = await getCurrentStaff(store.id);
  if (staff?.role !== "manager") return new Response("Not signed in", { status: 401 });

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: store.timezone }).format(new Date());
  return new Response(await customersCsv(store, staff), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${store.slug}-customers-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
