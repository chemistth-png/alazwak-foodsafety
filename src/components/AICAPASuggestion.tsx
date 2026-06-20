import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AICAPASuggestionProps {
  reportId: string;
  reportNumber: string;
  title: string;
  description: string;
  onAccept?: (suggestion: string) => void;
}

const AI_SYSTEM_PROMPT = `أنت خبير جودة رائد في الصناعات الغذائية والمشروبات. بناءً على حالة عدم المطابقة التالية، اقترح:
1. إجراء تصحيحي فوري.
2. تحليل السبب الجذري المحتمل.
3. إجراء وقائي لمنع التكرار.
اكتب الرد بنقاط واضحة، مهنية، ومختصرة باللغة العربية.`;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function AICAPASuggestion({
  reportId,
  reportNumber,
  title,
  description,
  onAccept,
}: AICAPASuggestionProps) {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const generateSuggestion = async () => {
    setLoading(true);
    setSuggestion("");
    setAccepted(false);

    const userMessage = `عنوان حالة عدم المطابقة: ${title}\n\nالوصف: ${description || "لا يوجد وصف إضافي"}`;

    const messages = [
      { role: "user" as const, content: userMessage },
    ];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      };

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages,
          model: "google/gemini-3-flash-preview",
          systemPrompt: AI_SYSTEM_PROMPT,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("فشل الاتصال بالذكاء الاصطناعي");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.sources) continue;
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setSuggestion(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Process remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.sources) continue;
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setSuggestion(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      if (!fullText) {
        toast.error("لم يتم الحصول على اقتراح من الذكاء الاصطناعي");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!suggestion) return;

    const { error } = await supabase
      .from("nc_reports")
      .update({ corrective_action: suggestion })
      .eq("id", reportId);

    if (error) {
      toast.error("فشل حفظ الاقتراح");
      return;
    }

    setAccepted(true);
    toast.success("تم حفظ الإجراء التصحيحي بنجاح");
    onAccept?.(suggestion);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion);
    toast.success("تم نسخ الاقتراح");
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={generateSuggestion}
        disabled={loading}
        className="w-full gap-2 bg-gradient-to-l from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري التحليل...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            ✨ اقتراح إجراء تصحيحي بالذكاء الاصطناعي
          </>
        )}
      </Button>

      {suggestion && (
        <div className="rounded-xl border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              اقتراح الذكاء الاصطناعي
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap bg-background rounded-lg p-3 border max-h-[300px] overflow-y-auto">
            {suggestion}
          </div>

          {!accepted && (
            <Button
              onClick={handleAccept}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4" />
              قبول وحفظ الاقتراح
            </Button>
          )}

          {accepted && (
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium py-2">
              <Check className="w-4 h-4" />
              تم حفظ الإجراء التصحيحي بنجاح
            </div>
          )}
        </div>
      )}
    </div>
  );
}
