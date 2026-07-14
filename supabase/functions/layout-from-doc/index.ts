import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function u8ToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

const SYSTEM_PROMPT = `أنت خبير في قراءة مخططات المصانع (Factory Layout). ستحصل على ملف يحتوي على مخطط تخطيطي لمصنع (Layout). حدد كل منطقة/غرفة مكتوب اسمها في المخطط.

أعد فقط JSON صالحاً بالصيغة التالية بدون أي شرح:
{
  "items": [
    {
      "label": "اسم المنطقة كما يظهر في المخطط (بالعربية إن وُجد)",
      "type": "أحد: production | storage_raw | storage_finished | packaging | lab | washing | utilities | office | loading | changing | waste | water_treatment",
      "x": 0.12,
      "y": 0.20,
      "width": 0.22,
      "height": 0.18
    }
  ]
}

- x, y هما الزاوية العلوية اليسرى بالنسب (0 إلى 1) من عرض/ارتفاع الصفحة.
- width, height نسب من العرض/الارتفاع الكاملين.
- إن لم يظهر التصنيف بوضوح، اختر أقرب نوع من القائمة.
- تجاهل العناوين والإطار الخارجي والأسهم.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI غير مُهيّأ" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { filePath, fileName } = await req.json();
    if (!filePath || !fileName || !filePath.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: "طلب غير صالح" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseKey);
    const { data: fileData, error: dlErr } = await admin.storage.from("chat-files").download(filePath);
    if (dlErr || !fileData) {
      return new Response(JSON.stringify({ error: "تعذّر تحميل الملف" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const mime =
      ext === "pdf" ? "application/pdf" :
      ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
      ext === "doc" ? "application/msword" :
      "application/octet-stream";

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const b64 = u8ToBase64(bytes);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `حلّل مخطط المصنع في هذا الملف "${fileName}" وأعد JSON بالمناطق.` },
              ext === "pdf"
                ? { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } }
                : { type: "file", file: { filename: fileName, file_data: `data:${mime};base64,${b64}` } },
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "فشل التحليل بالذكاء الاصطناعي", details: errText }), {
        status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("layout-from-doc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
