import fs from "node:fs";
import path from "node:path";

// Regex literals like /[^\\s@]+\\.x/ match a literal backslash instead of whitespace/dot.
// This double-escaping silently broke billing email validation once; keep it out.
const literal = /\/(?:[^/\n\\]|\\.)+\/[dgimsuy]*/g;
const doubled = /\\\\[sdwSDW.]/;
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) inspect(full);
  }
}

function inspect(file) {
  fs.readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    for (const match of line.matchAll(literal)) {
      if (doubled.test(match[0])) failures.push(`${path.relative(process.cwd(), file)}:${index + 1}: ${match[0]}`);
    }
  });
}

walk(path.resolve("src"));
if (failures.length) {
  console.error("Double-escaped regex literals (\\\\s, \\\\d, \\\\w, \\\\.) match a literal backslash:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Regex escaping guard passed.");
