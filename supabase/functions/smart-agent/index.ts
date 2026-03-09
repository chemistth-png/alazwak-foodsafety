import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_PROMPTS: Record<string, string> = {
  cleaning_plan: `أنت خبير متخصص في خطط التنظيف والتعقيم والتطهير لمصانع المياه المعبأة وصناعة الغذاء.
قم بإنشاء خطة تنظيف وتعقيم شاملة تتضمن:
1. جدول التنظيف اليومي/الأسبوعي/الشهري/السنوي
2. المعدات والأسطح المطلوب تنظيفها
3. المواد الكيميائية المستخدمة والتركيزات
4. طريقة التنظيف (CIP/COP) لكل منطقة
5. زمن التلامس ودرجة الحرارة
6. إجراءات الشطف والتعقيم النهائي
7. معايير القبول والتحقق (ATP, Swab tests)
8. المسؤولين عن التنفيذ والمراجعة
9. النماذج والسجلات المطلوبة
أجب بتنسيق JSON منظم.`,

  training_plan: `أنت خبير في تخطيط التدريب وتقييم الأداء في مجال سلامة الغذاء والمياه المعبأة.
قم بإنشاء خطة تدريب سنوية شاملة تتضمن:
1. مصفوفة التدريب (Training Matrix) حسب الوظائف
2. الدورات التدريبية المطلوبة (GMP, GHP, HACCP, Food Safety)
3. جدول زمني للتدريب (شهري/ربع سنوي)
4. أهداف التدريب ومؤشرات الأداء (KPIs)
5. طرق تقييم فعالية التدريب
6. نموذج تقييم أداء العاملين
7. خطة التدريب التأسيسي للموظفين الجدد
8. سجلات التدريب المطلوبة
أجب بتنسيق JSON منظم.`,

  risk_assessment: `أنت خبير في تقييم المخاطر وتحليل HACCP لمصانع المياه المعبأة.
قم بإنشاء تقييم مخاطر شامل يتضمن:
1. تحديد المخاطر (فيزيائية، كيميائية، بيولوجية)
2. مصفوفة تقييم المخاطر (الاحتمالية × الشدة)
3. نقاط التحكم الحرجة (CCPs) والحدود الحرجة
4. إجراءات المراقبة لكل CCP
5. الإجراءات التصحيحية
6. إجراءات التحقق
7. خطة HACCP كاملة
8. برنامج المتطلبات الأساسية (PRPs)
أجب بتنسيق JSON منظم.`,

  water_monitoring: `أنت خبير في مراقبة ومتابعة معالجة المياه المعبأة.
قم بإنشاء نظام متابعة شامل يتضمن:
1. نقاط المراقبة في خط الإنتاج
2. المعايير المطلوب قياسها في كل نقطة (pH, TDS, Turbidity, Chlorine, etc.)
3. الحدود المقبولة لكل معيار طبقاً للمواصفة المصرية 1589
4. تكرار القياس (مستمر/يومي/أسبوعي)
5. إجراءات التعامل مع الانحرافات
6. نموذج السجل اليومي
7. مؤشرات الأداء الرئيسية
8. جدول الصيانة الوقائية للمعدات
أجب بتنسيق JSON منظم.`,

  performance_eval: `أنت خبير في تقييم الأداء وإدارة الموارد البشرية في مجال سلامة الغذاء.
قم بإنشاء نظام تقييم أداء شامل يتضمن:
1. معايير التقييم حسب الوظيفة
2. مؤشرات الأداء الرئيسية (KPIs)
3. نموذج التقييم الدوري (ربع سنوي/سنوي)
4. خطة التطوير الفردية
5. نظام المكافآت والحوافز
6. إجراءات التعامل مع ضعف الأداء
7. متطلبات الكفاءة لكل وظيفة
أجب بتنسيق JSON منظم.`,

  haccp: `أنت خبير في تطبيق نظام HACCP لمصانع المياه المعبأة.
قم بإنشاء خطة HACCP كاملة تتضمن الخطوات الـ12:
1. تشكيل فريق HACCP
2. وصف المنتج
3. تحديد الاستخدام المقصود
4. رسم مخطط التدفق
5. التحقق الميداني
6. تحليل المخاطر
7. تحديد نقاط التحكم الحرجة
8. وضع الحدود الحرجة
9. نظام المراقبة
10. الإجراءات التصحيحية
11. إجراءات التحقق
12. التوثيق والسجلات
أجب بتنسيق JSON منظم.`,

  general: `أنت وكيل ذكي متخصص في إدارة الجودة وسلامة الغذاء لمصانع المياه المعبأة.
ساعد مدير الجودة في أي مهمة يطلبها. قدم إجابات مفصلة وعملية.
أجب بتنسيق JSON منظم إذا كان المطلوب خطة أو نموذج.`,
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

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Action: create new task and generate
    if (action === "generate") {
      // Create or update task
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

      // Build prompt
      const systemPrompt = AGENT_PROMPTS[type] || AGENT_PROMPTS.general;
      const userPrompt = `${title}\n\n${description || ""}${feedback ? `\n\nملاحظات المستخدم للتعديل:\n${feedback}` : ""}`;

      // Call AI (non-streaming for structured output)
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
          return new Response(JSON.stringify({ error: "تم تجاوز الحد الأقصى للطلبات" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للمحفظة" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        throw new Error("AI gateway error");
      }

      const aiResult = await response.json();
      const aiOutput = aiResult.choices?.[0]?.message?.content || "";

      // Update task with AI output, set to review
      await supabase.from("agent_tasks").update({
        ai_output: aiOutput,
        status: "review",
        updated_at: new Date().toISOString(),
      }).eq("id", currentTaskId);

      return new Response(JSON.stringify({ taskId: currentTaskId, status: "review", output: aiOutput }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: approve task
    if (action === "approve") {
      await supabase.from("agent_tasks").update({
        status: "approved",
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);

      return new Response(JSON.stringify({ taskId, status: "approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: request revision
    if (action === "revise") {
      await supabase.from("agent_tasks").update({
        status: "revision",
        user_feedback: feedback || "",
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);

      // Re-generate with feedback
      const { data: task } = await supabase.from("agent_tasks").select("*").eq("id", taskId).single();
      if (!task) throw new Error("Task not found");

      const systemPrompt = AGENT_PROMPTS[task.type] || AGENT_PROMPTS.general;
      const userPrompt = `${task.title}\n\n${task.description || ""}\n\nالمخرج السابق:\n${task.ai_output}\n\nملاحظات المستخدم للتعديل:\n${feedback}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt + "\n\nقم بتعديل المخرج السابق بناءً على ملاحظات المستخدم. حافظ على التنسيق والهيكل." },
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
