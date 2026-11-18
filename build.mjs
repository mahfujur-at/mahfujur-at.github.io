// Builds the site into ./dist and injects the Firebase web API key.
// The key is read from the environment (GitHub Actions secret) or from
// .env.local (local testing). It is NEVER stored in the repository.
// Usage:  node build.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT = path.join(ROOT, "dist");
const PLACEHOLDER = "__FIREBASE_API_KEY__";
const SKIP = new Set([".git", ".github", "node_modules", "dist", "build.mjs", ".gitignore", ".env.example", "README.md"]);

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvFile(path.join(ROOT, ".env.local")), ...process.env };
const key = (env.FIREBASE_API_KEY || "").trim();

if (!/^AIza[0-9A-Za-z_-]{35}$/.test(key)) {
  console.error("\nERROR: FIREBASE_API_KEY is missing or does not look like a Google API key.");
  console.error("Local: put FIREBASE_API_KEY=... in .env.local   |   GitHub: add it as a repository secret.\n");
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
let replaced = 0;

function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (SKIP.has(name) || name.startsWith(".env")) continue;
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) { copy(s, d); continue; }
    if (/\.(html|js|mjs)$/i.test(name)) {
      const text = fs.readFileSync(s, "utf8");
      if (text.includes(PLACEHOLDER)) { replaced++; fs.writeFileSync(d, text.split(PLACEHOLDER).join(key)); continue; }
    }
    fs.copyFileSync(s, d);
  }
}
copy(ROOT, OUT);

if (!replaced) { console.error("ERROR: no file contained " + PLACEHOLDER); process.exit(1); }
console.log("Built ./dist (" + replaced + " file(s) received the key). The key was not printed.");
