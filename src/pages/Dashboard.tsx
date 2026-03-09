import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, FileText, FolderOpen, ClipboardCheck, CheckCircle2,
  Clock, AlertTriangle, TrendingUp, BarChart3, ArrowLeft,
  Sparkles, GraduationCap, ShieldAlert, Droplets, Activity,
  ListChecks, PieChart
} from "lucide-react";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import ThemeToggle from "@/components/ThemeToggle";

const TASK_TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  cleaning_plan: { label: "تنظيف وتعقيم", icon: Sparkles, color: "hsl(199, 89%, 48%)" },
  training_plan: { label: "خطة تدريب", icon: GraduationCap, color: "hsl(160, 60%, 45%)" },
  risk_assessment: { label: "تقييم مخاطر", icon: ShieldAlert, color: "hsl(0, 84%, 60%)" },
  water_monitoring: { label: "معالجة مياه", icon: Droplets, color: "hsl(190, 80%, 50%)" },
  performance_eval: { label: "تقييم أداء", icon: BarChart3, color: "hsl(270, 60%, 55%)" },
  haccp: { label: "HACCP", icon: ClipboardCheck, color: "hsl(30, 80%, 55%)" },
  general: { label: "مهمة عامة", icon: FileText, color: "hsl(215, 16%, 47%)" },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(215, 16%, 47%)",
  generating: "hsl(199, 89%, 48%)",
  review: "hsl(45, 93%, 47%)",
  approved: "hsl(160, 60%, 45%)",
  revision: "hsl(30, 80%, 55%)",
  completed: "hsl(160, 60%, 35%)",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  generating: "جاري الإنشاء",
  review: "بانتظار المراجعة",
  approved: "تمت الموافقة",
  revision: "جاري التعديل",
  completed: "مكتمل",
};

interface TaskRow {
  id: string;
  type: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [sopCount, setSopCount] = useState(0);
  const [convCount, setConvCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [tasksRes, docsRes, sopsRes, convsRes] = await Promise.all([
        supabase.from("agent_tasks").select("id, type, title, status, created_at, updated_at").order("updated_at", { ascending: false }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("sops").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data as TaskRow[]);
      setDocCount(docsRes.count || 0);
      setSopCount(sopsRes.count || 0);
      setConvCount(convsRes.count || 0);
      setLoading(false);
    };
    load();
  }, []);

  // Stats calculations
  const totalTasks = tasks.length;
  const reviewCount = tasks.filter(t => t.status === "review").length;
  const approvedCount = tasks.filter(t => t.status === "approved" || t.status === "completed").length;
  const pendingCount = tasks.filter(t => t.status === "pending" || t.status === "generating" || t.status === "revision").length;
  const approvalRate = totalTasks > 0 ? Math.round((approvedCount / totalTasks) * 100) : 0;

  // Tasks by type for bar chart
  const typeStats = Object.entries(TASK_TYPE_LABELS).map(([key, val]) => ({
    name: val.label,
    count: tasks.filter(t => t.type === key).length,
    fill: val.color,
  })).filter(t => t.count > 0);

  // Tasks by status for pie chart
  const statusStats = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    name: label,
    value: tasks.filter(t => t.status === key).length,
    fill: STATUS_COLORS[key],
  })).filter(s => s.value > 0);

  // Recent tasks (last 5)
  const recentTasks = tasks.slice(0, 5);

  // This week's tasks
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekCount = tasks.filter(t => new Date(t.created_at) >= weekAgo).length;

  const statCards = [
    { label: "إجمالي المهام", value: totalTasks, icon: ListChecks, accent: "text-primary" },
    { label: "بانتظار المراجعة", value: reviewCount, icon: AlertTriangle, accent: "text-yellow-500" },
    { label: "تمت الموافقة", value: approvedCount, icon: CheckCircle2, accent: "text-secondary" },
    { label: "المستندات", value: docCount, icon: FolderOpen, accent: "text-primary" },
    { label: "إجراءات SOP", value: sopCount, icon: FileText, accent: "text-purple-500" },
    { label: "المحادثات", value: convCount, icon: Bot, accent: "text-cyan-500" },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">لوحة الإحصائيات</h1>
              <p className="text-[10px] text-muted-foreground">ملخص الأداء والمهام</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} title="العودة">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${s.accent}`} />
                    {i === 1 && reviewCount > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0">تنبيه</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Performance Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{approvalRate}%</p>
                <p className="text-xs text-muted-foreground">نسبة الاعتماد</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{thisWeekCount}</p>
                <p className="text-xs text-muted-foreground">مهام هذا الأسبوع</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-500/10">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">مهام معلّقة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tasks by Type - Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                المهام حسب النوع
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={typeStats} layout="vertical" margin={{ right: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, direction: "rtl" }}
                      formatter={(value: number) => [`${value} مهمة`, "العدد"]}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                      {typeStats.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>

          {/* Tasks by Status - Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                المهام حسب الحالة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusStats.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <RePieChart>
                      <Pie
                        data={statusStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusStats.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} stroke="hsl(var(--card))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, direction: "rtl" }}
                        formatter={(value: number) => [`${value} مهمة`, ""]}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {statusStats.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                        <span className="text-foreground">{s.name}</span>
                        <span className="text-muted-foreground mr-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                آخر المهام
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/agent")}>
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentTasks.length > 0 ? (
              <div className="divide-y">
                {recentTasks.map(task => {
                  const typeInfo = TASK_TYPE_LABELS[task.type] || TASK_TYPE_LABELS.general;
                  const Icon = typeInfo.icon;
                  return (
                    <button
                      key={task.id}
                      onClick={() => navigate("/agent")}
                      className="w-full flex items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/50"
                    >
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${typeInfo.color}15` }}>
                        <Icon className="w-4 h-4" style={{ color: typeInfo.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">{typeInfo.label} • {new Date(task.updated_at).toLocaleDateString("ar-EG")}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0"
                        style={{ borderColor: STATUS_COLORS[task.status], color: STATUS_COLORS[task.status] }}
                      >
                        {STATUS_LABELS[task.status] || task.status}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                لا توجد مهام بعد
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
