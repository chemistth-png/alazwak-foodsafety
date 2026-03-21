import * as XLSX from "xlsx";
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType
} from "docx";
import { saveAs } from "file-saver";

/**
 * Export markdown content as a real Word (.docx) file with RTL Arabic support
 * Optimized for minimal file size and mobile compatibility
 */
export async function exportToWord(title: string, markdownContent: string) {
  const sections = parseMarkdownToDocxElements(markdownContent);
  
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720, // 0.5 inch
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
        bidi: true,
      },
      children: [
        // Simple Title
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 32, // 16pt
            }),
          ],
        }),
        
        new Paragraph({ spacing: { after: 200 } }),
        
        // Content
        ...sections,
        
        // Simple Footer
        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          children: [
            new TextRun({
              text: `تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG")}`,
              size: 16,
              color: "666666",
            }),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${sanitizeFilename(title)}.docx`);
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

  lines.forEach(line => {
    const trimmedLine = line.trim();

    // Skip table separator lines like |---|---|
    if (trimmedLine.startsWith("|") && (trimmedLine.includes("-|-") || trimmedLine.match(/^\|[\s\-:|]+\|$/))) {
      return;
    }

    if (trimmedLine.startsWith("|")) {
      // Table row: split by | and clean up
      const cells = trimmedLine
        .split("|")
        .filter((_, i, arr) => i > 0 && i < arr.length - 1)
        .map(c => c.trim().replace(/\*\*/g, ""));
      
      if (cells.length > maxCols) maxCols = cells.length;

      if (!currentTable) {
        currentTable = [cells];
      } else {
        currentTable.push(cells);
      }
    } else {
      // If we were building a table and hit a non-table line, flush it
      if (currentTable) {
        allContentSheetData.push(...currentTable);
        allContentSheetData.push([""]);
        currentTable = null;
      }
      
      if (trimmedLine.length > 0) {
        // Clean markdown formatting for Excel
        const cleanLine = trimmedLine.replace(/[#*_`]/g, "").trim();
        const rowIndex = allContentSheetData.length;
        allContentSheetData.push([cleanLine]);
        // We'll handle merging later after we know maxCols
      } else {
        allContentSheetData.push([""]);
      }
    }
  });
  
  // Final flush
  if (currentTable) {
    allContentSheetData.push(...currentTable);
  }

  // Apply merges for non-table rows to span across maxCols
  allContentSheetData.forEach((row, idx) => {
    if (row.length === 1 && row[0] && idx > 1) {
      merges.push({ s: { r: idx, c: 0 }, e: { r: idx, c: Math.max(0, maxCols - 1) } });
    }
  });
  
  const wsAllContent = XLSX.utils.aoa_to_sheet(allContentSheetData);
  wsAllContent["!merges"] = merges;
  
  // Auto-size columns
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

function parseMarkdownToDocxElements(markdown: string): any[] {
  const lines = markdown.split("\n");
  const children: any[] = [];
  
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
      const text = line.replace(/^#+\s*/, "");
      children.push(new Paragraph({
        text: text,
        heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120, after: 60 },
      }));
      i++;
    } 
    // Tables - Simplified for smaller file size
    else if (line.startsWith("|")) {
      const tableRows: TableRow[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rowText = lines[i].trim();
        if (rowText.includes("-|-") || rowText.match(/^\|[\s\-:|]+\|$/)) {
          i++;
          continue;
        }
        
        const cells = rowText.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableRows.push(new TableRow({
          children: cells.map(cell => new TableCell({
            children: [new Paragraph({ 
              text: cell.trim().replace(/\*\*/g, ""), 
              bidirectional: true,
              alignment: AlignmentType.RIGHT,
              spacing: { before: 40, after: 40 }
            })],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            }
          })),
        }));
        i++;
      }
      
      if (tableRows.length > 0) {
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
          spacing: { before: 100, after: 100 },
        }));
      }
    }
    // Lists
    else if (line.startsWith("- ") || line.match(/^\d+\.\s/)) {
      const isOrdered = line.match(/^\d+\.\s/);
      children.push(new Paragraph({
        text: line.replace(/^[-\d.]+\s+/, ""),
        bullet: isOrdered ? undefined : { level: 0 },
        numbering: isOrdered ? { reference: "ordered-list", level: 0 } : undefined,
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
      }));
      i++;
    }
    // Normal Paragraph
    else {
      children.push(new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: line.replace(/\*\*/g, "").replace(/\*/g, ""),
          }),
        ],
      }));
      i++;
    }
  }
  
  return children;
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
