// `pnpm dev:share` — `pnpm dev:lan` plus a temporary public link (Cloudflare quick tunnel) so a
// tester anywhere can open the app on this laptop. The link is random, changes every run, and
// stops working the moment this command stops (Ctrl+C). Dev only: the cashier login is 0000.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const port = process.env.PORT ?? "3000";
const https = existsSync("certs/dev-cert.pem");

const app = spawn("node", ["scripts/dev-lan.mjs"], {
  stdio: "inherit",
  env: { ...process.env, DEV_SHARE: "1" },
});

// The tunnel talks to the dev server on this laptop; its local certificate isn't checked.
const tunnelArgs = [
  "tunnel",
  "--no-autoupdate",
  "--url",
  `${https ? "https" : "http"}://localhost:${port}`,
];
if (https) tunnelArgs.push("--no-tls-verify");
const tunnel = spawn("cloudflared", tunnelArgs, { stdio: ["ignore", "ignore", "pipe"] });

let shown = false;
tunnel.stderr.on("data", (chunk) => {
  const link = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
  if (link && !shown) {
    shown = true;
    console.log(`\n  Public link (anyone with it can open the app): ${link}`);
    console.log("  Stop with Ctrl+C when testing is done — the link dies with it.\n");
  }
});
tunnel.on("error", () => {
  console.error("\n  cloudflared not found. Install it once with: brew install cloudflared\n");
});

const stop = () => {
  tunnel.kill();
  app.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
app.on("exit", (code) => {
  tunnel.kill();
  process.exit(code ?? 0);
});
tunnel.on("exit", () => {
  if (!shown)
    console.error("\n  The tunnel stopped before giving a link. Check the internet connection.\n");
});
