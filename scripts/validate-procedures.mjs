#!/usr/bin/env node
/**
 * Validates that every procedure .docx in public/horus-procedures/
 * contains the correct company header and procedure title as listed
 * in src/data/horus-procedures.json. Exits with code 1 on mismatch.
 *
 * Usage: node scripts/validate-procedures.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const INDEX_PATH = resolve(ROOT, "src/data/horus-procedures.json");
const PUBLIC_DIR = resolve(ROOT, "public");

const EXPECTED_COMPANY = "شركة الأزواك لإنتاج وتعبئة المياه الطبيعية";
const FORBIDDEN = [/حورس/, /\bHorus\b/, /\bHORUS\b/];

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function extractDocxText(docxPath) {
  // Unzip word/document.xml to stdout, strip XML tags, decode entities
  const xml = execSync(`unzip -p "${docxPath}" word/document.xml`, {
    encoding: "utf-8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return xml
    .replace(/<w:p[ >][^]*?<\/w:p>/g, (m) => m + "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .trim();
}

const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
const errors = [];
const warnings = [];

console.log(
  `${DIM}Validating ${index.length} procedure Word documents...${RESET}\n`,
);

for (const item of index) {
  const label = `${item.code} — ${item.title}`;
  if (!item.docx) {
    warnings.push(`${item.code}: no docx path in index`);
    continue;
  }
  const docxPath = resolve(PUBLIC_DIR, item.docx.replace(/^\//, ""));
  if (!existsSync(docxPath)) {
    errors.push(`${label}\n  Missing file: ${docxPath}`);
    continue;
  }

  let text;
  try {
    text = extractDocxText(docxPath);
  } catch (err) {
    errors.push(`${label}\n  Failed to read docx: ${err.message}`);
    continue;
  }

  const problems = [];
  if (!text.includes(EXPECTED_COMPANY)) {
    problems.push(`missing company header "${EXPECTED_COMPANY}"`);
  }
  if (!text.includes(item.title)) {
    problems.push(`missing procedure title "${item.title}"`);
  }
  if (!text.includes(item.code)) {
    problems.push(`missing procedure code "${item.code}"`);
  }
  for (const rx of FORBIDDEN) {
    if (rx.test(text)) {
      problems.push(`contains forbidden token ${rx}`);
    }
  }

  if (problems.length) {
    errors.push(`${label}\n  - ${problems.join("\n  - ")}`);
  } else {
    console.log(`  ${GREEN}✓${RESET} ${label}`);
  }
}

console.log();
if (warnings.length) {
  for (const w of warnings) console.log(`${YELLOW}⚠ ${w}${RESET}`);
}
if (errors.length) {
  console.error(
    `${RED}✗ ${errors.length} procedure(s) failed validation:${RESET}\n`,
  );
  for (const e of errors) console.error(`${RED}${e}${RESET}\n`);
  process.exit(1);
}
console.log(
  `${GREEN}✓ All ${index.length} procedures match horus-procedures.json${RESET}`,
);
