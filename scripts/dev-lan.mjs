// `pnpm dev:lan` — runs the dev server on all network interfaces so a phone on
// the same Wi-Fi can open it, and prints the address to type on the phone.
import { spawn } from "node:child_process";
import { lanAddresses } from "./lan-addresses.mjs";

const port = process.env.PORT ?? "3000";
const addresses = lanAddresses();

console.log("\n  Suatu Rewards — open on your phone (same Wi-Fi):");
if (addresses.length === 0) {
  console.log("  No Wi-Fi address found. Is the laptop connected to Wi-Fi?\n");
} else {
  for (const address of addresses) console.log(`  → http://${address}:${port}`);
  console.log("");
}

const child = spawn("next", ["dev", "--hostname", "0.0.0.0", "--port", port], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
