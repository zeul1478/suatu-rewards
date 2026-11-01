import { TabSkeleton } from "@/components/layout";

/**
 * Shown under the logo the moment a tab is tapped, while the next screen renders on the server. It also lets
 * production prefetch the tabs up to this point, so the tap answers at once (prefetching guide:
 * dynamic routes are skipped without a loading boundary).
 */
export default TabSkeleton;
