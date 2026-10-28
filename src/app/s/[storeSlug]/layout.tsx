import { getStoreOr404 } from "@/server/stores/getStore";

// Customer app: dark green by default (spec §9). Following the phone's light mode comes in M4.
export default async function CustomerLayout({ children, params }: LayoutProps<"/s/[storeSlug]">) {
  const { storeSlug } = await params;
  await getStoreOr404(storeSlug);
  return (
    <div data-theme="dark" className="min-h-dvh bg-page text-ink">
      {children}
    </div>
  );
}
