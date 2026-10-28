import type { Metadata } from "next";
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
  await getStoreOr404(storeSlug);
  return <LegalPage document={await getLegalDocument("program_terms")} />;
}
