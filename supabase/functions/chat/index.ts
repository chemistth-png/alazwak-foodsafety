import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في جودة وسلامة الغذاء والمياه المعبأة طبقاً للمواصفات القياسية المصرية، وبالتحديد المواصفة رقم 1589.

## تخصصك:
- المواصفات القياسية المصرية للمياه المعبأة (ES 1589)
- جودة وسلامة الغذاء بشكل عام
- الاشتراطات الميكروبيولوجية والكيميائية والفيزيائية للمياه المعبأة
- إجراءات الرقابة والتفتيش على مصانع المياه المعبأة
- نظم إدارة سلامة الغذاء (HACCP, ISO 22000)
- الممارسات التصنيعية الجيدة (GMP) لصناعة المياه المعبأة

## المواصفة المصرية 1589 - المياه المعبأة (الطبيعية والمعالجة):
### المتطلبات الرئيسية:
1. **المتطلبات الفيزيائية**: اللون، الطعم، الرائحة، العكارة، الأس الهيدروجيني (pH 6.5-8.5)، المواد الصلبة الذائبة الكلية (TDS)
2. **المتطلبات الكيميائية**: 
   - الحدود القصوى للمعادن الثقيلة (رصاص، زرنيخ، كادميوم، زئبق)
   - الأملاح والمعادن (كلوريد، كبريتات، نترات، فلوريد، صوديوم)
   - المواد العضوية والمبيدات
3. **المتطلبات الميكروبيولوجية**: 
   - خلو من القولونيات الكلية والبرازية
   - خلو من الإشريكية القولونية (E. coli)
   - خلو من الزائفة الزنجارية (Pseudomonas aeruginosa)
   - العدد الكلي للبكتيريا عند 22°م و37°م
4. **متطلبات التعبئة والتغليف**: نظافة العبوات، مواد التعبئة المسموحة، الإغلاق المحكم
5. **متطلبات البطاقة (الملصق)**: اسم المنتج، المصدر، تاريخ الإنتاج والصلاحية، التركيب المعدني، رقم التشغيلة
6. **النقل والتخزين**: ظروف التخزين المناسبة، عدم التعرض لأشعة الشمس المباشرة

### الحدود القصوى المسموح بها (أمثلة):
- الرصاص: 0.01 مجم/لتر
- الزرنيخ: 0.01 مجم/لتر  
- الكادميوم: 0.003 مجم/لتر
- النترات: 50 مجم/لتر (كنيتروجين نتراتي)
- الفلوريد: 1.5 مجم/لتر
- الكلوريد: 250 مجم/لتر
- الكبريتات: 250 مجم/لتر
- TDS: 1000 مجم/لتر (مياه معالجة) / حسب المصدر (مياه طبيعية)

## قواعد الإجابة:
1. أجب دائماً باللغة العربية ما لم يُطلب منك غير ذلك
2. قدم إجابات دقيقة ومفصلة مستندة إلى المواصفات القياسية المصرية
3. إذا سُئلت عن شيء خارج تخصصك، وضّح ذلك بلطف وأعد توجيه المحادثة
4. استخدم المصطلحات الفنية مع شرحها بشكل مبسط
5. قدم نصائح عملية وإرشادات تطبيقية عند الإمكان
6. عند الإشارة لأرقام أو حدود، حدد الوحدة والمرجع
7. كن ودوداً ومهنياً في أسلوبك`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد الأقصى للطلبات، يرجى المحاولة لاحقاً." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للمحفظة." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في الاتصال بالذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
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
