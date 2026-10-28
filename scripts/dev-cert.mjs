// `pnpm dev:cert` — creates an HTTPS certificate for this laptop (localhost + its Wi-Fi
// addresses) with mkcert, so phones get a secure page: needed for installing the app, the
// service worker and keeping the screen awake. After this, `pnpm dev:lan` serves HTTPS.
// One-time setup: `brew install mkcert` and `mkcert -install`.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { lanAddresses } from "./lan-addresses.mjs";

try {
  execFileSync("mkcert", ["-version"], { stdio: "ignore" });
} catch {
  console.error("mkcert isn't installed. Run: brew install mkcert && mkcert -install");
  process.exit(1);
}

mkdirSync("certs", { recursive: true });
const hosts = ["localhost", "127.0.0.1", "::1", ...lanAddresses()];
execFileSync(
  "mkcert",
  ["-cert-file", "certs/dev-cert.pem", "-key-file", "certs/dev-key.pem", ...hosts],
  { stdio: "inherit" },
);
console.log(`\nCertificate for: ${hosts.join(", ")}`);
console.log("If the laptop's Wi-Fi address changes, run `pnpm dev:cert` again.");
