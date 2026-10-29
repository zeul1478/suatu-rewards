// `pnpm secrets:check` — refuses keys, passwords and private files in git (README → Keys and
// passwords). Runs on every commit for the staged files (.husky/pre-commit, `--staged`) and in
// CI for every tracked file. Real keys live only in .env.local (ignored) and in Vercel/Supabase.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Files that must never be committed, whatever they contain. */
const FORBIDDEN_FILES = [
  { pattern: /(^|\/)\.env(?!\.example$)(\.|$)/, why: "environment file with keys" },
  { pattern: /\.(pem|key|p12|pfx|jks)$/i, why: "certificate or private key file" },
  { pattern: /(^|\/)id_(rsa|ed25519|ecdsa)$/, why: "SSH private key" },
  { pattern: /(^|\/)certs\//, why: "local HTTPS certificate folder" },
];

/** Things that look like real credentials inside a file. */
const SECRET_PATTERNS = [
  { pattern: /sb_secret_[A-Za-z0-9_-]{20,}/, why: "Supabase secret key" },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, why: "private key" },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}/, why: "GitHub token" },
  { pattern: /\b(sk|rk)_live_[A-Za-z0-9]{20,}/, why: "Stripe live key" },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/, why: "AWS access key" },
  { pattern: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/, why: "Resend API key" },
  { pattern: /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, why: "SendGrid API key" },
  { pattern: /\bxox[abpr]-[A-Za-z0-9-]{20,}/, why: "Slack token" },
  {
    // A database URL with a password, pointing anywhere but this laptop.
    pattern: /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]+@(?!127\.0\.0\.1|localhost|db[:/])[^\s"'`]+/,
    why: "database URL with a password",
  },
];

/** Supabase's older JWT keys: a signed token whose role is service_role is a master key. */
function serviceRoleJwt(content) {
  for (const [token] of content.matchAll(
    /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g,
  )) {
    try {
      const payload = token.split(".")[1];
      const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (claims.role === "service_role") return true;
    } catch {
      // Not a JWT after all.
    }
  }
  return false;
}

/** Problems with one file: its name, or what it contains. Empty when it's fine. */
export function findSecrets(path, content) {
  const problems = [];
  for (const { pattern, why } of FORBIDDEN_FILES) {
    if (pattern.test(path)) problems.push(`${path}: ${why} — must not be committed`);
  }
  if (content.includes("\0")) return problems; // binary file (image, font)
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    for (const { pattern, why } of SECRET_PATTERNS) {
      if (pattern.test(line)) problems.push(`${path}:${index + 1}: looks like a ${why}`);
    }
  });
  if (serviceRoleJwt(content)) problems.push(`${path}: contains a Supabase service_role key`);
  return problems;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function main() {
  const staged = process.argv.includes("--staged");
  const files = (
    staged ? git("diff", "--cached", "--name-only", "--diff-filter=ACMR") : git("ls-files")
  )
    .split("\n")
    .filter(Boolean);

  const problems = files.flatMap((path) => {
    if (!staged && !existsSync(path)) return []; // deleted, not yet committed
    const content = staged ? git("show", `:${path}`) : readFileSync(path, "utf8");
    return findSecrets(path, content);
  });

  if (problems.length > 0) {
    console.error("\n  ✖ Possible keys or passwords — nothing was committed:\n");
    for (const problem of problems) console.error(`    ${problem}`);
    console.error(
      "\n  Keep keys in .env.local (never committed) or in Vercel/Supabase settings.\n" +
        "  If this is a false alarm, tell the team and adjust scripts/check-secrets.mjs.\n",
    );
    process.exit(1);
  }
  console.log(`✓ No keys or passwords in ${files.length} ${staged ? "staged " : ""}files`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
