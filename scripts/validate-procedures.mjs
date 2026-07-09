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
import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync } from "node:fs";
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

// ---------------------------------------------------------------------------
// Standalone HTML report (converted to PDF in CI and uploaded as an artifact)
// ---------------------------------------------------------------------------
const REPORTS_DIR = resolve(ROOT, "reports");
mkdirSync(REPORTS_DIR, { recursive: true });

function htmlEscape(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const generatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
const statusBadge =
  failed.length === 0
    ? `<span class="badge pass">✓ PASS</span>`
    : `<span class="badge fail">✗ FAIL</span>`;

const rowsHtml = failed.length
  ? failed
      .flatMap((r) =>
        r.problems.map(
          (p) => `
        <tr>
          <td class="code">${htmlEscape(r.code)}</td>
          <td>${htmlEscape(r.title)}</td>
          <td class="mono">${htmlEscape(r.docxRel)}</td>
          <td>${htmlEscape(p.field)}</td>
          <td class="expected">${htmlEscape(p.expected)}</td>
          <td class="actual">${htmlEscape(p.actual)}</td>
        </tr>`,
        ),
      )
      .join("")
  : "";

const passRowsHtml = results
  .filter((r) => r.problems.length === 0)
  .map(
    (r) => `
    <tr>
      <td class="code">${htmlEscape(r.code)}</td>
      <td>${htmlEscape(r.title)}</td>
      <td class="mono">${htmlEscape(r.docxRel)}</td>
    </tr>`,
  )
  .join("");

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>FSMS Procedures Validation Report</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Naskh Arabic", "Amiri", "DejaVu Sans", "Arial", sans-serif;
    color: #111;
    font-size: 11pt;
    line-height: 1.55;
  }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  h2 { font-size: 14pt; margin: 22px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .meta { color: #555; font-size: 10pt; margin-bottom: 12px; }
  .summary { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0 6px; }
  .card {
    border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 14px;
    min-width: 110px; text-align: center;
  }
  .card .n { font-size: 18pt; font-weight: 700; }
  .card.pass .n { color: #137333; }
  .card.fail .n { color: #b3261e; }
  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 999px;
    font-weight: 700; font-size: 10pt; vertical-align: middle; margin-inline-start: 8px;
  }
  .badge.pass { background: #e6f4ea; color: #137333; }
  .badge.fail { background: #fce8e6; color: #b3261e; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9.5pt; }
  th, td { border: 1px solid #d9d9d9; padding: 6px 8px; vertical-align: top; text-align: right; }
  th { background: #f5f5f5; font-weight: 700; }
  td.code, td.mono { font-family: "DejaVu Sans Mono", "Consolas", monospace; direction: ltr; text-align: left; white-space: nowrap; }
  td.expected { background: #f1f8f3; }
  td.actual   { background: #fdecea; }
  .empty { color: #555; font-style: italic; padding: 8px 0; }
  footer { margin-top: 20px; color: #777; font-size: 9pt; text-align: center; }
</style>
</head>
<body>
  <h1>تقرير التحقق من إجراءات نظام إدارة سلامة الغذاء ${statusBadge}</h1>
  <div class="meta">
    مقارنة نص ملفات Word مع <code>${htmlEscape(INDEX_REL)}</code> · تاريخ التوليد: ${htmlEscape(generatedAt)}
  </div>

  <div class="summary">
    <div class="card"><div class="n">${results.length}</div><div>الإجمالي</div></div>
    <div class="card pass"><div class="n">${passed}</div><div>ناجحة</div></div>
    <div class="card fail"><div class="n">${failed.length}</div><div>فاشلة</div></div>
  </div>

  <h2>الاختلافات (${failed.length})</h2>
  ${
    failed.length
      ? `<table>
      <thead><tr>
        <th>الكود</th><th>الإجراء</th><th>الملف</th>
        <th>الحقل</th><th>المتوقع</th><th>الفعلي</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`
      : `<div class="empty">✅ لا توجد اختلافات — كل ملفات Word مطابقة للفهرس.</div>`
  }

  <h2>الإجراءات الناجحة (${passed})</h2>
  ${
    passed
      ? `<table>
      <thead><tr><th>الكود</th><th>الإجراء</th><th>الملف</th></tr></thead>
      <tbody>${passRowsHtml}</tbody>
    </table>`
      : `<div class="empty">لا توجد إجراءات ناجحة.</div>`
  }

  <footer>Generated by scripts/validate-procedures.mjs</footer>
</body>
</html>`;

writeFileSync(resolve(REPORTS_DIR, "validation-report.html"), html, "utf-8");

// Also write a Markdown copy of the report (useful when the workflow
// falls back to Markdown-to-PDF or when reviewing locally).
const mdLines = [];
mdLines.push(`# FSMS procedures validation`);
mdLines.push("");
mdLines.push(`_Generated: ${generatedAt}_`);
mdLines.push("");
mdLines.push(
  `- Total: **${results.length}**  ·  Passed: **${passed}**  ·  Failed: **${failed.length}**`,
);
mdLines.push("");
if (failed.length === 0) {
  mdLines.push("✅ All procedure Word documents match `horus-procedures.json`.");
} else {
  mdLines.push(`## Mismatches`);
  mdLines.push("");
  mdLines.push(`| Procedure | File | Field | Expected | Actual |`);
  mdLines.push(`| --- | --- | --- | --- | --- |`);
  for (const r of failed) {
    for (const p of r.problems) {
      mdLines.push(
        `| ${mdEscape(r.code)} — ${mdEscape(r.title)} | \`${mdEscape(
          r.docxRel,
        )}\` | ${mdEscape(p.field)} | ${mdEscape(p.expected)} | ${mdEscape(
          p.actual,
        )} |`,
      );
    }
  }
}
writeFileSync(resolve(REPORTS_DIR, "validation-report.md"), mdLines.join("\n") + "\n", "utf-8");

console.log(
  `${DIM}Report written to ${relative(ROOT, resolve(REPORTS_DIR, "validation-report.html"))}${RESET}`,
);


if (failed.length) {
  console.error(
    `${RED}✗ ${failed.length} of ${results.length} procedure(s) failed validation${RESET}`,
  );
  process.exit(1);
}
console.log(
  `${GREEN}✓ All ${results.length} procedures match horus-procedures.json${RESET}`,
);
