import * as XLSX from "xlsx";

/**
 * Export markdown content as a Word (.doc) file with RTL Arabic support
 */
export function exportToWord(title: string, markdownContent: string) {
  // Convert markdown to basic HTML
  const htmlContent = markdownToHtml(markdownContent);
  
  const wordDoc = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 2cm; }
  body {
    font-family: 'Simplified Arabic', 'Traditional Arabic', 'Arial', sans-serif;
    font-size: 12pt;
    line-height: 1.8;
    direction: rtl;
    text-align: right;
    color: #1a1a1a;
  }
  h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 20pt; border-bottom: 2px solid #333; padding-bottom: 10pt; }
  h2 { font-size: 14pt; font-weight: bold; margin-top: 16pt; margin-bottom: 8pt; color: #1a1a1a; border-bottom: 1px solid #ccc; padding-bottom: 4pt; }
  h3 { font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
  p { margin: 6pt 0; text-align: justify; }
  ul, ol { margin: 6pt 20pt; }
  li { margin: 3pt 0; }
  table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
  th, td { border: 1px solid #333; padding: 6pt 8pt; text-align: right; font-size: 11pt; }
  th { background-color: #e8e8e8; font-weight: bold; }
  strong { font-weight: bold; }
  .header-info { text-align: center; margin-bottom: 20pt; }
  .doc-code { font-size: 10pt; color: #666; }
</style>
</head>
<body>
<div class="header-info">
  <p class="doc-code">نظام إدارة الجودة وسلامة الغذاء</p>
</div>
<h1>${escapeHtml(title)}</h1>
${htmlContent}
</body>
</html>`;

  const blob = new Blob(["\ufeff" + wordDoc], { type: "application/msword;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFilename(title)}.doc`);
}

/**
 * Export markdown content as an Excel (.xlsx) file with tables extracted
 */
export function exportToExcel(title: string, markdownContent: string) {
  const wb = XLSX.utils.book_new();
  
  // Extract all markdown tables
  const tables = extractMarkdownTables(markdownContent);
  
  if (tables.length === 0) {
    // No tables found - export as single sheet with text content
    const lines = markdownContent.split("\n").filter(l => l.trim());
    const data = lines.map(line => [line.replace(/[#*_`]/g, "").trim()]);
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws, "المحتوى");
  } else {
    tables.forEach((table, idx) => {
      const ws = XLSX.utils.aoa_to_sheet(table.rows);
      // Auto-size columns
      const maxCols = Math.max(...table.rows.map(r => r.length));
      ws["!cols"] = Array.from({ length: maxCols }, () => ({ wch: 25 }));
      // RTL
      if (!ws["!sheetViews"]) ws["!sheetViews"] = [{}];
      const sheetName = table.heading || `جدول ${idx + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    });
  }

  XLSX.writeFile(wb, `${sanitizeFilename(title)}.xlsx`);
}

// ---- Helpers ----

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").substring(0, 100);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface MarkdownTable {
  heading: string;
  rows: string[][];
}

function extractMarkdownTables(markdown: string): MarkdownTable[] {
  const lines = markdown.split("\n");
  const tables: MarkdownTable[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Check if this line is a table row
    if (line.startsWith("|") && line.endsWith("|")) {
      // Find the heading above this table
      let heading = "";
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j].trim();
        if (prev.startsWith("#")) {
          heading = prev.replace(/^#+\s*/, "").trim();
          break;
        }
        if (prev && !prev.startsWith("|")) {
          heading = prev.replace(/[*_`]/g, "").trim();
          break;
        }
      }

      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        // Skip separator rows (|---|---|)
        if (!/^\|[\s\-:|]+\|$/.test(row)) {
          const cells = row.split("|").slice(1, -1).map(c => c.trim().replace(/\*\*/g, ""));
          tableRows.push(cells);
        }
        i++;
      }

      if (tableRows.length > 0) {
        tables.push({ heading, rows: tableRows });
      }
    } else {
      i++;
    }
  }

  return tables;
}

function markdownToHtml(md: string): string {
  let html = md;
  
  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  
  // Tables
  html = html.replace(/((?:\|[^\n]+\|\n)+)/g, (match) => {
    const rows = match.trim().split("\n");
    let table = '<table>';
    rows.forEach((row, idx) => {
      if (/^\|[\s\-:|]+\|$/.test(row)) return; // skip separator
      const cells = row.split("|").slice(1, -1);
      const tag = idx === 0 ? "th" : "td";
      table += "<tr>" + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join("") + "</tr>";
    });
    table += "</table>";
    return table;
  });
  
  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  
  // Numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");
  
  // Paragraphs - lines that aren't already HTML
  html = html.replace(/^(?!<[hultdp]|<\/|<strong)(.+)$/gm, "<p>$1</p>");
  
  // Clean empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");
  
  return html;
}
