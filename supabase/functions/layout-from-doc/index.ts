import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function u8ToBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

const ALLOWED_TYPES = [
  "production","storage_raw","storage_finished","packaging","lab",
  "washing","utilities","office","loading","changing","waste","water_treatment",
];

const SYSTEM_PROMPT = `أنت خبير معتمد في قراءة مخططات المصانع الغذائية (Factory Layout / Site Plan) وترجمتها إلى بيانات هندسية دقيقة.

المهمة: استخرج **كل** المناطق/الغرف الظاهرة في المخطط بحدود دقيقة (Bounding Boxes) مطابقة لحواف المستطيلات الظاهرة في الرسم.

قواعد الدقة الإلزامية:
1) الإحداثيات x,y هي الزاوية العلوية اليسرى للمستطيل، بنسب عشرية بين 0 و 1 من عرض/ارتفاع الصفحة الكاملة (وليس المحتوى فقط).
2) width و height هي أبعاد المستطيل نفسه بنسبة (0-1). لا تتضمن الفراغات المحيطة.
3) طابق الحدود على الحواف المرئية للمستطيل (الجدران) بدقة ±1% إن أمكن. لا تُقرِّب لأرقام مستديرة.
4) استخرج **الاسم النصي كما يظهر تماماً** داخل المستطيل (بالعربية إن وُجد، وإلا بالإنجليزية). لا تُترجم ولا تختصر.
5) لا تُدرج: العنوان الرئيسي للمخطط، سهم الشمال، مفتاح الرموز (Legend)، الإطار الخارجي، الأبعاد، أو النصوص التوضيحية خارج المستطيلات.
6) إن تداخلت منطقتان، احتفظ بالمنطقة الأصغر (غرفة داخل قاعة) واذكر كليهما.
7) اختر type من هذه القائمة فقط: ${ALLOWED_TYPES.join(", ")}. إن لم يوجد تطابق واضح، استخدم أقرب نوع دلالياً. أضف حقل confidence من 0 إلى 1 لكل عنصر.

أعد JSON صالحاً فقط بدون أي شرح، بالصيغة التالية بالضبط:
{
  "page_notes": "ملاحظة قصيرة اختيارية عن جودة المخطط",
  "items": [
    {
      "label": "اسم المنطقة كما يظهر",
      "type": "production",
      "x": 0.1234,
      "y": 0.2345,
      "width": 0.1500,
      "height": 0.1800,
      "confidence": 0.9
    }
  ]
}`;

// ---- Post-processing helpers ----
function clamp01(n: number, min = 0, max = 1) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function iou(a: any, b: any) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - inter;
  return union > 0 ? inter / union : 0;
}
function cleanItems(raw: any[]): any[] {
  const cleaned = raw
    .filter((it) => it && (it.label || it.type))
    .map((it) => {
      const type = ALLOWED_TYPES.includes(it.type) ? it.type : "production";
      const x = clamp01(Number(it.x));
      const y = clamp01(Number(it.y));
      let width = clamp01(Number(it.width), 0.02, 1);
      let height = clamp01(Number(it.height), 0.02, 1);
      if (x + width > 1) width = 1 - x;
      if (y + height > 1) height = 1 - y;
      return {
        label: String(it.label || "").trim().slice(0, 120) || "منطقة",
        type,
        x, y, width, height,
        confidence: clamp01(Number(it.confidence ?? 0.7)),
      };
    })
    .filter((it) => it.width >= 0.02 && it.height >= 0.02);

  // Remove near-duplicates (same label OR IoU > 0.85, keep higher confidence / smaller area)
  cleaned.sort((a, b) => b.confidence - a.confidence);
  const kept: any[] = [];
  for (const it of cleaned) {
    const dup = kept.find(
      (k) => (k.label && it.label && k.label === it.label && iou(k, it) > 0.4) || iou(k, it) > 0.85,
    );
    if (!dup) kept.push(it);
  }
  // Sort by reading order (top-to-bottom, right-to-left for RTL)
  kept.sort((a, b) => (a.y - b.y) || (b.x - a.x));
  return kept;
}

async function callAI(apiKey: string, userContent: any[]): Promise<any> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    console.error("AI error:", resp.status, errText);
    throw new Error(`AI ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const j = await resp.json();
  const content = j.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(content); } catch {
    const m = content.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

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

    const body = await req.json();
    const { filePath, fileName, images } = body as {
      filePath?: string; fileName: string; images?: string[];
    };
    if (!fileName) {
      return new Response(JSON.stringify({ error: "طلب غير صالح" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [
      { type: "text", text: `حلّل مخطط المصنع "${fileName}" واستخرج جميع المناطق بحدود دقيقة مطابقة لحواف المستطيلات المرئية. ${images && images.length > 1 ? `الصفحات المرفقة: ${images.length}.` : ""}` },
    ];

    // Preferred path: client-side rendered images (much higher spatial accuracy for PDFs).
    if (Array.isArray(images) && images.length > 0) {
      for (const img of images.slice(0, 4)) {
        if (typeof img === "string" && img.startsWith("data:image/")) {
          userContent.push({ type: "image_url", image_url: { url: img } });
        }
      }
    } else {
      // Fallback: download from storage (DOC/DOCX or PDF without pre-render)
      if (!filePath || !filePath.startsWith(`${user.id}/`)) {
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
      userContent.push({
        type: "file",
        file: { filename: fileName, file_data: `data:${mime};base64,${b64}` },
      });
    }

    const parsed = await callAI(LOVABLE_API_KEY, userContent);
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const items = cleanItems(rawItems);

    return new Response(JSON.stringify({ items, page_notes: parsed.page_notes ?? null, raw_count: rawItems.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("layout-from-doc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
