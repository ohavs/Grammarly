import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const outDir = resolve(webRoot, "public", "dict");
mkdirSync(outDir, { recursive: true });

const candidates = [
  resolve(webRoot, "..", "node_modules", "dictionary-en"),
  resolve(webRoot, "node_modules", "dictionary-en"),
];
const src = candidates.find((p) => existsSync(resolve(p, "index.aff")));
if (!src) {
  console.error("dictionary-en not found in node_modules");
  process.exit(1);
}

copyFileSync(resolve(src, "index.aff"), resolve(outDir, "index.aff"));
copyFileSync(resolve(src, "index.dic"), resolve(outDir, "index.dic"));
console.log("Copied dictionary-en to public/dict");
