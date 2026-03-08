import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Droplets, Bot, User, Loader2, Trash2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { streamChat, type Msg } from "@/lib/chat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ChatSidebar from "@/components/ChatSidebar";
import ThemeToggle from "@/components/ThemeToggle";

const SUGGESTED_QUESTIONS = [
  "ما هي اشتراطات هيئة سلامة الغذاء لمصانع المياه المعبأة؟",
  "ما هي الحدود الميكروبية والكيميائية طبقاً لقرارات الهيئة؟",
  "ما هي مراحل معالجة المياه ووسائل التعقيم المسموحة؟",
  "ما الفرق بين ISO 9001 و ISO 22000 و FSSC 22000؟",
];

const Index = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
    if (!trimmed || isLoading) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let convId = conversationId;

    // Create conversation if new
    if (!convId) {
      const title = trimmed.length > 50 ? trimmed.slice(0, 50) + "..." : trimmed;
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

    if (convId) await saveMessage(convId, "user", trimmed);

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
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsertAssistant,
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
  }, [messages, isLoading, conversationId, user]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = async () => {
    if (conversationId) {
      await supabase.from("conversations").delete().eq("id", conversationId);
    }
    startNew();
  };

  return (
    <div dir="rtl" className="flex h-screen bg-background">
      <ChatSidebar
        currentId={conversationId}
        onSelect={loadConversation}
        onNew={startNew}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

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
                مساعد جودة المياه المعبأة
              </h1>
              <p className="text-xs text-muted-foreground">
                المواصفة القياسية المصرية 1589
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearChat} title="مسح المحادثة">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-6">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-accent">
                <Droplets className="w-10 h-10 text-accent-foreground" />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h2 className="text-xl font-bold text-foreground">مرحباً بك! 👋</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  أنا مساعدك المتخصص في جودة وسلامة المياه المعبأة طبقاً للمواصفة المصرية 1589. اسألني أي سؤال!
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
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
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
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-card p-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك هنا..."
              className="min-h-[44px] max-h-32 resize-none rounded-xl text-sm"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="rounded-xl shrink-0 h-11 w-11"
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4 rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
