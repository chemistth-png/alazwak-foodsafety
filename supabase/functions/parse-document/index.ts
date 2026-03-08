import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      // Use pdf-parse for PDF files
      const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (fileExt === "docx" || fileExt === "doc") {
      // Use mammoth for Word files
      const mammoth = await import("npm:mammoth@1.6.0");
      const buffer = await fileData.arrayBuffer();
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileExt === "xlsx" || fileExt === "xls") {
      // Use xlsx for Excel files
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
