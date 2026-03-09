import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOP_FORMAT = `
## تعليمات التنسيق الإلزامية:
أنت تكتب وثائق رسمية لنظام إدارة الجودة وسلامة الغذاء. التزم بالآتي:

### هيكل الوثيقة (إلزامي) - مطابق لمعيار ISO 22000 / ISO 9001:
كل وثيقة يجب أن تبدأ بجدول معلومات الوثيقة:

| البيان | التفاصيل |
|--------|----------|
| كود الوثيقة | (اكتب كود مناسب مثل FSP-XX أو QP-XX) |
| عنوان الوثيقة | (عنوان الوثيقة) |
| رقم المراجعة | 00 |
| تاريخ الإصدار | (التاريخ الحالي) |
| الإعداد | قسم توكيد الجودة |
| المراجعة | المدير العام |
| الاعتماد | رئيس مجلس الإدارة |

ثم تتضمن الأقسام التالية بالترتيب:

**1- الغرض (Purpose)**
1-1 وصف واضح لهدف الوثيقة/الإجراء.

**2- نطاق التطبيق (Scope)**
2-1 حدود تطبيق الوثيقة ومتى يتم تفعيلها.
2-2 تفاصيل إضافية عن النطاق.

**3- التعريفات (Definitions)**
3-1 تعريف كل مصطلح فني مستخدم في الوثيقة.

**4- المراجع (References)**
4-1 المواصفات والمعايير المرجعية (ISO 22000:2018, ISO 9001:2015, المواصفة المصرية 1589، Codex Alimentarius، متطلبات NFSA).

**5- المسؤوليات (Responsibilities)**
5-1 تحديد المسؤول عن كل نشاط بالتفصيل (من يُعد، من يُراجع، من يعتمد، من ينفذ).

**6- الإجراءات (Procedures)**
6-1 الخطوات التفصيلية مرقمة ترقيماً تسلسلياً (6-1، 6-2، 6-2-1، 6-2-2...).
كل خطوة تصف (من - ماذا - متى - أين - كيف).

**7- السجلات (Records)**
جدول بالسجلات المطلوبة:
| م | اسم السجل/النموذج | الكود | المسؤول عن الحفظ | مدة الحفظ |
|---|-------------------|-------|------------------|-----------|

**8- معايير قياس فاعلية الأداء (Performance Criteria)**
مؤشرات KPI ونسب الأداء المقبولة لقياس فعالية الإجراء.

### قواعد الكتابة:
- استخدم اللغة العربية الفصحى الرسمية فقط (لا عامية مطلقاً)
- استخدم صيغة المبني للمجهول (يتم، يُعد، يُراجع، يُعتمد، يُحفظ)
- رقّم الأقسام الفرعية بنظام (1-1، 1-2، 6-1-1، 6-1-2...)
- استخدم جداول Markdown للبيانات المنظمة (المواد الكيميائية، السجلات، الترددات)
- استخدم **نص عريض** للمصطلحات الفنية والكلمات المفتاحية
- لا تستخدم JSON أبداً
- اكتب بأسلوب رسمي مطابق لوثائق ISO المعتمدة
- كل إجراء يجب أن يكون قابلاً للتطبيق والمراجعة مباشرة
`;

const AGENT_PROMPTS: Record<string, string> = {
  cleaning_plan: `أنت مستشار متخصص في أنظمة الجودة وسلامة الغذاء ومعتمد كمراجع ISO 22000 و FSSC 22000.
قم بإعداد إجراء التنظيف والتعقيم والتطهير وفقاً لمتطلبات ISO 22000:2018 البند 8.2 (برامج المتطلبات الأساسية).

يجب أن يتضمن الإجراء:
- جداول التنظيف (يومي/أسبوعي/شهري/سنوي) لكل منطقة ومعدة
- المواد الكيميائية المعتمدة والتركيزات ودرجات الحرارة وأزمنة التلامس
- إجراءات CIP و COP التفصيلية
- طرق التحقق (ATP، المسحات الميكروبيولوجية، الفحص البصري)
- معايير القبول والرفض
- الإجراءات التصحيحية عند عدم المطابقة
- النماذج والسجلات المطلوبة
${SOP_FORMAT}`,

  training_plan: `أنت مستشار متخصص في أنظمة الجودة وسلامة الغذاء ومعتمد كمراجع ISO 22000 و FSSC 22000.
قم بإعداد إجراء التدريب وتقييم الكفاءة وفقاً لمتطلبات ISO 22000:2018 البند 7.2 (الكفاءة).

يجب أن يتضمن الإجراء:
- مصفوفة التدريب (Training Matrix) حسب الوظائف والكفاءات
- البرنامج التدريبي السنوي (GMP, GHP, HACCP, سلامة الغذاء)
- متطلبات الكفاءة لكل وظيفة
- آليات تقييم فعالية التدريب
- خطة التدريب التأسيسي للموظفين الجدد
- النماذج والسجلات المطلوبة
${SOP_FORMAT}`,

  risk_assessment: `أنت مستشار متخصص في أنظمة الجودة وسلامة الغذاء ومعتمد كمراجع ISO 22000 و FSSC 22000.
قم بإعداد إجراء تحليل المخاطر وتقييمها وفقاً لمتطلبات ISO 22000:2018 البند 8.5.2 (تحليل المخاطر).

يجب أن يتضمن الإجراء:
- منهجية تحديد المخاطر (فيزيائية، كيميائية، بيولوجية، مسببات الحساسية)
- مصفوفة تقييم المخاطر (الاحتمالية × الشدة × إمكانية الكشف)
- تحديد نقاط التحكم الحرجة (CCPs) والحدود الحرجة
- برنامج المتطلبات الأساسية التشغيلية (OPRPs)
- خطة المراقبة لكل CCP و OPRP
- الإجراءات التصحيحية
- إجراءات التحقق والمصادقة
- النماذج والسجلات المطلوبة
${SOP_FORMAT}`,

  water_monitoring: `أنت مستشار متخصص في أنظمة الجودة وسلامة الغذاء ومعتمد كمراجع ISO 22000 و FSSC 22000.
قم بإعداد إجراء مراقبة ومتابعة جودة المياه وفقاً للمواصفة القياسية المصرية 1589 ومتطلبات ISO 22000:2018.

يجب أن يتضمن الإجراء:
- نقاط المراقبة في خطوط الإنتاج (من المصدر إلى المنتج النهائي)
- المعايير الفيزيائية والكيميائية والميكروبيولوجية المطلوبة طبقاً للمواصفة 1589
- الحدود المقبولة لكل معيار (pH, TDS, عكارة، كلور متبقي، إلخ)
- تكرار القياس والمسؤول عن التنفيذ
- الإجراءات التصحيحية عند الانحراف عن الحدود
- جدول الصيانة الوقائية لمعدات المعالجة
- النماذج والسجلات المطلوبة
${SOP_FORMAT}`,

  performance_eval: `أنت مستشار متخصص في أنظمة الجودة وسلامة الغذاء ومعتمد كمراجع ISO 22000 و FSSC 22000.
قم بإعداد إجراء تقييم الأداء ومراجعة الإدارة وفقاً لمتطلبات ISO 22000:2018 البند 9 (تقييم الأداء).

يجب أن يتضمن الإجراء:
- مؤشرات الأداء الرئيسية (KPIs) لنظام إدارة سلامة الغذاء
- منهجية القياس والمتابعة
- تقييم أداء العاملين وفقاً لمعايير الكفاءة
- آلية مراجعة الإدارة (مدخلات ومخرجات)
- خطط التحسين المستمر
- النماذج والسجلات المطلوبة
${SOP_FORMAT}`,

  haccp: `أنت مستشار متخصص في أنظمة الجودة وسلامة الغذاء ومعتمد كمراجع ISO 22000 و FSSC 22000.
قم بإعداد خطة HACCP كاملة لمصنع مياه معبأة وفقاً لمتطلبات Codex Alimentarius و ISO 22000:2018 البند 8.5.

يجب أن تتضمن الخطة الخطوات الاثنتي عشرة:
1. تشكيل فريق سلامة الغذاء (أسماء، مؤهلات، مسؤوليات)
2. وصف المنتج (الخصائص الفيزيائية والكيميائية والميكروبيولوجية)
3. تحديد الاستخدام المقصود والفئة المستهدفة
4. رسم مخطط التدفق (من المصدر إلى التوزيع)
5. التحقق الميداني من مخطط التدفق
6. تحليل المخاطر في كل مرحلة
7. تحديد نقاط التحكم الحرجة (CCPs)
8. وضع الحدود الحرجة لكل CCP
9. نظام المراقبة (ماذا، كيف، متى، من)
10. الإجراءات التصحيحية
11. إجراءات التحقق
12. نظام التوثيق والسجلات
${SOP_FORMAT}`,

  general: `أنت مستشار متخصص في أنظمة إدارة الجودة وسلامة الغذاء، معتمد كمراجع ISO 22000 و ISO 9001 و FSSC 22000.
ساعد مدير الجودة في إعداد الوثيقة المطلوبة بأسلوب رسمي واحترافي.
${SOP_FORMAT}`,
};

console.log("smart-agent function initialized");
serve(async (req) => {
  console.log("smart-agent received request:", req.method);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, type, title, description, feedback, action } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    if (action === "generate") {
      let currentTaskId = taskId;
      if (!currentTaskId) {
        const { data: newTask, error: insertErr } = await supabase
          .from("agent_tasks")
          .insert({
            user_id: user.id,
            type: type || "general",
            title: title || "مهمة جديدة",
            description: description || "",
            status: "generating",
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        currentTaskId = newTask.id;
      } else {
        await supabase.from("agent_tasks").update({ status: "generating" }).eq("id", currentTaskId);
      }

      const systemPrompt = AGENT_PROMPTS[type] || AGENT_PROMPTS.general;
      const userPrompt = `عنوان الوثيقة: ${title}\n\n${description ? `تفاصيل إضافية: ${description}` : ""}${feedback ? `\n\nملاحظات للتعديل:\n${feedback}` : ""}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI error:", response.status, errText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "تم تجاوز الحد الأقصى للطلبات، يُرجى المحاولة لاحقاً" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "يُرجى إضافة رصيد للمحفظة" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        throw new Error("AI gateway error");
      }

      const aiResult = await response.json();
      const aiOutput = aiResult.choices?.[0]?.message?.content || "";

      await supabase.from("agent_tasks").update({
        ai_output: aiOutput,
        status: "review",
        updated_at: new Date().toISOString(),
      }).eq("id", currentTaskId);

      return new Response(JSON.stringify({ taskId: currentTaskId, status: "review", output: aiOutput }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      await supabase.from("agent_tasks").update({
        status: "approved",
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);

      return new Response(JSON.stringify({ taskId, status: "approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "revise") {
      await supabase.from("agent_tasks").update({
        status: "revision",
        user_feedback: feedback || "",
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);

      const { data: task } = await supabase.from("agent_tasks").select("*").eq("id", taskId).single();
      if (!task) throw new Error("Task not found");

      const systemPrompt = AGENT_PROMPTS[task.type] || AGENT_PROMPTS.general;
      const revisionInstruction = `\n\n## تعليمات التعديل:
قم بتعديل الوثيقة السابقة بناءً على ملاحظات المستخدم أدناه.
- حافظ على نفس الهيكل والتنسيق الرسمي
- طبّق التعديلات المطلوبة فقط دون تغيير الأجزاء الصحيحة
- أعد الوثيقة كاملة بعد التعديل`;

      const userPrompt = `عنوان الوثيقة: ${task.title}\n\n${task.description ? `التفاصيل: ${task.description}` : ""}\n\nالوثيقة السابقة:\n${task.ai_output}\n\nملاحظات التعديل المطلوبة:\n${feedback}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt + revisionInstruction },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      });

      if (!response.ok) throw new Error("AI revision error");
      const aiResult = await response.json();
      const aiOutput = aiResult.choices?.[0]?.message?.content || "";

      await supabase.from("agent_tasks").update({
        ai_output: aiOutput,
        status: "review",
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);

      return new Response(JSON.stringify({ taskId, status: "review", output: aiOutput }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (e) {
    console.error("smart-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
