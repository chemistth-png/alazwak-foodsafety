import * as XLSX from "xlsx";

/**
 * Export markdown content as a Word (.doc) file with RTL Arabic support
 * Uses a more robust HTML-to-Word approach with proper headers and encoding
 */
export function exportToWord(title: string, markdownContent: string) {
  const htmlContent = markdownToHtml(markdownContent);
  
  // Word-specific XML/HTML wrapper for better compatibility and RTL support
  const wordDoc = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'
      dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
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
      margin: 2.5cm 2cm 2.5cm 2cm;
    }
    body {
      font-family: 'Arial', 'Simplified Arabic', 'Traditional Arabic', 'Tahoma', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      direction: rtl;
      text-align: right;
      color: #000000;
    }
    h1 {
      font-size: 22pt;
      color: #1a5276;
      text-align: center;
      margin-bottom: 30pt;
      border-bottom: 2px solid #1a5276;
      padding-bottom: 10pt;
    }
    h2 {
      font-size: 18pt;
      color: #1a5276;
      margin-top: 20pt;
      margin-bottom: 10pt;
      border-bottom: 1px solid #aed6f1;
    }
    h3 {
      font-size: 14pt;
      color: #2c3e50;
      margin-top: 15pt;
      margin-bottom: 8pt;
    }
    p {
      margin-bottom: 10pt;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15pt 0;
      direction: rtl;
    }
    th, td {
      border: 1px solid #2c3e50;
      padding: 8pt;
      text-align: right;
      vertical-align: top;
    }
    th {
      background-color: #f2f7fb;
      font-weight: bold;
      color: #1a5276;
    }
    ul, ol {
      margin-bottom: 10pt;
      padding-right: 30pt;
    }
    li {
      margin-bottom: 5pt;
    }
    .header-box {
      border: 1px solid #1a5276;
      padding: 10pt;
      margin-bottom: 20pt;
      background-color: #f8fbfe;
      text-align: center;
    }
    .footer {
      margin-top: 40pt;
      border-top: 1px solid #dddddd;
      padding-top: 10pt;
      font-size: 9pt;
      color: #777777;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <p style="font-weight: bold; color: #1a5276; margin: 0;">نظام الأذواق لسلامة الغذاء - تقرير الوكيل الذكي</p>
  </div>
  
  <h1>${escapeHtml(title)}</h1>
  
  <div class="content">
    ${htmlContent}
  </div>
  
  <div class="footer">
    <p>تم إنشاء هذا المستند آلياً بواسطة منصة الأذواق لسلامة الغذاء</p>
    <p>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</p>
  </div>
</body>
</html>`;

  // Use application/vnd.ms-word to ensure it opens in Word
  const blob = new Blob([wordDoc], { type: "application/vnd.ms-word;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFilename(title)}.doc`);
}

/**
 * Export markdown content as an Excel (.xlsx) file with tables extracted
 */
export function exportToExcel(title: string, markdownContent: string) {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] }; // Set workbook to RTL
  
  const tables = extractMarkdownTables(markdownContent);
  
  if (tables.length === 0) {
    // If no tables, export text content line by line
    const lines = markdownContent.split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(line => [line.replace(/[#*_`]/g, "").trim()]);
      
    const ws = XLSX.utils.aoa_to_sheet([
      [title],
      [""],
      ...lines
    ]);
    
    ws["!cols"] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, ws, "المحتوى");
  } else {
    // Export each table to a separate sheet
    tables.forEach((table, idx) => {
      const ws = XLSX.utils.aoa_to_sheet(table.rows);
      
      // Auto-size columns
      const maxCols = Math.max(...table.rows.map(r => r.length));
      ws["!cols"] = Array.from({ length: maxCols }, (_, colIdx) => {
        const maxWidth = Math.max(...table.rows.map(r => (r[colIdx] || "").toString().length));
        return { wch: Math.min(50, Math.max(15, maxWidth + 2)) };
      });
      
      const sheetName = (table.heading || `جدول ${idx + 1}`).substring(0, 31).replace(/[\\/?*[\]]/g, "");
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  }

  XLSX.writeFile(wb, `${sanitizeFilename(title)}.xlsx`);
}

// ---- Helpers ----

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").substring(0, 100) || "document";
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
    
    if (line.startsWith("|") && line.includes("-|-")) {
      // Found a table header separator
      let heading = "";
      // Look back for a heading
      for (let j = i - 2; j >= 0; j--) {
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
      // Get header row
      if (i > 0 && lines[i-1].trim().startsWith("|")) {
        tableRows.push(parseTableRow(lines[i-1]));
      }
      
      // Skip separator row
      i++;
      
      // Get data rows
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableRows.push(parseTableRow(lines[i]));
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

function parseTableRow(row: string): string[] {
  return row
    .trim()
    .split("|")
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
    .map(c => c.trim().replace(/\*\*/g, ""));
}

function markdownToHtml(md: string): string {
  let html = md;
  
  // Clean up carriage returns
  html = html.replace(/\r\n/g, "\n");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  
  // Bold & Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  
  // Tables
  html = html.replace(/((?:\|[^\n]+\|\n)+)/g, (match) => {
    const rows = match.trim().split("\n");
    if (rows.length < 2) return match;
    
    let tableHtml = '<table>';
    let hasHeader = false;
    
    rows.forEach((row, idx) => {
      if (row.includes("-|-") || row.match(/^\|[\s\-:|]+\|$/)) {
        hasHeader = true;
        return;
      }
      
      const cells = row.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1);
      const isHeaderRow = idx === 0 && rows[1] && (rows[1].includes("-|-") || rows[1].match(/^\|[\s\-:|]+\|$/));
      const tag = isHeaderRow ? "th" : "td";
      
      tableHtml += "<tr>" + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join("") + "</tr>";
    });
    
    tableHtml += "</table>";
    return tableHtml;
  });
  
  // Lists
  html = html.replace(/^\s*-\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.+<\/li>\n?)+)/g, "<ul>$1</ul>");
  
  html = html.replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.+<\/li>\n?)+)(?!<\/ul>)/g, (match) => {
    if (match.includes("<ul>")) return match;
    return `<ol>${match}</ol>`;
  });
  
  // Paragraphs (simplified)
  const lines = html.split("\n");
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<")) return trimmed;
    return `<p>${trimmed}</p>`;
  });
  
  return processedLines.filter(l => l).join("\n");
}
