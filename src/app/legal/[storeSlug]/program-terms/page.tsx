import type { Metadata } from "next";
import { brandFor } from "@/brands";
import { LegalPage } from "@/components/ui/LegalPage";
import { getLegalDocument } from "@/server/legal/documents";
import { getStoreOr404 } from "@/server/stores/getStore";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getLegalDocument("program_terms");
  return { title: document.title };
}

// One store today, so one program-terms file; per-store documents come with store #2.
export default async function ProgramTermsPage({
  params,
}: PageProps<"/legal/[storeSlug]/program-terms">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  return (
    <LegalPage brand={brandFor(store.slug)} document={await getLegalDocument("program_terms")} />
  );
}
