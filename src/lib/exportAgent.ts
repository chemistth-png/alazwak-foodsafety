import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from "docx";

/**
 * Export markdown content as a real Word (.docx) file with RTL Arabic support.
 * Markdown headings, lists and pipe tables are converted to native Word elements.
 */
export async function exportToWord(title: string, markdownContent: string) {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: title, bold: true, size: 32 })],
    }),
  ];

  const lines = markdownContent.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        if (!row.match(/^\|[\s\-:|]+\|$/)) rows.push(parseTableRow(row));
        i++;
      }
      if (rows.length) {
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows.map((cells, rowIndex) => new TableRow({
            children: cells.map(cell => new TableCell({
              children: [new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: cell, bold: rowIndex === 0 })],
              })],
            })),
          })),
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
        }));
      }
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const levels = [
        HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
        HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
      ];
      children.push(new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        heading: levels[Math.min(heading[1].length, 6) - 1],
        children: [new TextRun({ text: cleanMarkdown(heading[2]), bold: true })],
      }));
      i++; continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      children.push(new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        bullet: bullet ? { level: 0 } : undefined,
        numbering: numbered ? { reference: "arabic-numbering", level: 0 } : undefined,
        children: [new TextRun(cleanMarkdown((bullet || numbered)![1]))],
      }));
      i++; continue;
    }

    children.push(new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      children: [new TextRun(cleanMarkdown(line))],
    }));
    i++;
  }

  children.push(new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG")}`, size: 18 })],
  }));

  const doc = new Document({
    numbering: {
      config: [{
        reference: "arabic-numbering",
        levels: [{
          level: 0,
          format: "decimal",
          text: "%1.",
          alignment: AlignmentType.RIGHT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${sanitizeFilename(title)}.docx`);
}

function cleanMarkdown(value: string): string {
  return value.replace(/\*\*/g, "").replace(/[*_`]/g, "").trim();
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
