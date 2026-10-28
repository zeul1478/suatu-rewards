import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";
import { getLegalDocument } from "@/server/legal/documents";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getLegalDocument("terms_of_use");
  return { title: document.title };
}

export default async function Page() {
  return <LegalPage document={await getLegalDocument("terms_of_use")} />;
}
