import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  Printer,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import DocumentHeader from "@/components/DocumentHeader";
import AICAPASuggestion from "@/components/AICAPASuggestion";

interface NCReport {
  id: string;
  user_id: string;
  report_number: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  corrective_action: string;
  responsible: string;
  status: string;
  detected_at: string;
  closed_at: string | null;
  created_at: string;
}

const emptyForm = {
  report_number: "",
  title: "",
  description: "",
  category: "product",
  severity: "minor",
  corrective_action: "",
  responsible: "",
  status: "open",
};

const categoryMap: Record<string, string> = {
  product: "منتج",
  process: "عملية",
  hygiene: "نظافة",
  equipment: "معدات",
  documentation: "توثيق",
};

const NCReports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState<NCReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [capaReport, setCapaReport] = useState<NCReport | null>(null);
  const [capaOpen, setCapaOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("nc_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("فشل تحميل التقارير");
    setReports((data as NCReport[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!user) return toast.error("يجب تسجيل الدخول");
    if (!form.title.trim()) return toast.error("أدخل عنوان التقرير");
    setSaving(true);
    const payload = {
      ...form,
      user_id: user.id,
      report_number:
        form.report_number || `NC-${String(reports.length + 1).padStart(4, "0")}`,
    };
    const { error } = await supabase.from("nc_reports").insert(payload);
    setSaving(false);
    if (error) return toast.error("فشل الحفظ");
    toast.success("تم إنشاء التقرير");
    setOpen(false);
    setForm(emptyForm);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "closed") patch.closed_at = new Date().toISOString();
    const { error } = await supabase.from("nc_reports").update(patch).eq("id", id);
    if (error) return toast.error("فشل التحديث");
    toast.success("تم التحديث");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("nc_reports").delete().eq("id", id);
    if (error) return toast.error("فشل الحذف");
    setReports((p) => p.filter((r) => r.id !== id));
  };

  const handleCAPA = (report: NCReport) => {
    setCapaReport(report);
    setCapaOpen(true);
  };

  const sevBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      critical: { label: "حرج", cls: "bg-destructive text-destructive-foreground" },
      major: { label: "كبير", cls: "bg-orange-500 text-white" },
      minor: { label: "بسيط", cls: "bg-yellow-500 text-black" },
    };
    const v = map[s] || map.minor;
    return <Badge className={v.cls}>{v.label}</Badge>;
  };

  const statusBadge = (s: string) => {
    if (s === "closed")
      return (
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="w-3 h-3" /> مغلق
        </Badge>
      );
    if (s === "in_progress") return <Badge variant="secondary">قيد المعالجة</Badge>;
    return (
      <Badge className="gap-1">
        <AlertTriangle className="w-3 h-3" /> مفتوح
      </Badge>
    );
  };

  // Mobile Card View for each report
  const MobileCard = ({ r }: { r: NCReport }) => (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-relaxed">{r.title}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">{r.report_number}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {sevBadge(r.severity)}
          {statusBadge(r.status)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">الفئة: </span>
          <span className="font-medium">{categoryMap[r.category] || r.category}</span>
        </div>
        <div>
          <span className="text-muted-foreground">المسؤول: </span>
          <span className="font-medium">{r.responsible || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">التاريخ: </span>
          <span className="font-medium">{new Date(r.created_at).toLocaleDateString("ar-EG")}</span>
        </div>
      </div>

      {r.description && (
        <p className="text-xs text-muted-foreground border-t pt-2 leading-relaxed">{r.description}</p>
      )}

      <Button
        size="default"
        className="w-full h-11 gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-sm"
        onClick={() => handleCAPA(r)}
      >
        <ClipboardCheck className="w-4 h-4 shrink-0" />
        <span className="truncate">إنشاء إجراء تصحيحي (CAPA)</span>
      </Button>

      <div className="flex items-center gap-2 pt-2 border-t">
        <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">مفتوح</SelectItem>
            <SelectItem value="in_progress">قيد المعالجة</SelectItem>
            <SelectItem value="closed">مغلق</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive shrink-0"
          onClick={() => remove(r.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-background">
      <DocumentHeader
        docCode="F-08-1"
        version="01"
        title="سجل تقارير عدم المطابقة - Non-Conformity Reports"
      />

      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">تقارير عدم المطابقة</h1>
            <p className="text-xs text-muted-foreground">
              {reports.length} تقرير •{" "}
              {reports.filter((r) => r.status === "open").length} مفتوح
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex">
            <Printer className="w-4 h-4 ms-2" />
            طباعة
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 ms-2" />
                <span className="hidden sm:inline">تقرير جديد</span>
                <span className="sm:hidden">جديد</span>
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إنشاء تقرير عدم مطابقة</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>رقم التقرير</Label>
                  <Input
                    value={form.report_number}
                    onChange={(e) => setForm({ ...form, report_number: e.target.value })}
                    placeholder="تلقائي إذا تُرك فارغاً"
                  />
                </div>
                <div>
                  <Label>العنوان *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>الفئة</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">منتج</SelectItem>
                        <SelectItem value="process">عملية</SelectItem>
                        <SelectItem value="hygiene">نظافة</SelectItem>
                        <SelectItem value="equipment">معدات</SelectItem>
                        <SelectItem value="documentation">توثيق</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الخطورة</Label>
                    <Select
                      value={form.severity}
                      onValueChange={(v) => setForm({ ...form, severity: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">بسيط</SelectItem>
                        <SelectItem value="major">كبير</SelectItem>
                        <SelectItem value="critical">حرج</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>الإجراء التصحيحي</Label>
                  <Textarea
                    value={form.corrective_action}
                    onChange={(e) =>
                      setForm({ ...form, corrective_action: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div>
                  <Label>المسؤول</Label>
                  <Input
                    value={form.responsible}
                    onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="flex-row-reverse gap-2">
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 ms-2 animate-spin" />}
                  حفظ
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 py-4 pb-20 md:pb-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              لا توجد تقارير. اضغط "تقرير جديد" لإضافة أول تقرير عدم مطابقة.
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {reports.map((r) => (
                  <MobileCard key={r.id} r={r} />
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right whitespace-nowrap">الرقم</TableHead>
                        <TableHead className="text-right min-w-[180px]">العنوان</TableHead>
                        <TableHead className="text-right whitespace-nowrap">الفئة</TableHead>
                        <TableHead className="text-right whitespace-nowrap">الخطورة</TableHead>
                        <TableHead className="text-right whitespace-nowrap">المسؤول</TableHead>
                        <TableHead className="text-right whitespace-nowrap">الحالة</TableHead>
                        <TableHead className="text-right whitespace-nowrap">التاريخ</TableHead>
                        <TableHead className="text-right whitespace-nowrap print:hidden">إجراءات</TableHead>
                        <TableHead className="text-right whitespace-nowrap print:hidden">CAPA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs whitespace-nowrap px-3">{r.report_number}</TableCell>
                          <TableCell className="font-medium px-3 leading-relaxed">{r.title}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap px-3">{categoryMap[r.category] || r.category}</TableCell>
                          <TableCell className="whitespace-nowrap px-3">{sevBadge(r.severity)}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap px-3">{r.responsible || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap px-3">{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap px-3">
                            {new Date(r.created_at).toLocaleDateString("ar-EG")}
                          </TableCell>
                          <TableCell className="print:hidden px-3">
                            <div className="flex items-center gap-1">
                              <Select
                                value={r.status}
                                onValueChange={(v) => updateStatus(r.id, v)}
                              >
                                <SelectTrigger className="h-8 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">مفتوح</SelectItem>
                                  <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                                  <SelectItem value="closed">مغلق</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => remove(r.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="print:hidden px-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 whitespace-nowrap"
              onClick={() => handleCAPA(r)}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              إنشاء CAPA
            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {/* AI CAPA Dialog */}
      <Dialog open={capaOpen} onOpenChange={setCapaOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              إجراء تصحيحي - {capaReport?.report_number}
            </DialogTitle>
          </DialogHeader>
          {capaReport && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">العنوان: </span>
                  <span className="font-medium">{capaReport.title}</span>
                </div>
                {capaReport.description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">الوصف: </span>
                    <span>{capaReport.description}</span>
                  </div>
                )}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>الفئة: {categoryMap[capaReport.category] || capaReport.category}</span>
                  <span>الخطورة: {capaReport.severity === 'critical' ? 'حرج' : capaReport.severity === 'major' ? 'كبير' : 'بسيط'}</span>
                </div>
              </div>
              <AICAPASuggestion
                reportId={capaReport.id}
                reportNumber={capaReport.report_number}
                title={capaReport.title}
                description={capaReport.description}
                onAccept={() => {
                  load();
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NCReports;
