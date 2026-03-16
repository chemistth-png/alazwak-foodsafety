import * as XLSX from "xlsx";

/**
 * Export markdown content as a Word (.doc) file with RTL Arabic support
 */
export function exportToWord(title: string, markdownContent: string) {
  const htmlContent = markdownToHtml(markdownContent);
  
  const wordDoc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40"
      dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { 
    size: A4; 
    margin: 2cm;
    mso-page-orientation: portrait;
  }
  body {
    font-family: 'Simplified Arabic', 'Traditional Arabic', 'Arial', 'Tahoma', sans-serif;
    font-size: 12pt;
    line-height: 2;
    direction: rtl;
    text-align: right;
    color: #1a1a1a;
    mso-bidi-font-family: 'Simplified Arabic';
    mso-fareast-font-family: 'Simplified Arabic';
  }
  h1 { 
    font-size: 20pt; 
    font-weight: bold; 
    text-align: center; 
    margin-bottom: 24pt; 
    border-bottom: 3px solid #1a5276; 
    padding-bottom: 12pt;
    color: #1a5276;
    mso-bidi-font-weight: bold;
  }
  h2 { 
    font-size: 15pt; 
    font-weight: bold; 
    margin-top: 18pt; 
    margin-bottom: 10pt; 
    color: #1a5276;
    border-bottom: 1.5px solid #aed6f1;
    padding-bottom: 4pt;
    mso-bidi-font-weight: bold;
  }
  h3 { 
    font-size: 13pt; 
    font-weight: bold; 
    margin-top: 14pt; 
    margin-bottom: 6pt;
    color: #2c3e50;
    mso-bidi-font-weight: bold;
  }
  p { 
    margin: 6pt 0; 
    text-align: justify;
    text-justify: kashida;
  }
  ul, ol { 
    margin: 8pt 24pt 8pt 0; 
    padding-right: 16pt;
  }
  li { 
    margin: 4pt 0; 
    line-height: 1.8;
  }
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 12pt 0;
    direction: rtl;
  }
  th, td { 
    border: 1.5px solid #2c3e50; 
    padding: 8pt 10pt; 
    text-align: right; 
    font-size: 11pt;
    line-height: 1.6;
    mso-bidi-font-family: 'Simplified Arabic';
  }
  th { 
    background-color: #1a5276; 
    color: #ffffff;
    font-weight: bold; 
    font-size: 11pt;
    mso-bidi-font-weight: bold;
  }
  tr:nth-child(even) td {
    background-color: #f5f8fa;
  }
  strong, b { 
    font-weight: bold;
    mso-bidi-font-weight: bold;
  }
  .header-info { 
    text-align: center; 
    margin-bottom: 24pt;
    border: 2px solid #1a5276;
    padding: 12pt;
    background-color: #eaf2f8;
  }
  .doc-code { 
    font-size: 11pt; 
    color: #1a5276;
    font-weight: bold;
  }
  .footer {
    text-align: center;
    margin-top: 30pt;
    padding-top: 10pt;
    border-top: 1px solid #ccc;
    font-size: 9pt;
    color: #999;
  }
</style>
</head>
<body>
<div class="header-info">
  <p class="doc-code">نظام إدارة الجودة وسلامة الغذاء</p>
</div>
<h1>${escapeHtml(title)}</h1>
${htmlContent}
<div class="footer">
  <p>تم إنشاء هذا المستند بواسطة نظام الأذواق لسلامة الغذاء</p>
</div>
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
  
  const tables = extractMarkdownTables(markdownContent);
  
  if (tables.length === 0) {
    const lines = markdownContent.split("\n").filter(l => l.trim());
    const data = lines.map(line => [line.replace(/[#*_`]/g, "").trim()]);
    const ws = XLSX.utils.aoa_to_sheet([["المحتوى"], ...data]);
    
    // Style header
    ws["!cols"] = [{ wch: 80 }];
    ws["!rows"] = [{ hpt: 24 }];
    
    XLSX.utils.book_append_sheet(wb, ws, "المحتوى");
  } else {
    tables.forEach((table, idx) => {
      const ws = XLSX.utils.aoa_to_sheet(table.rows);
      
      // Auto-size columns based on content
      const maxCols = Math.max(...table.rows.map(r => r.length));
      ws["!cols"] = Array.from({ length: maxCols }, (_, colIdx) => {
        const maxWidth = Math.max(
          ...table.rows.map(r => (r[colIdx] || "").length)
        );
        return { wch: Math.max(12, Math.min(50, maxWidth + 4)) };
      });
      
      // Set row heights
      ws["!rows"] = table.rows.map((_, i) => ({ hpt: i === 0 ? 24 : 20 }));
      
      const sheetName = (table.heading || `جدول ${idx + 1}`).substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    // Add a summary sheet if multiple tables
    if (tables.length > 1) {
      const summaryData = [
        ["ملخص المستند"],
        ["العنوان", title],
        ["عدد الجداول", String(tables.length)],
        [""],
        ["اسم الورقة", "عدد الصفوف", "عدد الأعمدة"],
        ...tables.map((t, i) => [
          t.heading || `جدول ${i + 1}`,
          String(t.rows.length - 1),
          String(Math.max(...t.rows.map(r => r.length)))
        ])
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, "ملخص");
    }
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
    
    if (line.startsWith("|") && line.endsWith("|")) {
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
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  
  // Tables - improved rendering
  html = html.replace(/((?:\|[^\n]+\|\n)+)/g, (match) => {
    const rows = match.trim().split("\n");
    let table = '<table>';
    let isFirstDataRow = true;
    rows.forEach((row) => {
      if (/^\|[\s\-:|]+\|$/.test(row)) return;
      const cells = row.split("|").slice(1, -1);
      const tag = isFirstDataRow ? "th" : "td";
      table += "<tr>" + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join("") + "</tr>";
      isFirstDataRow = false;
    });
    table += "</table>";
    return table;
  });
  
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => `<ul>${match}</ul>`);
  
  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");
  
  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr/>");
  
  // Paragraphs
  html = html.replace(/^(?!<[hultdpoe/]|<\/|<strong|<em|<hr)(.+)$/gm, "<p>$1</p>");
  
  // Clean
  html = html.replace(/<p>\s*<\/p>/g, "");
  
  return html;
}
