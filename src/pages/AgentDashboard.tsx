import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Bot, ArrowRight, Loader2, CheckCircle2, Edit3, Trash2, Plus, 
  Sparkles, ClipboardCheck, GraduationCap, ShieldAlert, Droplets,
  BarChart3, FileText, ChevronRight, Clock, AlertTriangle, Menu,
  Download, FileSpreadsheet, FileType
} from "lucide-react";
import { exportToWord, exportToExcel } from "@/lib/exportAgent";
import { logAudit } from "@/lib/auditLog";
import ThemeToggle from "@/components/ThemeToggle";

interface AgentTask {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  ai_output: string;
  user_feedback: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

const TASK_TYPES = [
  { id: "cleaning_plan", label: "خطة تنظيف وتعقيم", icon: Sparkles, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { id: "training_plan", label: "خطة تدريب", icon: GraduationCap, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { id: "risk_assessment", label: "تقييم مخاطر", icon: ShieldAlert, color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { id: "water_monitoring", label: "متابعة معالجة المياه", icon: Droplets, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  { id: "performance_eval", label: "تقييم أداء", icon: BarChart3, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { id: "haccp", label: "خطة HACCP", icon: ClipboardCheck, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { id: "general", label: "مهمة عامة", icon: FileText, color: "bg-muted text-muted-foreground" },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد الانتظار", variant: "outline" },
  generating: { label: "جاري الإنشاء...", variant: "secondary" },
  review: { label: "بانتظار المراجعة", variant: "default" },
  approved: { label: "تمت الموافقة", variant: "secondary" },
  revision: { label: "جاري التعديل...", variant: "secondary" },
  completed: { label: "مكتمل", variant: "outline" },
};

const AgentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newType, setNewType] = useState("cleaning_plan");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [agentSpeed, setAgentSpeed] = useState<"fast" | "accurate">("fast");
  const [feedback, setFeedback] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from("agent_tasks")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setTasks(data as unknown as AgentTask[]);
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const callAgent = async (body: Record<string, any>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "خطأ غير معروف" }));
      throw new Error(err.error || "فشل الاتصال بالوكيل الذكي");
    }
    return res.json();
  };

  const handleGenerate = async () => {
    if (!newTitle.trim()) { toast.error("يرجى إدخال عنوان المهمة"); return; }
    setIsGenerating(true);
    try {
      const result = await callAgent({
        action: "generate",
        type: newType,
        title: newTitle,
        description: newDesc,
        model: agentSpeed === "accurate" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash-lite",
      });
      toast.success("تم إنشاء المهمة بنجاح! بانتظار مراجعتك.");
      setShowNewTask(false);
      setNewTitle("");
      setNewDesc("");
      await loadTasks();
      // Select the new task
      const { data } = await supabase.from("agent_tasks").select("*").eq("id", result.taskId).single();
      if (data) { setSelectedTask(data as unknown as AgentTask); setMobileView("detail"); }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTask) return;
    setIsGenerating(true);
    try {
      await callAgent({ action: "approve", taskId: selectedTask.id });
      logAudit({ action: "approve_task", entity_type: "agent_task", entity_id: selectedTask.id, entity_title: selectedTask.title });
      toast.success("تمت الموافقة على المهمة ✅");
      await loadTasks();
      setSelectedTask({ ...selectedTask, status: "approved" });
    } catch (e: any) { toast.error(e.message); }
    finally { setIsGenerating(false); }
  };

  const handleRevise = async () => {
    if (!selectedTask || !feedback.trim()) { toast.error("يرجى كتابة ملاحظات التعديل"); return; }
    setIsGenerating(true);
    try {
      const result = await callAgent({
        action: "revise",
        taskId: selectedTask.id,
        feedback,
      });
      toast.success("تم إعادة إنشاء المهمة بناءً على ملاحظاتك");
      logAudit({ action: "revise_task", entity_type: "agent_task", entity_id: selectedTask.id, entity_title: selectedTask.title, details: { feedback } });
      setFeedback("");
      await loadTasks();
      const { data } = await supabase.from("agent_tasks").select("*").eq("id", selectedTask.id).single();
      if (data) setSelectedTask(data as unknown as AgentTask);
    } catch (e: any) { toast.error(e.message); }
    finally { setIsGenerating(false); }
  };

  const handleDelete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    await supabase.from("agent_tasks").delete().eq("id", id);
    logAudit({ action: "delete_task", entity_type: "agent_task", entity_id: id, entity_title: task?.title });
    if (selectedTask?.id === id) { setSelectedTask(null); setMobileView("list"); }
    toast.success("تم حذف المهمة");
    loadTasks();
  };

  const getTypeInfo = (type: string) => TASK_TYPES.find(t => t.id === type) || TASK_TYPES[6];

  const reviewTasks = tasks.filter(t => t.status === "review");
  const otherTasks = tasks.filter(t => t.status !== "review");

  return (
    <div dir="rtl" className="flex h-screen bg-background">
      {/* Sidebar / Task List */}
      <aside className={`${mobileView === "list" ? "flex" : "hidden"} md:flex flex-col w-full md:w-80 lg:w-96 border-l bg-card`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">الوكيل الذكي</h1>
              <p className="text-[10px] text-muted-foreground">مدير الجودة المساعد</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} title="العودة للمحادثة">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-b">
          <Button className="w-full gap-2" onClick={() => { setSelectedTask(null); setShowNewTask(true); setMobileView("detail"); }}>
            <Plus className="w-4 h-4" /> مهمة جديدة
          </Button>
        </div>

        {/* Task List */}
        <ScrollArea className="flex-1">
          {reviewTasks.length > 0 && (
            <div className="p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> بانتظار مراجعتك ({reviewTasks.length})
              </p>
              <div className="space-y-1.5">
                {reviewTasks.map(task => {
                  const info = getTypeInfo(task.type);
                  const Icon = info.icon;
                  return (
                    <button
                      key={task.id}
                      onClick={() => { setSelectedTask(task); setMobileView("detail"); }}
                      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-right transition-colors group border ${
                        selectedTask?.id === task.id ? "border-primary bg-accent" : "border-transparent hover:bg-muted"
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${info.color}`}><Icon className="w-3.5 h-3.5" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-foreground">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">{info.label}</p>
                      </div>
                      <Badge variant="default" className="text-[10px] shrink-0">مراجعة</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {otherTasks.length > 0 && (
            <div className="p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">جميع المهام</p>
              <div className="space-y-1.5">
                {otherTasks.map(task => {
                  const info = getTypeInfo(task.type);
                  const Icon = info.icon;
                  const st = STATUS_MAP[task.status] || STATUS_MAP.pending;
                  return (
                    <button
                      key={task.id}
                      onClick={() => { setSelectedTask(task); setMobileView("detail"); }}
                      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-right transition-colors group ${
                        selectedTask?.id === task.id ? "bg-accent" : "hover:bg-muted"
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${info.color}`}><Icon className="w-3.5 h-3.5" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-foreground">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(task.updated_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <Badge variant={st.variant} className="text-[10px] shrink-0">{st.label}</Badge>
                      <Trash2
                        className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-destructive shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tasks.length === 0 && !showNewTask && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Bot className="w-10 h-10" />
              <p className="text-sm">لا توجد مهام بعد</p>
              <p className="text-xs">أنشئ مهمة جديدة للبدء</p>
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Main Content Area */}
      <main className={`${mobileView === "detail" ? "flex" : "hidden"} md:flex flex-col flex-1 min-w-0`}>
        {/* New Task Form */}
        {showNewTask ? (
          <div className="flex-1 flex items-start justify-center p-6 pb-[calc(1.5rem+3.5rem)] md:pb-6 overflow-auto">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">مهمة جديدة</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setShowNewTask(false); setMobileView("list"); }}>✕</Button>
                </div>
                <CardDescription>اختر نوع المهمة والوكيل الذكي سيقوم بإنشائها تلقائياً</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">نوع المهمة</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TASK_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setNewType(t.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                            newType === t.id ? "border-primary bg-accent ring-1 ring-primary" : "border-border hover:bg-muted"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="text-xs">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Speed Selection */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">وضع الذكاء الاصطناعي</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAgentSpeed("fast")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm transition-all ${
                        agentSpeed === "fast" ? "border-primary bg-accent ring-1 ring-primary" : "border-border hover:bg-muted"
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-medium">⚡ سريع</span>
                      <span className="text-[10px] text-muted-foreground">استجابة أسرع</span>
                    </button>
                    <button
                      onClick={() => setAgentSpeed("accurate")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm transition-all ${
                        agentSpeed === "accurate" ? "border-primary bg-accent ring-1 ring-primary" : "border-border hover:bg-muted"
                      }`}
                    >
                      <ShieldAlert className="w-5 h-5 text-emerald-500" />
                      <span className="text-xs font-medium">🎯 دقيق</span>
                      <span className="text-[10px] text-muted-foreground">تحليل أعمق وأشمل</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">عنوان المهمة</label>
                  <Input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="مثال: خطة تنظيف خط الإنتاج رقم 1"
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">تفاصيل إضافية (اختياري)</label>
                  <Textarea
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="أي تفاصيل تريد أن يأخذها الوكيل في الاعتبار..."
                    rows={3}
                    disabled={isGenerating}
                  />
                </div>

                <Button className="w-full gap-2" onClick={handleGenerate} disabled={isGenerating || !newTitle.trim()}>
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGenerating ? "جاري الإنشاء..." : "إنشاء بواسطة الوكيل الذكي"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : selectedTask ? (
          /* Task Detail View */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Task Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-card">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileView("list")}>
                <ChevronRight className="w-5 h-5" />
              </Button>
              <div className={`p-2 rounded-lg ${getTypeInfo(selectedTask.type).color}`}>
                {(() => { const Icon = getTypeInfo(selectedTask.type).icon; return <Icon className="w-5 h-5" />; })()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-foreground truncate">{selectedTask.title}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{getTypeInfo(selectedTask.type).label}</span>
                  <span>•</span>
                  <Badge variant={STATUS_MAP[selectedTask.status]?.variant || "outline"} className="text-[10px]">
                    {STATUS_MAP[selectedTask.status]?.label || selectedTask.status}
                  </Badge>
                </div>
              </div>
              {/* Export & Action Buttons */}
              <div className="flex items-center gap-1.5">
                {selectedTask.ai_output && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => exportToWord(selectedTask.title, selectedTask.ai_output)}
                      title="تصدير Word"
                    >
                      <FileType className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Word</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => exportToExcel(selectedTask.title, selectedTask.ai_output)}
                      title="تصدير Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Excel</span>
                    </Button>
                  </>
                )}
                {selectedTask.status === "review" && (
                  <Button size="sm" className="gap-1" onClick={handleApprove} disabled={isGenerating}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> موافقة
                  </Button>
                )}
              </div>
            </div>

            {/* AI Output */}
            <ScrollArea className="flex-1">
              <div className="p-4 max-w-4xl mx-auto">
                {selectedTask.status === "generating" || selectedTask.status === "revision" ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm">الوكيل الذكي يعمل على مهمتك...</p>
                  </div>
                ) : selectedTask.ai_output ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-3 prose-table:my-2">
                    <ReactMarkdown>{selectedTask.ai_output}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                    <FileText className="w-8 h-8" />
                    <p className="text-sm">لا يوجد محتوى بعد</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Feedback / Revision Input */}
            {(selectedTask.status === "review" || selectedTask.status === "approved") && (
              <div className="border-t bg-card p-3 pb-[calc(0.75rem+3.5rem)] md:pb-3">
                <div className="max-w-4xl mx-auto">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> اكتب ملاحظاتك لتعديل المخرج وسيقوم الوكيل بإعادة إنشائه
                  </p>
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="مثال: أضف جدول بمواد التنظيف والتركيزات، عدّل صيغة الخطوات لتكون أكثر تفصيلاً..."
                      className="min-h-[44px] max-h-24 resize-none rounded-xl text-sm"
                      rows={2}
                      disabled={isGenerating}
                    />
                    <Button
                      variant="outline"
                      className="rounded-xl shrink-0 h-11 gap-1.5 px-4"
                      onClick={handleRevise}
                      disabled={isGenerating || !feedback.trim()}
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                      <span className="hidden sm:inline">طلب تعديل</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-accent">
              <Bot className="w-10 h-10 text-accent-foreground" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h2 className="text-xl font-bold text-foreground">الوكيل الذكي لإدارة الجودة 🤖</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                يقوم الوكيل بإنشاء الخطط والتقارير تلقائياً ويطلب مراجعتك قبل الاعتماد. يمكنك طلب تعديلات وسيقوم بتنفيذها فوراً.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
              {TASK_TYPES.slice(0, 6).map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setNewType(t.id); setShowNewTask(true); setMobileView("detail"); }}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-right transition-all hover:bg-accent hover:border-primary/30"
                  >
                    <div className={`p-2 rounded-lg ${t.color}`}><Icon className="w-5 h-5" /></div>
                    <span className="text-sm font-medium text-foreground">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AgentDashboard;
