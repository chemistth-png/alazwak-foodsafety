import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    .replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(').replace(/\\\)/g, ')')
    .replace(/\s{3,}/g, '\n').trim();
}

async function extractTextWithAI(pdfBase64: string, fileName: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `أنت أداة استخراج نصوص متخصصة. استخرج كل النص الموجود في هذا الملف بدقة عالية.\n\nقواعد:\n- استخرج كل النصوص بما في ذلك الجداول والصور\n- حافظ على هيكل الجداول باستخدام | كفاصل\n- استخرج بلغته الأصلية\n- لا تضف تعليقات\n\nاسم الملف: ${fileName}` },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
        ]
      }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI extraction error:", errText);
    throw new Error(`AI extraction failed: ${response.status}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from AI");
  return content;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function extractDocx(fileData: Blob): Promise<string> {
  // Use AI-based extraction for DOCX files for better compatibility
  const data = new Uint8Array(await fileData.arrayBuffer());
  
  // Try simple XML-based extraction first
  const text = new TextDecoder().decode(data);
  
  // Check if it's a valid ZIP/DOCX file
  if (data[0] === 0x50 && data[1] === 0x4B) {
    // It's a ZIP file (DOCX format) - try to extract text from XML content
    // Simple approach: find all text between <w:t> tags
    const matches: string[] = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    
    // We need to decompress the ZIP first
    // Since we can't use mammoth, use AI extraction
    const base64 = uint8ArrayToBase64(data);
    return await extractTextWithAI(base64, "document.docx");
  }
  
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { filePath, fileName, mimeType } = await req.json();
    if (!filePath || !fileName) {
      return new Response(JSON.stringify({ error: "filePath and fileName are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: fileData, error: downloadError } = await supabase.storage.from("chat-files").download(filePath);
    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "فشل في تحميل الملف" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let extractedText = "";
    const fileExt = fileName.split(".").pop()?.toLowerCase();

    if (fileExt === "pdf") {
      const data = new Uint8Array(await fileData.arrayBuffer());
      extractedText = extractTextFromPDF(data);
      console.log(`Simple extraction: ${extractedText.length} chars`);
      if (!extractedText || extractedText.length < 50) {
        console.log("Using AI extraction for PDF...");
        try {
          extractedText = await extractTextWithAI(uint8ArrayToBase64(data), fileName);
        } catch (aiError) {
          console.error("AI extraction failed:", aiError);
          if (!extractedText) extractedText = "[لم يتم استخراج نص من ملف PDF]";
        }
      }
    } else if (fileExt === "docx" || fileExt === "doc") {
      console.log(`Using AI extraction for ${fileExt} file...`);
      try {
        const data = new Uint8Array(await fileData.arrayBuffer());
        extractedText = await extractTextWithAI(uint8ArrayToBase64(data), fileName);
      } catch (aiError) {
        console.error(`AI extraction failed for .${fileExt}:`, aiError);
        extractedText = `[لم يتم استخراج نص - صيغة .${fileExt} تتطلب معالجة خاصة]`;
      }
    } else if (fileExt === "xlsx" || fileExt === "xls") {
      // Use AI to extract Excel content
      console.log("Using AI extraction for Excel file...");
      try {
        const data = new Uint8Array(await fileData.arrayBuffer());
        extractedText = await extractTextWithAI(uint8ArrayToBase64(data), fileName);
      } catch (aiError) {
        console.error("AI extraction failed for Excel:", aiError);
        extractedText = "[لم يتم استخراج محتوى ملف Excel]";
      }
    } else if (fileExt === "txt" || fileExt === "csv" || fileExt === "md") {
      extractedText = await fileData.text();
    } else {
      return new Response(JSON.stringify({ error: `نوع الملف غير مدعوم: ${fileExt}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MAX_CHARS = 50000;
    const originalText = extractedText;
    if (extractedText.length > MAX_CHARS) {
      extractedText = extractedText.slice(0, MAX_CHARS) + "\n\n... [تم اقتطاع النص]";
    }

    // --- RAG: Chunking and Embedding ---
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY && originalText.length > 0) {
        console.log(`Processing RAG for ${fileName}...`);
        
        // 1. Save to documents table first to get the ID
        const { data: doc, error: docError } = await supabase
          .from("documents")
          .insert({
            user_id: user.id,
            file_name: fileName,
            content: originalText,
            file_size: fileData.size,
          })
          .select("id")
          .single();
        
        if (docError) throw docError;

        // 2. Chunking (simple character-based with overlap)
        const chunkSize = 1000;
        const overlap = 200;
        const chunks: string[] = [];
        for (let i = 0; i < originalText.length; i += (chunkSize - overlap)) {
          chunks.push(originalText.slice(i, i + chunkSize));
          if (i + chunkSize >= originalText.length) break;
        }

        console.log(`Generated ${chunks.length} chunks for ${fileName}`);

        // 3. Generate embeddings and store in batches
        // Note: We'll process in batches to avoid hitting API limits or timeouts
        const batchSize = 10;
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          
          const embedResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/text-embedding-3-small",
              input: batch,
            }),
          });

          if (!embedResp.ok) {
            console.error(`Embedding batch ${i} failed:`, await embedResp.text());
            continue;
          }

          const { data: embeddings } = await embedResp.json();
          
          const chunksToInsert = batch.map((content, index) => ({
            document_id: doc.id,
            user_id: user.id,
            content,
            embedding: embeddings[index].embedding,
            metadata: { fileName, chunkIndex: i + index },
          }));

          const { error: insertError } = await supabase
            .from("document_chunks")
            .insert(chunksToInsert);
          
          if (insertError) console.error("Error inserting chunks:", insertError);
        }
        console.log(`RAG processing complete for ${fileName}`);
      }
    } catch (ragError) {
      console.error("RAG processing failed:", ragError);
      // We don't fail the whole request if RAG fails, just log it
    }

    return new Response(JSON.stringify({ text: extractedText, fileName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ في تحليل الملف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
