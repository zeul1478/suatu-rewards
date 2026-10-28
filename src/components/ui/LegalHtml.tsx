/** Renders a legal document converted from the repository's own Markdown (trusted content). */
export function LegalHtml({ html }: { html: string }) {
  return <div className="legal-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
