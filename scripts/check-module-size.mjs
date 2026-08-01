import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const MAX_LINES = 300;
const roots = ["src", "server", "database"];
const extensions = new Set([".ts", ".tsx", ".mjs"]);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filePath);
    if (!extensions.has(path.extname(entry.name)) || entry.name.includes(".test.")) return [];
    return [filePath];
  }));
  return nested.flat();
}

const files = ["App.tsx", ...(await Promise.all(roots.map(sourceFiles))).flat()];
const results = await Promise.all(files.map(async (filePath) => ({
  filePath,
  lines: (await readFile(filePath, "utf8")).split(/\r?\n/).length,
})));
const oversized = results.filter(({ lines }) => lines > MAX_LINES).sort((left, right) => right.lines - left.lines);

if (oversized.length) {
  console.error(`Production modules must remain at or below ${MAX_LINES} lines:`);
  for (const { filePath, lines } of oversized) console.error(`  ${lines}  ${filePath}`);
  process.exitCode = 1;
} else {
  const largest = results.reduce((current, candidate) => candidate.lines > current.lines ? candidate : current);
  console.log(`Architecture check passed: ${results.length} modules are at or below ${MAX_LINES} lines (largest: ${largest.filePath}, ${largest.lines}).`);
}
