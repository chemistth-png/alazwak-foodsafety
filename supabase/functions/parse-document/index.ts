import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TEXT_EXTS = ["txt", "csv", "md"];
const IMAGE_MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const ALLOWED = [...TEXT_EXTS, "pdf", "docx", "doc", "rtf", "xls", "xlsx", ...Object.keys(IMAGE_MIME)];

async function extractExcel(bytes: Uint8Array): Promise<string> {
  const XLSX = await import("npm:xlsx@0.18.5");
  const wb = XLSX.read(bytes, { type: "array" });
  return wb.SheetNames.map((n: string) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: " | ", blankrows: false });
    return `### ورقة: ${n}\n${csv}`;
  }).join("\n\n").trim();
}
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_CHARS = 1_000_000;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(bin);
}

// AI fallback (scanned PDFs, legacy .doc)
async function extractWithAI(bytes: Uint8Array, mime: string, fileName: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("AI not configured");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `استخرج كل النص الموجود في هذا الملف بدقة وبلغته الأصلية، مع الحفاظ على الجداول باستخدام | كفاصل. لا تضف أي تعليق. اسم الملف: ${fileName}` },
          { type: "image_url", image_url: { url: `data:${mime};base64,${toBase64(bytes)}` } },
        ],
      }],
    }),
  });
  if (!r.ok) throw new Error(`AI extraction failed: ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

async function extractPdf(bytes: Uint8Array, fileName: string): Promise<string> {
  let text = "";
  try {
    const { extractText, getDocumentProxy } = await import("npm:unpdf@0.12.1");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const res = await extractText(pdf, { mergePages: false });
    text = (res.text as string[]).join("\n\n").trim();
  } catch (e) {
    console.error("unpdf failed:", e);
  }
  // Scanned / image-only PDFs have little or no text layer
  if (text.replace(/\s/g, "").length < 50) {
    text = (await extractWithAI(bytes, "application/pdf", fileName)).trim();
  }
  return text;
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const mammoth = (await import("npm:mammoth@1.8.0")).default;
  // deno-lint-ignore no-explicit-any
  const { Buffer } = await import("node:buffer") as any;
  const res = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return (res.value || "").trim();
}

function extractRtf(bytes: Uint8Array): string {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return raw
    .replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)))
    .replace(/\\'[0-9a-f]{2}/gi, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    // Caller JWT keeps storage + documents RLS active (no service-role bypass).
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await client.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json(401, { error: "Unauthorized" });

    const body = await req.json().catch(() => null);
    const filePath = typeof body?.filePath === "string" ? body.filePath : "";
    const fileName = typeof body?.fileName === "string" ? body.fileName.slice(0, 255) : "";
    if (!filePath || !fileName) return json(400, { error: "filePath and fileName are required" });
    if (!filePath.startsWith(`${user.id}/`) || filePath.split("/").some((p: string) => !p || p === "." || p === "..")) {
      return json(403, { error: "Forbidden" });
    }
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED.includes(ext)) return json(415, { error: "الأنواع المدعومة: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, WEBP, RTF, TXT, CSV, MD" });

    const { data: blob, error: dlErr } = await client.storage.from("chat-files").download(filePath);
    if (dlErr || !blob) return json(404, { error: "تعذر تحميل الملف من التخزين" });
    if (blob.size > MAX_BYTES) return json(413, { error: "حجم الملف يتجاوز 20 ميجابايت" });
    const bytes = new Uint8Array(await blob.arrayBuffer());

    let content = "";
    try {
      if (TEXT_EXTS.includes(ext)) content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      else if (ext === "pdf") content = await extractPdf(bytes, fileName);
      else if (ext === "docx") content = await extractDocx(bytes);
      else if (ext === "rtf") content = extractRtf(bytes);
      else if (ext === "xls" || ext === "xlsx") content = await extractExcel(bytes);
      else if (IMAGE_MIME[ext]) content = (await extractWithAI(bytes, IMAGE_MIME[ext], fileName)).trim();
      else content = (await extractWithAI(bytes, "application/msword", fileName)).trim();
    } catch (e) {
      console.error(`extract ${ext} failed:`, e);
      return json(422, { error: `تعذر استخراج النص من ملف ${ext.toUpperCase()}` });
    }
    content = content.replace(/\0/g, "");
    if (!content.trim()) return json(422, { error: "لم يتم العثور على نص قابل للاستخراج في الملف" });
    if (content.length > MAX_CHARS) content = content.slice(0, MAX_CHARS);

    // Trigger chunk_document indexes the text into document_chunks atomically.
    const { data: doc, error: saveErr } = await client
      .from("documents")
      .insert({ user_id: user.id, file_name: fileName, content, file_size: blob.size })
      .select("id")
      .single();
    if (saveErr || !doc) {
      console.error("save failed:", saveErr);
      return json(500, { error: "تعذر حفظ المستند" });
    }

    console.log(`parsed ${ext} ${fileName}: ${content.length} chars, doc ${doc.id}`);
    return json(200, { saved: true, documentId: doc.id, fileName, filePath, text: content.slice(0, 50000), chars: content.length });
  } catch (e) {
    console.error("parse-document error:", e);
    return json(500, { error: "خطأ في تحليل الملف" });
  }
});