// `pnpm dev:lan` — runs the dev server on all network interfaces so a phone on the same Wi-Fi
// can open it, and prints the address to type on the phone. Serves HTTPS when a certificate
// from `pnpm dev:cert` exists (needed on phones for the installable app), plain HTTP otherwise.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { lanAddresses } from "./lan-addresses.mjs";

const port = process.env.PORT ?? "3000";
const addresses = lanAddresses();
const https = existsSync("certs/dev-cert.pem") && existsSync("certs/dev-key.pem");
const protocol = https ? "https" : "http";

console.log("\n  Suatu Rewards — open on your phone (same Wi-Fi):");
if (addresses.length === 0) {
  console.log("  No Wi-Fi address found. Is the laptop connected to Wi-Fi?\n");
} else {
  for (const address of addresses) console.log(`  → ${protocol}://${address}:${port}`);
  if (!https) console.log("  (plain HTTP — run `pnpm dev:cert` once for HTTPS on phones)");
  console.log("");
}

const args = ["dev", "--hostname", "0.0.0.0", "--port", port];
if (https) {
  args.push(
    "--experimental-https",
    "--experimental-https-key",
    "certs/dev-key.pem",
    "--experimental-https-cert",
    "certs/dev-cert.pem",
  );
}

const child = spawn("next", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DEV_PROTOCOL: protocol },
});
child.on("exit", (code) => process.exit(code ?? 0));
