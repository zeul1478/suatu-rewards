import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";
import { getLegalDocument } from "@/server/legal/documents";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getLegalDocument("privacy_policy");
  return { title: document.title };
}

export default async function Page() {
  return <LegalPage document={await getLegalDocument("privacy_policy")} />;
}
