import fs from "node:fs";
import path from "node:path";

// Theme values live in src/styles/theme only. Everything else uses semantic tokens
// (var(--color-*), --space-*, --radius-*, --shadow-*), never raw colors or palette steps.
const root = path.resolve("src");
const themeDir = path.normalize("src/styles/theme");

const rawColor = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g;
const paletteReference = /var\(--palette-/g;
// Names retired when the semantic tokens were introduced; they must not come back.
const legacyToken = /var\(--(?:muted|line|blue|blue-soft|surface|surface-soft|text|text-muted|bg|navy|navy-2|teal|danger|warning|border|primary|accent|link|shadow|brand-tile|brand-symbol|brand-text|alpha-scroll-[a-z]+)\s*[,)]/g;
const failures = [];

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

function check(rel, content, pattern, message) {
  for (const match of content.matchAll(pattern)) failures.push(`${rel}:${lineOf(content, match.index)}: ${message} (${match[0]})`);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const rel = path.normalize(path.relative(process.cwd(), full));
    if (rel.startsWith(themeDir)) continue;
    const isCss = full.endsWith(".css");
    const isComponent = full.endsWith(".tsx");
    if (!isCss && !isComponent) continue;

    // Data URIs (inline SVG icons) encode their own colors.
    const content = fs.readFileSync(full, "utf8").replace(/url\("data:[^"]*"\)/g, (uri) => " ".repeat(uri.length));
    if (isCss) check(rel, content, rawColor, "use a semantic color token instead of a raw color");
    if (isComponent) check(rel, content.replace(/\/\/.*$/gm, ""), /style=\{\{[^}]*(?:#[0-9a-fA-F]{3,8}\b|rgba?\()[^}]*\}\}/g, "inline styles must use tokens, not raw colors");
    check(rel, content, paletteReference, "palette steps are only for src/styles/theme; use a semantic token");
    check(rel, content, legacyToken, "retired token name; see docs/DESIGN-SYSTEM.md for the semantic replacement");
  }
}

walk(root);

// Every var(--name) must be defined somewhere: a theme token, a component-scoped property
// (e.g. --btn-bg) or an inline style. Undefined names silently fall back and break theming.
const definedNames = new Set(["font-heebo"]); // set by next/font on <html>
const usages = [];
(function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { collect(full); continue; }
    if (!/\.(css|tsx|ts)$/.test(entry.name)) continue;
    const content = fs.readFileSync(full, "utf8");
    for (const match of content.matchAll(/(?:^|[\s;{"'])--([a-z0-9-]+)\s*["']?\s*:/gm)) definedNames.add(match[1]);
    for (const match of content.matchAll(/var\(--([a-z0-9-]+)/g)) usages.push([path.relative(process.cwd(), full), lineOf(content, match.index), match[1]]);
  }
})(root);
for (const [rel, line, name] of usages) {
  if (!definedNames.has(name)) failures.push(`${rel}:${line}: custom property --${name} is not defined`);
}

if (failures.length) {
  console.error("Design token check failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Design token check passed.");
