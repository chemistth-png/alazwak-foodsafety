#!/usr/bin/env node
/**
 * Validates that every procedure .docx in public/horus-procedures/
 * contains the correct company header and procedure title as listed
 * in src/data/horus-procedures.json.
 *
 * On CI (GitHub Actions), emits ::error annotations and a Markdown
 * table in the job summary that lists every mismatching field with
 * expected vs. actual values so authors can fix them quickly.
 *
 * Exits with code 1 on any mismatch.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const INDEX_REL = "src/data/horus-procedures.json";
const INDEX_PATH = resolve(ROOT, INDEX_REL);
const PUBLIC_DIR = resolve(ROOT, "public");

const EXPECTED_COMPANY = "شركة الأزواك لإنتاج وتعبئة المياه الطبيعية";
const FORBIDDEN = [
  { rx: /حورس/, name: "حورس" },
  { rx: /\bHorus\b/, name: "Horus" },
  { rx: /\bHORUS\b/, name: "HORUS" },
];

// Labels expected in the FSP header table. We use them to locate the
// "actual" value in the extracted Word text for reporting.
const HEADER_LABELS = [
  "اسم الإجراء",
  "كود الوثيقة",
  "رقم الإصدار",
  "تاريخ الاعتماد",
];

const IS_CI = process.env.GITHUB_ACTIONS === "true";
const SUMMARY_PATH = process.env.GITHUB_STEP_SUMMARY;
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function extractDocxText(docxPath) {
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

// Return the value cell that follows a label inside the FSP header
// table. Text extracted from Word runs adjacently as
// "<label> <value>" then the next label, so we cut at the next known
// label or a line break.
function extractLabelValue(text, label) {
  const idx = text.indexOf(label);
  if (idx === -1) return null;
  const rest = text.slice(idx + label.length);
  const stops = HEADER_LABELS.filter((l) => l !== label)
    .map((l) => rest.indexOf(l))
    .filter((i) => i !== -1);
  const nl = rest.indexOf("\n");
  if (nl !== -1) stops.push(nl);
  const cut = stops.length ? Math.min(...stops) : Math.min(rest.length, 400);
  return rest.slice(0, cut).trim();
}

function snippetAround(text, needle, radius = 60) {
  const i = text.indexOf(needle);
  if (i === -1) return null;
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + needle.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

function ghEscape(v) {
  return String(v)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function mdEscape(v) {
  return String(v).replace(/\|/g, "\\|").replace(/\n/g, " ⏎ ");
}

function emitAnnotation({ file, title, message }) {
  if (!IS_CI) return;
  const props = [`file=${file}`, `title=${ghEscape(title)}`].join(",");
  process.stdout.write(`::error ${props}::${ghEscape(message)}\n`);
}

const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
const results = []; // { code, title, docxRel, problems: [{field, expected, actual}] }

console.log(
  `${DIM}Validating ${index.length} procedure Word documents...${RESET}\n`,
);

for (const item of index) {
  const label = `${item.code} — ${item.title}`;
  const problems = [];

  if (!item.docx) {
    problems.push({
      field: "docx path",
      expected: "path in index",
      actual: "(missing)",
    });
    results.push({ code: item.code, title: item.title, docxRel: INDEX_REL, problems });
    continue;
  }

  const docxPath = resolve(PUBLIC_DIR, item.docx.replace(/^\//, ""));
  const docxRel = relative(ROOT, docxPath);

  if (!existsSync(docxPath)) {
    problems.push({
      field: "file",
      expected: docxRel,
      actual: "(file not found on disk)",
    });
    results.push({ code: item.code, title: item.title, docxRel, problems });
    continue;
  }

  let text;
  try {
    text = extractDocxText(docxPath);
  } catch (err) {
    problems.push({
      field: "docx read",
      expected: "readable word/document.xml",
      actual: err.message,
    });
    results.push({ code: item.code, title: item.title, docxRel, problems });
    continue;
  }

  // 1) Company header
  if (!text.includes(EXPECTED_COMPANY)) {
    const actual =
      snippetAround(text, "شركة") ??
      text.split("\n").find((l) => l.trim().length) ??
      "(not found)";
    problems.push({
      field: "ترويسة الشركة",
      expected: EXPECTED_COMPANY,
      actual,
    });
  }

  // 2) Procedure title
  const titleActual = extractLabelValue(text, "اسم الإجراء");
  if (!text.includes(item.title)) {
    problems.push({
      field: "اسم الإجراء",
      expected: item.title,
      actual: titleActual ?? "(اسم الإجراء not found)",
    });
  }

  // 3) Procedure code
  const codeActual = extractLabelValue(text, "كود الوثيقة");
  if (!text.includes(item.code)) {
    problems.push({
      field: "كود الوثيقة",
      expected: item.code,
      actual: codeActual ?? "(كود الوثيقة not found)",
    });
  }

  // 4) Forbidden tokens
  for (const { rx, name } of FORBIDDEN) {
    if (rx.test(text)) {
      problems.push({
        field: "كلمة ممنوعة",
        expected: `(no "${name}")`,
        actual: snippetAround(text, name) ?? name,
      });
    }
  }

  results.push({ code: item.code, title: item.title, docxRel, problems });
}

const failed = results.filter((r) => r.problems.length > 0);
const passed = results.length - failed.length;

// Terminal output
for (const r of results) {
  if (r.problems.length === 0) {
    console.log(`  ${GREEN}✓${RESET} ${r.code} — ${r.title}`);
  } else {
    console.error(`  ${RED}✗ ${r.code} — ${r.title}${RESET}`);
    for (const p of r.problems) {
      console.error(`      ${RED}${p.field}${RESET}`);
      console.error(`        expected: ${p.expected}`);
      console.error(`        actual:   ${p.actual}`);
    }
  }
}
console.log();

// GitHub annotations
for (const r of failed) {
  for (const p of r.problems) {
    emitAnnotation({
      file: r.docxRel,
      title: `${r.code} — ${p.field}`,
      message: `expected: ${p.expected}\nactual:   ${p.actual}`,
    });
  }
}

// Job summary
if (SUMMARY_PATH) {
  const lines = [];
  lines.push(`# FSMS procedures validation`);
  lines.push("");
  lines.push(
    `- Total: **${results.length}**  ·  Passed: **${passed}**  ·  Failed: **${failed.length}**`,
  );
  lines.push("");
  if (failed.length === 0) {
    lines.push("✅ All procedure Word documents match `horus-procedures.json`.");
  } else {
    lines.push(`## Mismatches`);
    lines.push("");
    lines.push(`| Procedure | File | Field | Expected | Actual |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const r of failed) {
      for (const p of r.problems) {
        lines.push(
          `| ${mdEscape(r.code)} — ${mdEscape(r.title)} | \`${mdEscape(
            r.docxRel,
          )}\` | ${mdEscape(p.field)} | ${mdEscape(p.expected)} | ${mdEscape(
            p.actual,
          )} |`,
        );
      }
    }
  }
  appendFileSync(SUMMARY_PATH, lines.join("\n") + "\n");
}

if (failed.length) {
  console.error(
    `${RED}✗ ${failed.length} of ${results.length} procedure(s) failed validation${RESET}`,
  );
  process.exit(1);
}
console.log(
  `${GREEN}✓ All ${results.length} procedures match horus-procedures.json${RESET}`,
);
