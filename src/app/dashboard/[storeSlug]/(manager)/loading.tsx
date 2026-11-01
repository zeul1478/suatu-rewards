import { PageSkeleton } from "@/components/layout";

/**
 * Shown in the page area the moment a menu section is clicked, while it renders on the server;
 * the top bar and menu stay. Also lets production prefetch the sections (prefetching guide:
 * dynamic routes are skipped without a loading boundary).
 */
export default PageSkeleton;
