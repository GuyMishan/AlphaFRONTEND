import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const allowed = new Set([
  path.normalize("src/components/ui-controls.tsx"),
]);

const rawControlPattern = /<(input|select|textarea)\b/g;
const rawChoiceCardPattern = /choice-card/g;
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || !full.endsWith(".tsx")) continue;

    const rel = path.normalize(path.relative(process.cwd(), full));
    if (allowed.has(rel)) continue;

    const content = fs.readFileSync(full, "utf8");
    const rawControls = [...content.matchAll(rawControlPattern)];
    if (rawControls.length) {
      failures.push(`${rel}: use UiInput/UiSelect/UiTextarea instead of raw HTML controls (${rawControls.length} found)`);
    }

    if (rawChoiceCardPattern.test(content)) {
      failures.push(`${rel}: use UiChoiceCard instead of direct choice-card markup`);
    }
    rawChoiceCardPattern.lastIndex = 0;
  }
}

walk(root);

if (failures.length) {
  console.error("UI primitive guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI primitive guard passed.");
