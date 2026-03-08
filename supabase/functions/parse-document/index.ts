import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple PDF text extractor without Node.js Buffer dependency
function extractTextFromPDF(data: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(data);
  const textParts: string[] = [];

  // Extract text between BT and ET markers (PDF text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;

  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];

    // Extract text from Tj operator (show text)
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(tjMatch[1]);
    }

    // Extract text from TJ operator (show text array)
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const items = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(items)) !== null) {
        textParts.push(strMatch[1]);
      }
    }
  }

  // Also try to extract from stream objects for simpler PDFs
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  while ((match = streamRegex.exec(text)) !== null) {
    const streamContent = match[1];
    // Look for readable text in streams
    const readableText = streamContent.replace(/[^\x20-\x7E\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\n\r\t]/g, ' ');
    const cleaned = readableText.replace(/\s{3,}/g, ' ').trim();
    if (cleaned.length > 20) {
      textParts.push(cleaned);
    }
  }

  let result = textParts.join(' ')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\s{3,}/g, '\n')
    .trim();

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, fileName, mimeType } = await req.json();

    if (!filePath || !fileName) {
      return new Response(JSON.stringify({ error: "filePath and fileName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("chat-files")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "فشل في تحميل الملف" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let extractedText = "";
    const fileExt = fileName.split(".").pop()?.toLowerCase();

    if (fileExt === "pdf") {
      const data = new Uint8Array(await fileData.arrayBuffer());
      extractedText = extractTextFromPDF(data);
      
      if (!extractedText || extractedText.length < 10) {
        extractedText = "[لم يتم استخراج نص كافٍ من ملف PDF - قد يكون الملف يحتوي على صور أو نص مشفر]";
      }
    } else if (fileExt === "docx" || fileExt === "doc") {
      const mammoth = await import("npm:mammoth@1.6.0");
      const buffer = await fileData.arrayBuffer();
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileExt === "xlsx" || fileExt === "xls") {
      const XLSX = await import("npm:xlsx@0.18.5");
      const buffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
      
      const sheets: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        sheets.push(`--- ورقة: ${sheetName} ---\n${csv}`);
      }
      extractedText = sheets.join("\n\n");
    } else if (fileExt === "txt" || fileExt === "csv" || fileExt === "md") {
      extractedText = await fileData.text();
    } else {
      return new Response(JSON.stringify({ error: `نوع الملف غير مدعوم: ${fileExt}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate very long texts
    const MAX_CHARS = 50000;
    if (extractedText.length > MAX_CHARS) {
      extractedText = extractedText.slice(0, MAX_CHARS) + "\n\n... [تم اقتطاع النص - الملف كبير جداً]";
    }

    return new Response(JSON.stringify({ text: extractedText, fileName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ في تحليل الملف" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
