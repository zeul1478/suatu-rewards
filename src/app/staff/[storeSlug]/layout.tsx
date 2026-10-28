import { getStoreOr404 } from "@/server/stores/getStore";

// Staff screen: light theme for bright shops (spec §9), tablet first.
export default async function StaffLayout({ children, params }: LayoutProps<"/staff/[storeSlug]">) {
  const { storeSlug } = await params;
  await getStoreOr404(storeSlug);
  return (
    <div data-theme="light" className="min-h-dvh bg-page text-ink">
      {children}
    </div>
  );
}
