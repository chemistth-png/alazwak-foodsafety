import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowRight, Plus, Search, FileText, Trash2, Pencil, Download, Loader2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import { SOP_CATEGORIES } from "@/pages/SOPTemplate";
import { logAudit } from "@/lib/auditLog";

interface SOP {
  id: string;
  title: string;
  doc_number: string;
  revision: string;
  category: string;
  department: string;
  prepared_by: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

const SOPsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [exportingId, setExportingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sops")
      .select("id, title, doc_number, revision, category, department, prepared_by, effective_date, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setSops(data as SOP[]);
    if (error) console.error(error);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const deleteSOP = async (id: string) => {
    const sop = sops.find(s => s.id === id);
    const { error } = await supabase.from("sops").delete().eq("id", id);
    if (error) {
      toast.error("حدث خطأ أثناء الحذف");
      return;
    }
    logAudit({ action: "delete_sop", entity_type: "sop", entity_id: id, entity_title: sop?.title });
    toast.success("تم حذف الإجراء");
    setSops((prev) => prev.filter((s) => s.id !== id));
  };

  const exportSinglePDF = async (id: string) => {
    setExportingId(id);
    try {
      const { data } = await supabase.from("sops").select("*").eq("id", id).single();
      if (!data) return;

      const html2pdf = (await import("html2pdf.js")).default;
      const steps = (data.steps as any[]) || [];
      const stepsRows = steps
        .filter((s: any) => s.description)
        .map((s: any, i: number) => `
          <tr>
            <td style="padding:8px;border:1px solid #d1d5db;text-align:center;font-weight:bold;">${i + 1}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${s.description}</td>
            <td style="padding:8px;border:1px solid #d1d5db;text-align:center;">${s.responsible}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${s.notes}</td>
          </tr>`)
        .join("");

      const section = (title: string, content: string) =>
        content ? `<div style="margin-bottom:14px;"><h3 style="font-size:14px;font-weight:bold;color:#0284c7;margin-bottom:4px;border-bottom:2px solid #0ea5e9;padding-bottom:2px;">${title}</h3><p style="font-size:12px;line-height:1.8;white-space:pre-wrap;margin:0;">${content}</p></div>` : "";

      const html = `
        <div style="direction:rtl;font-family:'Cairo',sans-serif;padding:20px;max-width:700px;">
          <div style="display:flex;justify-content:space-between;align-items:center;border:2px solid #0ea5e9;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
            <div><h1 style="font-size:18px;font-weight:bold;color:#0284c7;margin:0;">${data.title}</h1><p style="font-size:11px;color:#64748b;margin:2px 0 0;">إجراء تشغيل قياسي - SOP</p></div>
            <div style="text-align:left;font-size:11px;color:#334155;">
              ${data.doc_number ? `<div>رقم الوثيقة: <strong>${data.doc_number}</strong></div>` : ""}
              ${data.revision ? `<div>رقم المراجعة: <strong>${data.revision}</strong></div>` : ""}
              ${data.effective_date ? `<div>تاريخ السريان: <strong>${data.effective_date}</strong></div>` : ""}
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px;">
            <tr><td style="padding:6px 10px;border:1px solid #d1d5db;background:#f0f9ff;font-weight:bold;width:25%;">القسم</td><td style="padding:6px 10px;border:1px solid #d1d5db;width:25%;">${data.department}</td><td style="padding:6px 10px;border:1px solid #d1d5db;background:#f0f9ff;font-weight:bold;width:25%;">التصنيف</td><td style="padding:6px 10px;border:1px solid #d1d5db;width:25%;">${data.category}</td></tr>
            <tr><td style="padding:6px 10px;border:1px solid #d1d5db;background:#f0f9ff;font-weight:bold;">إعداد</td><td style="padding:6px 10px;border:1px solid #d1d5db;">${data.prepared_by}</td><td style="padding:6px 10px;border:1px solid #d1d5db;background:#f0f9ff;font-weight:bold;">اعتماد</td><td style="padding:6px 10px;border:1px solid #d1d5db;">${data.approved_by}</td></tr>
          </table>
          ${section("1. الغرض", data.purpose || "")}
          ${section("2. نطاق التطبيق", data.scope || "")}
          ${section("3. التعريفات", data.definitions || "")}
          ${section("4. المراجع", (data as any).references || "")}
          ${stepsRows ? `<div style="margin-bottom:14px;"><h3 style="font-size:14px;font-weight:bold;color:#0284c7;margin-bottom:6px;border-bottom:2px solid #0ea5e9;padding-bottom:2px;">5. خطوات التنفيذ</h3><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#0ea5e9;color:white;"><th style="padding:8px;border:1px solid #0284c7;width:8%;">#</th><th style="padding:8px;border:1px solid #0284c7;">وصف الخطوة</th><th style="padding:8px;border:1px solid #0284c7;width:18%;">المسؤول</th><th style="padding:8px;border:1px solid #0284c7;width:22%;">ملاحظات</th></tr></thead><tbody>${stepsRows}</tbody></table></div>` : ""}
          ${section("6. ملاحظات السلامة", data.safety_notes || "")}
          ${section("7. السجلات والنماذج", data.records || "")}
          <p style="text-align:center;color:#94a3b8;font-size:9px;margin-top:24px;">تم الإنشاء بواسطة Alazwak Food Safety</p>
        </div>`;

      const container = document.createElement("div");
      container.innerHTML = html;
      await html2pdf().set({ margin: 10, filename: `SOP-${data.doc_number || data.title}.pdf`, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(container).save();
      toast.success("تم تصدير الـ SOP بنجاح");
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء التصدير");
    } finally {
      setExportingId(null);
    }
  };

  const filtered = sops.filter((s) => {
    const matchSearch = !search.trim() || s.title.includes(search) || s.doc_number.includes(search) || s.department.includes(search);
    const matchCategory = filterCategory === "all" || s.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }); }
    catch { return d; }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold text-foreground">إدارة إجراءات التشغيل (SOPs)</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button onClick={() => navigate("/sop")} className="gap-1.5">
            <Plus className="w-4 h-4" />
            إجراء جديد
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 pb-20 md:pb-4 space-y-4">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالعنوان أو رقم الوثيقة..."
              className="pr-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {SOP_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <FileText className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              {sops.length === 0 ? "لا توجد إجراءات محفوظة بعد" : "لا توجد نتائج مطابقة"}
            </p>
            {sops.length === 0 && (
              <Button onClick={() => navigate("/sop")} className="gap-1.5">
                <Plus className="w-4 h-4" /> إنشاء أول إجراء
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((sop) => (
              <Card key={sop.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-sm text-foreground truncate">{sop.title}</h3>
                        {sop.category && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">{sop.category}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        {sop.doc_number && <span>رقم: {sop.doc_number}</span>}
                        {sop.department && <span>القسم: {sop.department}</span>}
                        {sop.revision && <span>مراجعة: {sop.revision}</span>}
                        <span>آخر تحديث: {formatDate(sop.updated_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/sop?id=${sop.id}`)} title="تعديل">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportSinglePDF(sop.id)} disabled={exportingId === sop.id} title="تصدير PDF">
                        {exportingId === sop.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="حذف">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الإجراء</AlertDialogTitle>
                            <AlertDialogDescription>هل أنت متأكد من حذف "{sop.title}"؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSOP(sop.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {sops.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pt-2">
            إجمالي: {sops.length} إجراء {filterCategory !== "all" || search.trim() ? `• عرض: ${filtered.length}` : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default SOPsPage;
