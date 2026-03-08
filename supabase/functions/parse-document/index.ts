import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple PDF text extractor for basic PDFs
function extractTextFromPDF(data: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(data);
  const textParts: string[] = [];

  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;

  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(tjMatch[1]);
    }
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

  return textParts.join(' ')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\s{3,}/g, '\n')
    .trim();
}

// Use Lovable AI (Gemini) to extract text from complex PDFs (images, tables, scanned docs)
async function extractTextWithAI(pdfBase64: string, fileName: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `أنت أداة استخراج نصوص متخصصة. استخرج كل النص الموجود في ملف PDF هذا بدقة عالية.
              
قواعد الاستخراج:
- استخرج كل النصوص بما في ذلك النصوص داخل الجداول والصور
- حافظ على هيكل الجداول باستخدام | كفاصل بين الأعمدة
- استخرج النص بلغته الأصلية (عربي، إنجليزي، أو مختلط)
- إذا كان الملف يحتوي على مخططات أو رسوم بيانية، اوصفها بإيجاز
- لا تضف أي تعليقات أو شروحات خاصة بك
- ابدأ مباشرة بالنص المستخرج

اسم الملف: ${fileName}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`
              }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI extraction error:", errText);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content returned from AI");
  }

  return content;
}

// Encode Uint8Array to base64 string (Deno-compatible)
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
      
      // Step 1: Try simple extraction first
      extractedText = extractTextFromPDF(data);
      console.log(`Simple extraction result: ${extractedText.length} chars`);
      
      // Step 2: If simple extraction yielded little text, use AI
      if (!extractedText || extractedText.length < 50) {
        console.log("Simple extraction insufficient, using AI extraction...");
        try {
          const base64 = uint8ArrayToBase64(data);
          extractedText = await extractTextWithAI(base64, fileName);
          console.log(`AI extraction result: ${extractedText.length} chars`);
        } catch (aiError) {
          console.error("AI extraction failed:", aiError);
          if (extractedText && extractedText.length > 0) {
            // Keep the simple extraction result
          } else {
            extractedText = "[لم يتم استخراج نص من ملف PDF - قد يكون الملف محمياً أو تالفاً]";
          }
        }
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
