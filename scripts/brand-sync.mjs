// `pnpm brand:sync` — copies the brand files the app serves from brand/ (originals, never moved
// or edited) into public/: the store's logo and icon files into public/stores/<slug>/. The
// company credit is text only ("Powered by BeHappy"), so no company logo is copied. Run after
// changing brand/.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const stores = process.argv.slice(2).length ? process.argv.slice(2) : ["suatu"];

for (const slug of stores) {
  const target = path.join("public", "stores", slug);
  rmSync(target, { recursive: true, force: true });
  for (const folder of ["svg", "png"]) {
    mkdirSync(path.join(target, folder), { recursive: true });
    cpSync(path.join("brand", slug, folder), path.join(target, folder), { recursive: true });
  }
  console.log(`brand/${slug}/{svg,png} → ${target}`);
}
