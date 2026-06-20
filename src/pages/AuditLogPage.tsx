import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Trash2, CheckCircle2, Edit3, MessageSquare, FileText, Upload, Download, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_INFO: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  delete_task: { label: "حذف مهمة", icon: Trash2, color: "text-destructive" },
  approve_task: { label: "اعتماد مهمة", icon: CheckCircle2, color: "text-emerald-600" },
  revise_task: { label: "تعديل مهمة", icon: Edit3, color: "text-amber-600" },
  generate_task: { label: "إنشاء مهمة", icon: Bot, color: "text-primary" },
  delete_document: { label: "حذف مستند", icon: Trash2, color: "text-destructive" },
  delete_conversation: { label: "حذف محادثة", icon: Trash2, color: "text-destructive" },
  delete_sop: { label: "حذف إجراء", icon: Trash2, color: "text-destructive" },
  clear_chat: { label: "مسح محادثة", icon: MessageSquare, color: "text-muted-foreground" },
  upload_document: { label: "رفع مستند", icon: Upload, color: "text-primary" },
  export_task: { label: "تصدير مهمة", icon: Download, color: "text-primary" },
};

const ENTITY_LABELS: Record<string, string> = {
  agent_task: "مهمة",
  document: "مستند",
  conversation: "محادثة",
  sop: "إجراء عمل",
};

const AuditLogPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setLogs(data as unknown as AuditLog[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const groupByDate = (items: AuditLog[]) => {
    const groups: Record<string, AuditLog[]> = {};
    items.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  };

  const grouped = groupByDate(logs);

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">سجل التدقيق</h1>
            <p className="text-[10px] text-muted-foreground">تتبع جميع العمليات الحساسة</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">جاري التحميل...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Shield className="w-10 h-10" />
            <p className="text-sm">لا توجد سجلات بعد</p>
            <p className="text-xs">ستظهر هنا جميع العمليات الحساسة</p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">{date}</p>
                <div className="space-y-2">
                  {items.map(log => {
                    const info = ACTION_INFO[log.action] || { label: log.action, icon: FileText, color: "text-muted-foreground" };
                    const Icon = info.icon;
                    const time = new Date(log.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                        <div className={`mt-0.5 ${info.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{info.label}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {ENTITY_LABELS[log.entity_type] || log.entity_type}
                            </Badge>
                          </div>
                          {log.entity_title && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.entity_title}</p>
                          )}
                          {log.details?.feedback && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">ملاحظات: {log.details.feedback}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default AuditLogPage;
