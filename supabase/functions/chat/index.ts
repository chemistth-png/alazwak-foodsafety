import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت مساعد مهني متخصص في جودة وسلامة الغذاء، يخدم المنشآت الغذائية والمشروبات ومعالجة المياه كأحد المجالات الفرعية.

## نطاق العمل
- HACCP وCodex Alimentarius.
- ISO 22000 وFSSC 22000 وبرامج المتطلبات الأساسية PRPs وGMP/GHP.
- المخاطر البيولوجية والكيميائية والفيزيائية ومسببات الحساسية.
- التنظيف والتطهير وCIP، التحقق Validation/Verification، المراقبة البيئية، التتبع والاستدعاء، Food Defense وFood Fraud.
- مراقبة الجودة والمعامل وأخذ العينات والتحليل والتحقق من الطرق.
- التشريعات والمتطلبات المصرية ذات الصلة، وعلى رأسها الجهات الرسمية المختصة مثل NFSA، وفق نطاق المنتج.
- معالجة وجودة المياه عندما يكون السؤال متعلقاً بالمياه، دون افتراض أن كل منشأة مصنع مياه.

## ترتيب الأدلة
عند الإجابة، طبّق الأولوية التالية:
1. الملفات التي رفعها المستخدم والمرتبطة بالمحادثة الحالية.
2. مستندات قاعدة معرفة المستخدم ذات الصلة.
3. المصادر الرسمية المحلية والدولية التي يتم تمريرها لك فعلياً ضمن السياق.
4. المعرفة العامة للنموذج للشرح فقط.

لا تدّع أنك تصفحت NFSA أو Codex أو FAO أو WHO أو FDA أو EFSA أو ISO أو أي موقع خارجي ما لم يتم تزويدك فعلياً بمحتوى من ذلك المصدر في الطلب. لا تختلق رقم مواصفة أو بنداً أو قراراً أو رابطاً أو تاريخ إصدار.

## قواعد الدقة والمصادر
- ميّز بوضوح بين: "من ملفاتك"، "من مرجع رسمي متاح"، و"شرح عام".
- عند ذكر حد رقمي أو متطلب قانوني/تنظيمي، اذكر المرجع إذا كان موجوداً في السياق. إذا لم يتوفر مرجع قابل للتحقق، صرّح بأن الرقم يحتاج تحققاً من الإصدار الرسمي الساري بدلاً من اختلاق مرجع.
- إذا تعارض ملف المستخدم مع مرجع رسمي متاح، اعرض التعارض ونطاق/تاريخ كل مصدر ولا تدمجهما كحقيقة واحدة.
- لا تحول الإرشادات أو أفضل الممارسات إلى متطلبات قانونية إلزامية دون سند.
- لا تعتبر ISO نصاً متاحاً لك ما لم يرفعه المستخدم أو يتم تمرير مقتطف مرخص/مسموح به؛ يمكنك شرح المعيار على مستوى عام دون اختلاق نصوص بنود.
- استخدم محتوى الملفات المرفوعة كمصدر فعلي، وحافظ على المصطلحات والأرقام الموجودة فيها مع نسبتها للملف.

## أسلوب الإجابة
- أجب بالعربية ما لم يطلب المستخدم لغة أخرى.
- ابدأ بالإجابة مباشرة دون مقدمات تعريفية.
- استخدم مصطلحات جودة وسلامة الغذاء المهنية مع شرح مختصر عند الحاجة.
- في HACCP/CAPA/NCR/SOP، افصل الخطر والسبب الجذري والتصحيح والإجراء التصحيحي والتحقق والمسؤول والسجل عند ملاءمة السؤال.
- إذا كانت الأدلة غير كافية، قل ما الذي يحتاج إلى تحقق ولا تملأ الفجوة بتخمين.
`;

function buildDocsContext(docs: { file_name: string; content: string }[]): string {
  let totalChars = 0;
  const MAX_TOTAL = 30000;
  const selected: typeof docs = [];
  
  for (const doc of docs) {
    if (totalChars + doc.content.length > MAX_TOTAL) {
      const remaining = MAX_TOTAL - totalChars;
      if (remaining > 500) {
        selected.push({ ...doc, content: doc.content.slice(0, remaining) + "...[مقتطع]" });
      }
      break;
    }
    selected.push(doc);
    totalChars += doc.content.length;
  }
  
  if (selected.length === 0) return "";
  return `\n\n---\n\n## مستندات ذات صلة من ملفات المستخدم (نتائج البحث بالتشابه النصي):\n\n${
    selected.map(d => `### ملف: ${d.file_name}\n${d.content}`).join("\n\n---\n\n")
  }`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication before any AI call (prevents credit drain)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser } } = await userClient.auth.getUser();
    if (!authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, model, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract the latest user query for similarity search
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user");
    const searchQuery = lastUserMessage?.content?.slice(0, 500) || "";

    // Try to get relevant stored documents using similarity search (RLS enforced via userClient)
    let documentsContext = "";
    let ragSources: { file_name: string; relevance: number }[] = [];
    try {
      // --- Conversation-scoped attachments FIRST (RLS: only the caller's own) ---
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof conversationId === "string" && UUID_RE.test(conversationId)) {
        const { data: atts, error: attErr } = await userClient
          .from("message_attachments")
          .select("document_id, messages!inner(conversation_id)")
          .eq("messages.conversation_id", conversationId);
        if (attErr) console.error("attachments query failed:", attErr);
        const ids = [...new Set((atts ?? []).map((a: any) => a.document_id))];
        if (ids.length > 0) {
          const { data: convDocs } = await userClient
            .from("documents")
            .select("file_name, content")
            .in("id", ids)
            .order("created_at", { ascending: false });
          if (convDocs && convDocs.length > 0) {
            documentsContext = buildDocsContext(convDocs);
            ragSources = convDocs.map((d: any) => ({ file_name: d.file_name, relevance: 1 }));
          }
        }
      }

      if (!documentsContext && searchQuery) {
        // --- RAG: Chunked Search (SECURITY INVOKER, scoped via auth.uid()) ---
        try {
          const { data: chunks, error: searchErr } = await userClient.rpc("search_document_chunks", {
            p_query: searchQuery,
            p_limit: 8,
          });

          if (!searchErr && chunks && chunks.length > 0) {
            const sourceMap = new Map<string, number>();
            for (const c of chunks as any[]) {
              const prev = sourceMap.get(c.file_name) || 0;
              if (c.relevance > prev) sourceMap.set(c.file_name, c.relevance);
            }
            ragSources = Array.from(sourceMap.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([name, score]) => ({ file_name: name, relevance: Math.round(score * 100) / 100 }));

            documentsContext = buildDocsContext(
              (chunks as any[]).map((c: any) => ({ file_name: c.file_name, content: c.content }))
            );
          }
        } catch (chunkErr) {
          console.error("Chunk search failed:", chunkErr);
        }

        // Fallback to recent docs if no search results (RLS enforced)
        if (!documentsContext) {
          const { data: fallbackDocs } = await userClient
            .from("documents")
            .select("file_name, content")
            .order("created_at", { ascending: false })
            .limit(3);
          if (fallbackDocs && fallbackDocs.length > 0) {
            documentsContext = buildDocsContext(fallbackDocs);
            ragSources = fallbackDocs.map((d: any) => ({ file_name: d.file_name, relevance: 0 }));
          }
        }
      }
    } catch (docErr) {
      console.error("Error fetching user documents:", docErr);
    }

    const fullSystemPrompt = SYSTEM_PROMPT + documentsContext;

    const isDeepSeek = model?.startsWith("deepseek/");
    const deepSeekModel = isDeepSeek ? model.replace("deepseek/", "") : null;

    let response: Response;

    if (isDeepSeek) {
      const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
      if (!DEEPSEEK_API_KEY) {
        return new Response(JSON.stringify({ error: "مفتاح DeepSeek API غير مُعدّ" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: deepSeekModel,
          messages: [
            { role: "system", content: fullSystemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      });
    } else {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: fullSystemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI error [${isDeepSeek ? "DeepSeek" : "Gateway"}]: status=${response.status}, body=${errorText}`);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد الأقصى للطلبات، يرجى المحاولة لاحقاً." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        const msg = isDeepSeek ? "رصيد حساب DeepSeek غير كافٍ، يرجى شحن الرصيد." : "يرجى إضافة رصيد للمحفظة.";
        return new Response(JSON.stringify({ error: msg }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `خطأ في الاتصال بالذكاء الاصطناعي (${response.status})` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a new readable stream that prepends sources metadata
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Write sources event first, then pipe the AI stream
    (async () => {
      try {
        if (ragSources.length > 0) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ sources: ragSources })}\n\n`));
        }
        const reader = response.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});