import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Droplets, Bot, User, Loader2, Trash2, Menu, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { streamChat, type Msg, type Source } from "@/lib/chat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ChatSidebar from "@/components/ChatSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import FileUpload, { AttachedFileChip } from "@/components/FileUpload";
import ModelSelector from "@/components/ModelSelector";
import VoiceInput from "@/components/VoiceInput";
import ImageGenerator from "@/components/ImageGenerator";
import { logAudit } from "@/lib/auditLog";
import SourcesBadge from "@/components/SourcesBadge";

const SUGGESTED_QUESTIONS = [
  "ما هي اشتراطات هيئة سلامة الغذاء لمصانع الأغذية والمياه المعبأة؟",
  "ما هي الحدود الميكروبية والكيميائية طبقاً لقرارات الهيئة؟",
  "كيف أطبق نظام HACCP في مصنعي؟",
  "ما الفرق بين ISO 9001 و ISO 22000 و FSSC 22000؟",
];

const Index = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; text: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState("google/gemini-3-flash-preview");
  const [messageSources, setMessageSources] = useState<Record<number, Source[]>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const exportPDF = useCallback(async () => {
    if (messages.length === 0) return;
    setIsExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const container = document.createElement("div");
      container.style.direction = "rtl";
      container.style.fontFamily = "Cairo, sans-serif";
      container.style.padding = "24px";
      container.style.maxWidth = "700px";

      container.innerHTML = `
        <h2 style="text-align:center;color:#0ea5e9;margin-bottom:8px;">Alazwak FoodSafety</h2>
        <p style="text-align:center;color:#888;font-size:12px;margin-bottom:24px;">مساعدك الذكي لسلامة الغذاء</p>
        <hr style="border:1px solid #e5e7eb;margin-bottom:16px;" />
        ${messages.map((m) => `
          <div style="margin-bottom:16px;padding:12px;border-radius:12px;background:${m.role === "user" ? "#f0f9ff" : "#f8fafc"};border:1px solid #e5e7eb;">
            <p style="font-size:11px;font-weight:bold;color:${m.role === "user" ? "#0ea5e9" : "#64748b"};margin-bottom:6px;">
              ${m.role === "user" ? "👤 أنت" : "🤖 المساعد"}
            </p>
            <div style="font-size:13px;line-height:1.8;white-space:pre-wrap;">${m.content}</div>
          </div>
        `).join("")}
        <p style="text-align:center;color:#aaa;font-size:10px;margin-top:24px;">تم التصدير بواسطة Alazwak FoodSafety</p>
      `;

      await html2pdf().set({
        margin: 10,
        filename: "محادثة-Alazwak-FoodSafety.pdf",
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(container).save();

      toast.success("تم تصدير المحادثة بنجاح");
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء تصدير المحادثة");
    } finally {
      setIsExporting(false);
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data as Msg[]);
      setConversationId(id);
    }
  }, []);

  const startNew = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  const saveMessage = async (convId: string, role: string, content: string) => {
    await supabase.from("messages").insert({ conversation_id: convId, role, content });
  };

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && attachedFiles.length === 0) return;
    if (isLoading) return;

    // Build message content with files if attached
    let messageContent = trimmed;
    if (attachedFiles.length > 0) {
      const filesContent = attachedFiles
        .map((f, i) => `[ملف مرفق ${i + 1}: ${f.name}]\n\nمحتوى الملف:\n${f.text}`)
        .join("\n\n---\n\n");
      messageContent = `${filesContent}${trimmed ? `\n\nسؤال المستخدم: ${trimmed}` : "\n\nقم بتحليل محتوى هذه الملفات وتلخيصها."}`;
    }

    const displayContent = attachedFiles.length > 0
      ? `📎 ${attachedFiles.map(f => f.name).join("، ")}${trimmed ? `\n${trimmed}` : ""}`
      : trimmed;

    const userMsg: Msg = { role: "user", content: displayContent };
    const aiMsg: Msg = { role: "user", content: messageContent };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);

    let convId = conversationId;

    // Create conversation if new
    if (!convId) {
      const titleText = trimmed || (attachedFiles.length > 0 ? attachedFiles[0].name : "محادثة جديدة");
      const title = titleText.length > 50 ? titleText.slice(0, 50) + "..." : titleText;
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user!.id, title })
        .select("id")
        .single();
      if (data) {
        convId = data.id;
        setConversationId(convId);
      }
    } else {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
    }

    if (convId) await saveMessage(convId, "user", displayContent);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      // Get auth token for document context
      const { data: { session } } = await supabase.auth.getSession();
      
      await streamChat({
        messages: [...messages, aiMsg],
        onDelta: upsertAssistant,
        authToken: session?.access_token,
        model: selectedModel,
        onSources: (sources) => {
          setMessages((prev) => {
            const assistantIdx = prev.length - (prev[prev.length - 1]?.role === "assistant" ? 1 : 0);
            setMessageSources((old) => ({ ...old, [assistantIdx]: sources }));
            return prev;
          });
        },
        onDone: async () => {
          setIsLoading(false);
          if (convId && assistantSoFar) {
            await saveMessage(convId, "assistant", assistantSoFar);
          }
        },
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "حدث خطأ أثناء الاتصال");
      setIsLoading(false);
    }
  }, [messages, isLoading, conversationId, user, attachedFiles, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = async () => {
    if (conversationId) {
      logAudit({ action: "clear_chat", entity_type: "conversation", entity_id: conversationId });
      await supabase.from("conversations").delete().eq("id", conversationId);
    }
    startNew();
  };

  return (
    <div dir="rtl" className="flex h-full bg-background overflow-hidden">
      {/* Chat history sidebar - always visible on desktop */}
      <div className="hidden md:block">
        <ChatSidebar
          currentId={conversationId}
          onSelect={loadConversation}
          onNew={startNew}
          open={true}
          onClose={() => {}}
        />
      </div>
      {/* Mobile sidebar */}
      <div className="md:hidden">
        <ChatSidebar
          currentId={conversationId}
          onSelect={loadConversation}
          onNew={startNew}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">
                Alazwak FoodSafety
              </h1>
              <p className="text-xs text-muted-foreground">
                مساعدك الذكي لسلامة الغذاء
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ModelSelector value={selectedModel} onChange={setSelectedModel} disabled={isLoading} />
            <ImageGenerator />
            <ThemeToggle />
            {messages.length > 0 && (
              <>
                <Button variant="ghost" size="icon" onClick={exportPDF} title="تصدير كـ PDF" disabled={isExporting}>
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={clearChat} title="مسح المحادثة">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-6">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-accent">
                <Droplets className="w-10 h-10 text-accent-foreground" />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h2 className="text-xl font-bold text-foreground">مرحباً بك في Alazwak FoodSafety! 👋</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  مساعدك الذكي المتخصص في جودة وسلامة الغذاء. اسألني أي سؤال!
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-start text-sm rounded-xl border border-border bg-card p-3 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="w-8 h-8 shrink-0 mt-1">
                    <AvatarFallback
                      className={
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground text-xs"
                          : "bg-secondary text-secondary-foreground text-xs"
                      }
                    >
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tl-sm"
                        : "bg-muted text-foreground rounded-tr-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <>
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {messageSources[i] && <SourcesBadge sources={messageSources[i]} />}
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-2.5">
                  <Avatar className="w-8 h-8 shrink-0 mt-1">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-tr-sm bg-muted px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-card p-3 pb-[calc(0.75rem+3.5rem)] md:pb-3">
          <div className="max-w-3xl mx-auto">
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachedFiles.map((f, i) => (
                  <AttachedFileChip
                    key={i}
                    fileName={f.name}
                    onRemove={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <FileUpload
                onFileProcessed={(name, text) => setAttachedFiles(prev => [...prev, { name, text }])}
                disabled={isLoading || attachedFiles.length >= 10}
              />
              <VoiceInput
                onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
                disabled={isLoading}
              />
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachedFiles.length > 0 ? "اكتب سؤالك عن الملفات أو اضغط إرسال..." : "اكتب سؤالك هنا..."}
                className="min-h-[44px] max-h-32 resize-none rounded-xl text-sm"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="rounded-xl shrink-0 h-11 w-11"
                onClick={() => send(input)}
                disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
              >
                <Send className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
