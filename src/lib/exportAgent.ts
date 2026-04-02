import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Export markdown content as a simple Word (.doc) file with RTL Arabic support
 * This approach uses HTML with Word-specific XML namespaces for maximum mobile compatibility.
 */
export async function exportToWord(title: string, markdownContent: string) {
  const htmlContent = parseMarkdownToHtml(markdownContent);
  
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:w="urn:schemas-microsoft-com:office:word" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
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
        body {
          font-family: 'Arial', 'Tahoma', sans-serif;
          line-height: 1.6;
        }
        h1 { color: #1a365d; text-align: center; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
        h2 { color: #2c5282; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-top: 20px; }
        h3 { color: #2b6cb0; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th, td { border: 1px solid #cbd5e0; padding: 8px; text-align: right; }
        th { background-color: #f7fafc; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; color: #718096; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body dir="rtl">
      <h1>${title}</h1>
      ${htmlContent}
      <div class="footer">
        تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG")}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  saveAs(blob, `${sanitizeFilename(title)}.doc`);
}

/**
 * Export markdown content as an Excel (.xlsx) file
 * Properly parses markdown tables into columns and rows
 */
export function exportToExcel(title: string, markdownContent: string) {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  
  const allContentSheetData: any[][] = [[title], [""]];
  const merges: XLSX.Range[] = [];
  
  const lines = markdownContent.split("\n");
  let currentTable: string[][] | null = null;
  let maxCols = 1;

  // First pass to determine maxCols from all tables
  const allTables = extractMarkdownTables(markdownContent);
  allTables.forEach(table => {
    table.rows.forEach(row => {
      if (row.length > maxCols) maxCols = row.length;
    });
  });
  if (maxCols === 1) maxCols = 5; // Default to 5 columns if no tables found to give some width to text

  // Second pass to build the sheet data with proper merging and table parsing
  lines.forEach(line => {
    const trimmedLine = line.trim();

    // Skip table separator lines like |---|---|
    if (trimmedLine.startsWith("|") && (trimmedLine.includes("-|-") || trimmedLine.match(/^\|[\s\-:|]+\|$/))) {
      return;
    }

    if (trimmedLine.startsWith("|")) {
      // Table row
      const cells = trimmedLine
        .split("|")
        .filter((_, i, arr) => i > 0 && i < arr.length - 1)
        .map(c => c.trim().replace(/\*\*/g, ""));
      
      if (!currentTable) {
        currentTable = [cells];
      } else {
        currentTable.push(cells);
      }
    } else {
      // Non-table line, flush currentTable if any
      if (currentTable) {
        allContentSheetData.push(...currentTable);
        allContentSheetData.push(Array(maxCols).fill("")); // Add an empty row after table
        currentTable = null;
      }
      
      if (trimmedLine.length > 0) {
        const cleanLine = trimmedLine.replace(/[#*_`]/g, "").trim();
        const rowIndex = allContentSheetData.length;
        allContentSheetData.push([cleanLine]);
        // Merge cells for this paragraph row
        merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: Math.max(0, maxCols - 1) } });
      } else {
        allContentSheetData.push(Array(maxCols).fill("")); // Empty row, merge it too
        merges.push({ s: { r: allContentSheetData.length - 1, c: 0 }, e: { r: allContentSheetData.length - 1, c: Math.max(0, maxCols - 1) } });
      }
    }
  });
  
  // Final flush for any remaining table content
  if (currentTable) {
    allContentSheetData.push(...currentTable);
  }

  const wsAllContent = XLSX.utils.aoa_to_sheet(allContentSheetData);
  wsAllContent["!merges"] = merges;
  
  // Auto-size columns for the main sheet
  wsAllContent["!cols"] = Array.from({ length: maxCols }, () => ({ wch: 25 }));
  if (wsAllContent["!cols"][0]) wsAllContent["!cols"][0].wch = 40;
  
  XLSX.utils.book_append_sheet(wb, wsAllContent, "تقرير كامل");
  
  // Also extract tables to separate sheets for better usability
  const tables = extractMarkdownTables(markdownContent);
  tables.forEach((table, idx) => {
    const tableWs = XLSX.utils.aoa_to_sheet(table.rows);
    const tableMaxCols = Math.max(...table.rows.map(r => r.length));
    tableWs["!cols"] = Array.from({ length: tableMaxCols }, (_, colIdx) => {
      const maxWidth = Math.max(...table.rows.map(r => (r[colIdx] || "").toString().length));
      return { wch: Math.min(50, Math.max(12, maxWidth + 2)) };
    });
    
    const sheetName = (table.heading || `جدول ${idx + 1}`).substring(0, 31).replace(/[\\/?*[\]]/g, "");
    XLSX.utils.book_append_sheet(wb, tableWs, sheetName);
  });

  XLSX.writeFile(wb, `${sanitizeFilename(title)}.xlsx`);
}

// ---- Helpers ----

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").substring(0, 100) || "document";
}

function parseMarkdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  let html = "";
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!line) {
      i++;
      continue;
    }
    
    // Headers
    if (line.startsWith("#")) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, "").replace(/\*\*/g, "");
      html += `<h${level}>${text}</h${level}>`;
      i++;
    } 
    // Tables
    else if (line.startsWith("|")) {
      html += "<table>";
      let isHeader = true;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rowText = lines[i].trim();
        if (rowText.includes("-|-") || rowText.match(/^\|[\s\-:|]+\|$/)) {
          i++;
          continue;
        }
        
        const cells = rowText.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        html += "<tr>";
        cells.forEach(cell => {
          const tag = isHeader ? "th" : "td";
          html += `<${tag}>${cell.trim().replace(/\*\*/g, "")}</${tag}>`;
        });
        html += "</tr>";
        isHeader = false;
        i++;
      }
      html += "</table>";
    }
    // Lists
    else if (line.startsWith("- ") || line.match(/^\d+\.\s/)) {
      const isOrdered = line.match(/^\d+\.\s/);
      const tag = isOrdered ? "ol" : "ul";
      html += `<${tag}>`;
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().match(/^\d+\.\s/))) {
        html += `<li>${lines[i].trim().replace(/^[-\d.]+\s+/, "").replace(/\*\*/g, "")}</li>`;
        i++;
      }
      html += `</${tag}>`;
    }
    // Normal Paragraph
    else {
      html += `<p>${line.replace(/\*\*/g, "").replace(/\*/g, "")}</p>`;
      i++;
    }
  }
  
  return html;
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
    
    if (line.startsWith("|") && (line.includes("-|-") || line.match(/^\|[\s\-:|]+\|$/))) {
      let heading = "";
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
      if (i > 0 && lines[i-1].trim().startsWith("|")) {
        tableRows.push(parseTableRow(lines[i-1]));
      }
      i++;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rowText = lines[i].trim();
        if (!rowText.includes("-|-") && !rowText.match(/^\|[\s\-:|]+\|$/)) {
          tableRows.push(parseTableRow(rowText));
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

function parseTableRow(row: string): string[] {
  return row
    .trim()
    .split("|")
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
    .map(c => c.trim().replace(/\*\*/g, ""));
}
