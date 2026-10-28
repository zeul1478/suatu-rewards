import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { cache } from "react";

/**
 * Legal documents live as Markdown in /legal (versioned in git, reviewed as text). The version
 * in each file's front matter is what consent records store (§8). The waitlist originals in the
 * same folder are kept as the base and are not served.
 */

export type LegalDocumentType = "privacy_policy" | "terms_of_use" | "program_terms";

const files: Record<LegalDocumentType, string> = {
  privacy_policy: "app-privacy-policy.md",
  terms_of_use: "app-terms-of-use.md",
  program_terms: "suatu-program-terms.md",
};

export type LegalDocument = {
  type: LegalDocumentType;
  title: string;
  version: string;
  html: string;
};

export const getLegalDocument = cache(async (type: LegalDocumentType): Promise<LegalDocument> => {
  const source = await readFile(path.join(process.cwd(), "legal", files[type]), "utf8");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source);
  if (!match) throw new Error(`Legal document ${files[type]} has no front matter`);
  const [, frontMatter = "", body = ""] = match;

  const field = (name: string) => {
    const value = new RegExp(`^${name}:\\s*(.+)$`, "m").exec(frontMatter)?.[1]?.trim();
    if (!value) throw new Error(`Legal document ${files[type]} is missing "${name}"`);
    return value;
  };

  return {
    type,
    title: field("title"),
    version: field("version"),
    // Trusted content from this repository, not user input.
    html: await marked.parse(body),
  };
});

export async function legalVersions(): Promise<Record<LegalDocumentType, string>> {
  const [privacy, terms, program] = await Promise.all([
    getLegalDocument("privacy_policy"),
    getLegalDocument("terms_of_use"),
    getLegalDocument("program_terms"),
  ]);
  return {
    privacy_policy: privacy.version,
    terms_of_use: terms.version,
    program_terms: program.version,
  };
}
