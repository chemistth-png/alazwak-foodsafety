import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Download, Plus, Trash2, Loader2, FileText, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";

interface SOPStep {
  id: string;
  description: string;
  responsible: string;
  notes: string;
}

const generateId = () => crypto.randomUUID();

const EMPTY_STEP = (): SOPStep => ({
  id: generateId(),
  description: "",
  responsible: "",
  notes: "",
});

const CATEGORIES = [
  "إنتاج",
  "جودة",
  "صيانة",
  "تخزين",
  "نظافة وتعقيم",
  "سلامة غذاء",
  "معالجة مياه",
  "تعبئة وتغليف",
  "أخرى",
];

const SOPTemplate = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    docNumber: "",
    revision: "01",
    category: "",
    department: "",
    preparedBy: "",
    approvedBy: "",
    effectiveDate: "",
    purpose: "",
    scope: "",
    definitions: "",
    references: "",
    safetyNotes: "",
    records: "",
  });

  const [steps, setSteps] = useState<SOPStep[]>([EMPTY_STEP(), EMPTY_STEP(), EMPTY_STEP()]);

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateStep = (id: string, field: keyof SOPStep, value: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const addStep = () => setSteps((prev) => [...prev, EMPTY_STEP()]);

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const exportPDF = useCallback(async () => {
    if (!form.title) {
      toast.error("يرجى إدخال عنوان الإجراء أولاً");
      return;
    }
    setIsExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const stepsRows = steps
        .filter((s) => s.description)
        .map(
          (s, i) => `
          <tr>
            <td style="padding:8px;border:1px solid #d1d5db;text-align:center;font-weight:bold;">${i + 1}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${s.description}</td>
            <td style="padding:8px;border:1px solid #d1d5db;text-align:center;">${s.responsible}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${s.notes}</td>
          </tr>`
        )
        .join("");

      const section = (title: string, content: string) =>
        content
          ? `<div style="margin-bottom:14px;">
              <h3 style="font-size:14px;font-weight:bold;color:#0284c7;margin-bottom:4px;border-bottom:2px solid #0ea5e9;padding-bottom:2px;">${title}</h3>
              <p style="font-size:12px;line-height:1.8;white-space:pre-wrap;margin:0;">${content}</p>
            </div>`
          : "";

      const html = `
        <div style="direction:rtl;font-family:'Cairo',sans-serif;padding:20px;max-width:700px;">
          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:center;border:2px solid #0ea5e9;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
            <div>
              <h1 style="font-size:18px;font-weight:bold;color:#0284c7;margin:0;">${form.title}</h1>
              <p style="font-size:11px;color:#64748b;margin:2px 0 0;">إجراء تشغيل قياسي - SOP</p>
            </div>
            <div style="text-align:left;font-size:11px;color:#334155;">
              ${form.docNumber ? `<div>رقم الوثيقة: <strong>${form.docNumber}</strong></div>` : ""}
              ${form.revision ? `<div>رقم المراجعة: <strong>${form.revision}</strong></div>` : ""}
              ${form.effectiveDate ? `<div>تاريخ السريان: <strong>${form.effectiveDate}</strong></div>` : ""}
            </div>
          </div>

          <!-- Meta -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px;">
            <tr>
              <td style="padding:6px 10px;border:1px solid #d1d5db;background:#f0f9ff;font-weight:bold;width:25%;">القسم</td>
              <td style="padding:6px 10px;border:1px solid #d1d5db;width:25%;">${form.department}</td>
              <td style="padding:6px 10px;border:1px solid #d1d5db;background:#f0f9ff;font-weight:bold;width:25%;">التصنيف</td>
              <td style="padding:6px 10px;border:1px solid #d1d5db;width:25%;">${form.category}</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;border:1px solid #d1d5db;background:#f0f9ff;font-weight:bold;">إعداد</td>
              <td style="padding:6px 10px;border:1px solid #d1d5db;">${form.preparedBy}</td>
              <td style="padding:6px 10px;border:1px solid #d1d5db;background:#f0f9ff;font-weight:bold;">اعتماد</td>
              <td style="padding:6px 10px;border:1px solid #d1d5db;">${form.approvedBy}</td>
            </tr>
          </table>

          ${section("1. الغرض", form.purpose)}
          ${section("2. نطاق التطبيق", form.scope)}
          ${section("3. التعريفات", form.definitions)}
          ${section("4. المراجع", form.references)}

          <!-- Steps -->
          ${stepsRows ? `
          <div style="margin-bottom:14px;">
            <h3 style="font-size:14px;font-weight:bold;color:#0284c7;margin-bottom:6px;border-bottom:2px solid #0ea5e9;padding-bottom:2px;">5. خطوات التنفيذ</h3>
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead>
                <tr style="background:#0ea5e9;color:white;">
                  <th style="padding:8px;border:1px solid #0284c7;width:8%;">#</th>
                  <th style="padding:8px;border:1px solid #0284c7;">وصف الخطوة</th>
                  <th style="padding:8px;border:1px solid #0284c7;width:18%;">المسؤول</th>
                  <th style="padding:8px;border:1px solid #0284c7;width:22%;">ملاحظات</th>
                </tr>
              </thead>
              <tbody>${stepsRows}</tbody>
            </table>
          </div>` : ""}

          ${section("6. ملاحظات السلامة", form.safetyNotes)}
          ${section("7. السجلات والنماذج", form.records)}

          <p style="text-align:center;color:#94a3b8;font-size:9px;margin-top:24px;">تم الإنشاء بواسطة Alazwak Food Safety</p>
        </div>
      `;

      const container = document.createElement("div");
      container.innerHTML = html;

      await html2pdf()
        .set({
          margin: 10,
          filename: `SOP-${form.docNumber || form.title}.pdf`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(container)
        .save();

      toast.success("تم تصدير الـ SOP بنجاح");
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء التصدير");
    } finally {
      setIsExporting(false);
    }
  }, [form, steps]);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold text-foreground">قالب إجراء تشغيل قياسي (SOP)</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button onClick={exportPDF} disabled={isExporting} className="gap-1.5">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            تصدير PDF
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4" ref={formRef}>
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary">معلومات الوثيقة</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs mb-1 block">عنوان الإجراء *</Label>
              <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="مثال: إجراء غسيل وتعقيم خطوط التعبئة" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">رقم الوثيقة</Label>
              <Input value={form.docNumber} onChange={(e) => updateField("docNumber", e.target.value)} placeholder="SOP-QA-001" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">رقم المراجعة</Label>
              <Input value={form.revision} onChange={(e) => updateField("revision", e.target.value)} placeholder="01" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">التصنيف</Label>
              <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">القسم</Label>
              <Input value={form.department} onChange={(e) => updateField("department", e.target.value)} placeholder="قسم الجودة" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">إعداد</Label>
              <Input value={form.preparedBy} onChange={(e) => updateField("preparedBy", e.target.value)} placeholder="اسم المُعِد" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">اعتماد</Label>
              <Input value={form.approvedBy} onChange={(e) => updateField("approvedBy", e.target.value)} placeholder="اسم المعتمِد" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">تاريخ السريان</Label>
              <Input type="date" value={form.effectiveDate} onChange={(e) => updateField("effectiveDate", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Content Sections */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary">محتوى الإجراء</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">1. الغرض</Label>
              <Textarea value={form.purpose} onChange={(e) => updateField("purpose", e.target.value)} placeholder="الهدف من هذا الإجراء..." rows={2} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">2. نطاق التطبيق</Label>
              <Textarea value={form.scope} onChange={(e) => updateField("scope", e.target.value)} placeholder="يطبق هذا الإجراء على..." rows={2} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">3. التعريفات</Label>
              <Textarea value={form.definitions} onChange={(e) => updateField("definitions", e.target.value)} placeholder="المصطلحات والتعريفات المستخدمة..." rows={2} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">4. المراجع</Label>
              <Textarea value={form.references} onChange={(e) => updateField("references", e.target.value)} placeholder="المواصفات والمعايير المرجعية..." rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-primary">5. خطوات التنفيذ</CardTitle>
            <Button variant="outline" size="sm" onClick={addStep} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> إضافة خطوة
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-1">
                  {idx + 1}
                </span>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-3">
                    <Input
                      value={step.description}
                      onChange={(e) => updateStep(step.id, "description", e.target.value)}
                      placeholder="وصف الخطوة..."
                      className="text-sm"
                    />
                  </div>
                  <Input
                    value={step.responsible}
                    onChange={(e) => updateStep(step.id, "responsible", e.target.value)}
                    placeholder="المسؤول"
                    className="text-sm"
                  />
                  <div className="sm:col-span-2">
                    <Input
                      value={step.notes}
                      onChange={(e) => updateStep(step.id, "notes", e.target.value)}
                      placeholder="ملاحظات / معايير قبول"
                      className="text-sm"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 mt-1 text-destructive" onClick={() => removeStep(step.id)} disabled={steps.length <= 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Safety & Records */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary">معلومات إضافية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">6. ملاحظات السلامة</Label>
              <Textarea value={form.safetyNotes} onChange={(e) => updateField("safetyNotes", e.target.value)} placeholder="احتياطات السلامة الواجب اتباعها..." rows={2} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">7. السجلات والنماذج</Label>
              <Textarea value={form.records} onChange={(e) => updateField("records", e.target.value)} placeholder="السجلات والنماذج المرتبطة بهذا الإجراء..." rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Bottom Export */}
        <div className="flex justify-center pb-8">
          <Button onClick={exportPDF} disabled={isExporting} size="lg" className="gap-2">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-5 h-5" />}
            تصدير كملف PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SOPTemplate;
