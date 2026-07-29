import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  ShieldCheck,
  FileDown,
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
  batch_number?: string;
  lot_code?: string;
  hazard_type?: string;
  ccp_ref?: string;
  verified_by?: string;
  verified_at?: string | null;
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
  batch_number: "",
  lot_code: "",
  hazard_type: "",
  ccp_ref: "",
};

const categoryMap: Record<string, string> = {
  product: "منتج",
  process: "عملية",
  hygiene: "نظافة",
  equipment: "معدات",
  documentation: "توثيق",
};

const hazardMap: Record<string, string> = {
  biological: "بيولوجي",
  chemical: "كيميائي",
  physical: "فيزيائي",
  allergen: "مسببات حساسية",
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
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyReport, setVerifyReport] = useState<NCReport | null>(null);
  const [verifiedBy, setVerifiedBy] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("nc_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("فشل تحميل التقارير", { duration: 8000 });
    setReports((data as NCReport[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!user) return toast.error("يجب تسجيل الدخول", { duration: 8000 });
    if (!form.title.trim()) return toast.error("أدخل عنوان التقرير", { duration: 8000 });
    if (form.title.length > 200) return toast.error("العنوان طويل جداً (الحد 200 حرف)", { duration: 8000 });
    if (form.description.length > 2000) return toast.error("الوصف طويل جداً (الحد 2000 حرف)", { duration: 8000 });
    setSaving(true);
    const payload = {
      ...form,
      user_id: user.id,
      report_number:
        form.report_number || `NC-${String(reports.length + 1).padStart(4, "0")}`,
    };
    const { error } = await supabase.from("nc_reports").insert(payload);
    setSaving(false);
    if (error) return toast.error("فشل الحفظ", { duration: 8000 });
    toast.success("تم إنشاء التقرير");
    setOpen(false);
    setForm(emptyForm);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "closed") patch.closed_at = new Date().toISOString();
    const { error } = await supabase.from("nc_reports").update(patch).eq("id", id);
    if (error) return toast.error("فشل التحديث", { duration: 8000 });
    toast.success("تم التحديث");
    load();
  };

  const handleVerify = (report: NCReport) => {
    setVerifyReport(report);
    setVerifiedBy("");
    setVerifyOpen(true);
  };

  const submitVerification = async () => {
    if (!verifyReport) return;
    if (!verifiedBy.trim()) return toast.error("أدخل اسم المحقق", { duration: 8000 });
    const { error } = await supabase
      .from("nc_reports")
      .update({
        status: "verified",
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .eq("id", verifyReport.id);
    if (error) return toast.error("فشل التحقق", { duration: 8000 });
    toast.success("تم التحقق من فعالية الإجراء التصحيحي");
    setVerifyOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("nc_reports").delete().eq("id", id);
    if (error) return toast.error("فشل الحذف", { duration: 8000 });
    setReports((p) => p.filter((r) => r.id !== id));
  };

  const handleCAPA = (report: NCReport) => {
    setCapaReport(report);
    setCapaOpen(true);
  };

  const exportPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("nc-print-area");
    if (!element) return;
    html2pdf()
      .set({
        margin: 10,
        filename: `NC_Reports_${new Date().toISOString().slice(0, 10)}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      })
      .from(element)
      .save();
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
    if (s === "verified")
      return (
        <Badge variant="outline" className="gap-1 border-green-600 text-green-700">
          <ShieldCheck className="w-3 h-3" /> تم التحقق
        </Badge>
      );
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

  // Skeleton loader for loading state
  const SkeletonCards = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );

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
        {r.batch_number && (
          <div>
            <span className="text-muted-foreground">الدفعة: </span>
            <span className="font-medium">{r.batch_number}</span>
          </div>
        )}
        {r.hazard_type && (
          <div>
            <span className="text-muted-foreground">نوع الخطر: </span>
            <span className="font-medium">{hazardMap[r.hazard_type] || r.hazard_type}</span>
          </div>
        )}
        {r.ccp_ref && (
          <div>
            <span className="text-muted-foreground">CCP: </span>
            <span className="font-medium">{r.ccp_ref}</span>
          </div>
        )}
      </div>

      {r.description && (
        <p className="text-xs text-muted-foreground border-t pt-2 leading-relaxed">{r.description}</p>
      )}

      {r.verified_by && (
        <div className="text-xs border-t pt-2 text-green-700">
          <ShieldCheck className="w-3 h-3 inline ml-1" />
          تحقق بواسطة: {r.verified_by}
        </div>
      )}

      <Button
        size="default"
        className="w-full min-h-14 gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-sm"
        onClick={() => handleCAPA(r)}
      >
        <ClipboardCheck className="w-4 h-4 shrink-0" />
        <span className="truncate">إنشاء إجراء تصحيحي (CAPA)</span>
      </Button>

      {r.status === "closed" && !r.verified_by && (
        <Button
          size="default"
          variant="outline"
          className="w-full min-h-14 gap-2 rounded-lg border-green-600 text-green-700 text-sm font-semibold"
          onClick={() => handleVerify(r)}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>تحقق من فعالية CAPA</span>
        </Button>
      )}

      <div className="flex items-center gap-2 pt-2 border-t">
        <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
          <SelectTrigger className="min-h-14 flex-1 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">مفتوح</SelectItem>
            <SelectItem value="in_progress">قيد المعالجة</SelectItem>
            <SelectItem value="closed">مغلق</SelectItem>
            <SelectItem value="verified">تم التحقق</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-14 min-w-14 text-destructive shrink-0"
          onClick={() => remove(r.id)}
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-background">
      <DocumentHeader
        docCode="F-08-1"
        version="02"
        title="سجل تقارير عدم المطابقة - Non-Conformity Reports"
      />

      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="min-h-14 min-w-14" onClick={() => navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">تقارير عدم المطابقة</h1>
            <p className="text-xs text-muted-foreground">
              {reports.length} تقرير •{" "}
              {reports.filter((r) => r.status === "open").length} مفتوح •{" "}
              {reports.filter((r) => r.status === "closed" && !r.verified_by).length} بانتظار التحقق
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex min-h-10" onClick={exportPDF}>
            <FileDown className="w-4 h-4 ms-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex min-h-10">
            <Printer className="w-4 h-4 ms-2" />
            طباعة
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="min-h-14 sm:min-h-10">
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
                    maxLength={30}
                    className="min-h-12"
                  />
                </div>
                <div>
                  <Label>العنوان *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    maxLength={200}
                    className="min-h-12"
                  />
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    maxLength={2000}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>الفئة</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger className="min-h-12"><SelectValue /></SelectTrigger>
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
                      <SelectTrigger className="min-h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">بسيط</SelectItem>
                        <SelectItem value="major">كبير</SelectItem>
                        <SelectItem value="critical">حرج</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* New fields: Batch/Lot traceability */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>رقم الدفعة (Batch)</Label>
                    <Input
                      value={form.batch_number}
                      onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                      placeholder="مثال: B-2026-0715"
                      maxLength={50}
                      className="min-h-12"
                    />
                  </div>
                  <div>
                    <Label>كود اللوت (Lot)</Label>
                    <Input
                      value={form.lot_code}
                      onChange={(e) => setForm({ ...form, lot_code: e.target.value })}
                      placeholder="مثال: L-001"
                      maxLength={50}
                      className="min-h-12"
                    />
                  </div>
                </div>
                {/* Hazard type and CCP reference */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>نوع الخطر</Label>
                    <Select
                      value={form.hazard_type}
                      onValueChange={(v) => setForm({ ...form, hazard_type: v })}
                    >
                      <SelectTrigger className="min-h-12"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="biological">بيولوجي</SelectItem>
                        <SelectItem value="chemical">كيميائي</SelectItem>
                        <SelectItem value="physical">فيزيائي</SelectItem>
                        <SelectItem value="allergen">مسببات حساسية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>مرجع CCP</Label>
                    <Input
                      value={form.ccp_ref}
                      onChange={(e) => setForm({ ...form, ccp_ref: e.target.value })}
                      placeholder="مثال: CCP-01"
                      maxLength={30}
                      className="min-h-12"
                    />
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
                    maxLength={2000}
                  />
                </div>
                <div>
                  <Label>المسؤول</Label>
                  <Input
                    value={form.responsible}
                    onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                    maxLength={100}
                    className="min-h-12"
                  />
                </div>
              </div>
              <DialogFooter className="flex-row-reverse gap-2">
                <Button onClick={save} disabled={saving} className="min-h-12">
                  {saving && <Loader2 className="w-4 h-4 ms-2 animate-spin" />}
                  حفظ
                </Button>
                <Button variant="outline" className="min-h-12" onClick={() => setOpen(false)}>إلغاء</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ThemeToggle />
        </div>
      </header>

      <div id="nc-print-area" className="flex-1 overflow-auto px-4 py-4 pb-20 md:pb-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <>
              {/* Skeleton loaders */}
              <div className="sm:hidden">
                <SkeletonCards />
              </div>
              <div className="hidden sm:block space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </>
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
                        <TableHead className="text-right whitespace-nowrap">الدفعة</TableHead>
                        <TableHead className="text-right whitespace-nowrap">الخطر</TableHead>
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
                          <TableCell className="text-xs whitespace-nowrap px-3">{r.batch_number || "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap px-3">{r.hazard_type ? (hazardMap[r.hazard_type] || r.hazard_type) : "—"}</TableCell>
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
                                <SelectTrigger className="h-10 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">مفتوح</SelectItem>
                                  <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                                  <SelectItem value="closed">مغلق</SelectItem>
                                  <SelectItem value="verified">تم التحقق</SelectItem>
                                </SelectContent>
                              </Select>
                              {r.status === "closed" && !r.verified_by && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 text-green-700 border-green-600"
                                  onClick={() => handleVerify(r)}
                                  title="تحقق من فعالية CAPA"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-destructive"
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
                              className="h-10 text-xs gap-1 whitespace-nowrap"
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
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>الفئة: {categoryMap[capaReport.category] || capaReport.category}</span>
                  <span>الخطورة: {capaReport.severity === 'critical' ? 'حرج' : capaReport.severity === 'major' ? 'كبير' : 'بسيط'}</span>
                  {capaReport.batch_number && <span>الدفعة: {capaReport.batch_number}</span>}
                  {capaReport.ccp_ref && <span>CCP: {capaReport.ccp_ref}</span>}
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

      {/* Verification Dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              تحقق من فعالية CAPA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              تأكيد أن الإجراء التصحيحي لـ <strong>{verifyReport?.report_number}</strong> تم تنفيذه بفعالية ولم يتكرر عدم المطابقة.
            </p>
            <div>
              <Label>اسم المحقق (QA Manager) *</Label>
              <Input
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="أدخل اسمك الكامل"
                maxLength={100}
                className="min-h-12"
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={submitVerification} className="min-h-12 bg-green-600 hover:bg-green-700">
              تأكيد التحقق
            </Button>
            <Button variant="outline" className="min-h-12" onClick={() => setVerifyOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NCReports;
