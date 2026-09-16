import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const ignored = new Set([
  path.normalize("src/components/reference-option-select.tsx"),
  path.normalize("src/components/employer-interface-option-select.tsx"),
  path.normalize("src/components/salary-layer-select.tsx"),
]);
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx|jsx)$/.test(entry.name)) inspect(full);
  }
}

function inspect(file) {
  const relative = path.normalize(path.relative(process.cwd(), file));
  if (ignored.has(relative)) return;
  const source = fs.readFileSync(file, "utf8");
  const patterns = [
    /<option\s+[^>]*value=["'](?!["'])[^"']+["'][^>]*>[^<]*<\/option>/g,
    /<option\s*>[^<{][^<]*<\/option>/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split("\n").length;
      failures.push(`${relative}:${line}: ${match[0].replace(/\s+/g, " ").slice(0, 180)}`);
    }
  }
}

walk(root);
if (failures.length) {
  console.error("Hardcoded select options are not allowed. Load selectable business values from backend reference data.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("No hardcoded select option values found.");
