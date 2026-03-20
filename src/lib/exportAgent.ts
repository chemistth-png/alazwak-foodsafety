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
  AlignmentType,
  TextDirection
} from "docx";
import { saveAs } from "file-saver";

/**
 * Export markdown content as a real Word (.docx) file with RTL Arabic support
 * Uses the 'docx' library for valid file generation
 */
export async function exportToWord(title: string, markdownContent: string) {
  const sections = parseMarkdownToDocxSections(markdownContent);
  
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: [
        // Header Box
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "نظام الأذواق لسلامة الغذاء - تقرير الوكيل الذكي",
                          bold: true,
                          color: "1a5276",
                          size: 24,
                        }),
                      ],
                    }),
                  ],
                  shading: { fill: "f8fbfe" },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "1a5276" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "1a5276" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "1a5276" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "1a5276" },
                  },
                }),
              ],
            }),
          ],
        }),
        
        new Paragraph({ spacing: { before: 400, after: 400 } }),
        
        // Title
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          children: [
            new TextRun({
              text: title,
              bold: true,
              color: "1a5276",
              size: 44, // 22pt
            }),
          ],
        }),
        
        new Paragraph({ spacing: { after: 400 } }),
        
        // Content
        ...sections,
        
        // Footer
        new Paragraph({ spacing: { before: 800 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "dddddd" },
            bottom: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      bidirectional: true,
                      children: [
                        new TextRun({
                          text: "تم إنشاء هذا المستند آلياً بواسطة منصة الأذواق لسلامة الغذاء",
                          size: 18,
                          color: "777777",
                        }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      bidirectional: true,
                      children: [
                        new TextRun({
                          text: `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}`,
                          size: 18,
                          color: "777777",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
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
 * Includes ALL content: paragraphs, lists, and tables
 */
export function exportToExcel(title: string, markdownContent: string) {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  
  const lines = markdownContent.split("\n").map(l => l.trim());
  const aoa: any[][] = [[title], [""]];
  
  let currentTable: string[][] | null = null;
  
  lines.forEach(line => {
    if (line.startsWith("|") && line.includes("-|-")) {
      // Skip separator
      return;
    }
    
    if (line.startsWith("|")) {
      const cells = line.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim().replace(/\*\*/g, ""));
      if (!currentTable) {
        currentTable = [cells];
      } else {
        currentTable.push(cells);
      }
    } else {
      if (currentTable) {
        aoa.push(...currentTable);
        aoa.push([""]);
        currentTable = null;
      }
      
      if (line.length > 0) {
        // Clean markdown formatting for Excel
        const cleanLine = line.replace(/[#*_`]/g, "").trim();
        aoa.push([cleanLine]);
      } else {
        aoa.push([""]);
      }
    }
  });
  
  if (currentTable) {
    aoa.push(...currentTable);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Basic styling
  ws["!cols"] = [{ wch: 100 }];
  
  XLSX.utils.book_append_sheet(wb, ws, "تقرير المهمة");
  
  // Also extract tables to separate sheets for better usability
  const tables = extractMarkdownTables(markdownContent);
  tables.forEach((table, idx) => {
    const tableWs = XLSX.utils.aoa_to_sheet(table.rows);
    const maxCols = Math.max(...table.rows.map(r => r.length));
    tableWs["!cols"] = Array.from({ length: maxCols }, (_, colIdx) => {
      const maxWidth = Math.max(...table.rows.map(r => (r[colIdx] || "").toString().length));
      return { wch: Math.min(50, Math.max(15, maxWidth + 2)) };
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

function parseMarkdownToDocxSections(markdown: string): any[] {
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
        spacing: { before: 240, after: 120 },
      }));
      i++;
    } 
    // Tables
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
              alignment: AlignmentType.RIGHT 
            })],
            verticalAlign: AlignmentType.CENTER,
          })),
        }));
        i++;
      }
      
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
        spacing: { before: 200, after: 200 },
      }));
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
        spacing: { after: 100 },
      }));
      i++;
    }
    // Normal Paragraph
    else {
      children.push(new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: line.replace(/\*\*/g, ""),
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
    
    if (line.startsWith("|") && line.includes("-|-")) {
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
