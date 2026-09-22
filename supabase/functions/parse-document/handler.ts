export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
type Dependencies = {
  authenticate: () => Promise<string | null>;
  download: (path: string) => Promise<Blob>;
  save: (document: { user_id: string; file_name: string; content: string; file_size: number }) => Promise<string>;
};
const response = (status: number, body: object) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
export async function handleDocument(req: Request, deps: Dependencies): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return response(405, { error: "Method not allowed" });
  if (!req.headers.get("Authorization")?.startsWith("Bearer ")) return response(401, { error: "Unauthorized" });
  try {
    const userId = await deps.authenticate();
    if (!userId) return response(401, { error: "Unauthorized" });
    let input: unknown;
    try { input = await req.json(); } catch { return response(400, { error: "Invalid JSON" }); }
    if (!input || typeof input !== "object") return response(400, { error: "Invalid request" });
    const { filePath, fileName } = input as Record<string, unknown>;
    if (typeof filePath !== "string" || typeof fileName !== "string" || !fileName.trim() || fileName.length > 255 || filePath.length > 1024) {
      return response(400, { error: "Invalid filePath or fileName" });
    }
    if (!filePath.startsWith(`${userId}/`) || filePath.split("/").some(p => !p || p === "." || p === "..") || (/[\\%]/.test(filePath) || [...filePath].some(char => char.charCodeAt(0) < 32))) {
      return response(403, { error: "Forbidden" });
    }
    if (!["txt", "csv", "md"].includes(fileName.split(".").pop()?.toLowerCase() ?? "")) {
      return response(415, { error: "تحليل PDF وOffice متوقف مؤقتاً؛ استخدم TXT أو CSV أو MD" });
    }
    const blob = await deps.download(filePath);
    if (blob.size > 20 * 1024 * 1024) return response(413, { error: "حجم الملف يتجاوز 20 ميجابايت" });
    let content: string;
    try { content = new TextDecoder("utf-8", { fatal: true }).decode(await blob.arrayBuffer()); }
    catch { return response(422, { error: "يجب أن يكون الملف نصاً بترميز UTF-8" }); }
    if (!content.trim() || content.includes("\0")) return response(422, { error: "لم يتم العثور على نص صالح" });
    if (content.length > 1_000_000) return response(413, { error: "النص المستخرج يتجاوز الحد المسموح" });
    // The database trigger creates text chunks atomically with the document.
    const documentId = await deps.save({ user_id: userId, file_name: fileName, content, file_size: blob.size });
    if (!documentId) throw new Error("Missing persistence confirmation");
    const truncated = content.length > 50000;
    return response(200, { saved: true, documentId, fileName, truncated,
      text: truncated ? content.slice(0, 50000) + "\n\n... [تم اقتطاع النص المعروض؛ النسخة الكاملة محفوظة]" : content });
  } catch {
    return response(500, { error: "تعذر تحليل وحفظ المستند؛ لم تكتمل العملية" });
  }
}
