import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Development only: lets a phone download this laptop's mkcert certificate authority, so it
 * trusts the dev server's HTTPS. Only the public certificate is served — never its private key.
 * Production builds return 404.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  try {
    const caRoot = execFileSync("mkcert", ["-CAROOT"], { encoding: "utf8" }).trim();
    const certificate = await readFile(path.join(caRoot, "rootCA.pem"));
    return new Response(certificate, {
      headers: {
        // iOS and Android both open this type as "install a certificate".
        "Content-Type": "application/x-x509-ca-cert",
        "Content-Disposition": 'attachment; filename="suatu-dev-root.pem"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("No local certificate authority yet. Run `pnpm dev:cert` on the laptop.", {
      status: 404,
    });
  }
}
