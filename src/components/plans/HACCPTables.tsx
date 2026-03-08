import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, FileText } from "lucide-react";
import { toast } from "sonner";

interface HazardRow {
  id: string;
  step: string;
  hazard: string;
  type: "بيولوجي" | "كيميائي" | "فيزيائي";
  severity: "منخفض" | "متوسط" | "عالي" | "حرج";
  likelihood: "نادر" | "محتمل" | "متوقع";
  controlMeasure: string;
  isCCP: boolean;
}

interface CCPRow {
  id: string;
  ccpNumber: string;
  hazard: string;
  criticalLimit: string;
  monitoring: string;
  frequency: string;
  correctiveAction: string;
  verification: string;
  records: string;
}

const DEFAULT_HAZARDS: HazardRow[] = [
  { id: "1", step: "استلام المياه الخام", hazard: "تلوث ميكروبي", type: "بيولوجي", severity: "عالي", likelihood: "محتمل", controlMeasure: "فحص مصدر المياه وتحليل دوري", isCCP: false },
  { id: "2", step: "الترشيح", hazard: "عدم كفاءة المرشحات", type: "فيزيائي", severity: "متوسط", likelihood: "محتمل", controlMeasure: "صيانة دورية واستبدال المرشحات", isCCP: false },
  { id: "3", step: "التعقيم بالأوزون", hazard: "بقاء كائنات ممرضة", type: "بيولوجي", severity: "حرج", likelihood: "محتمل", controlMeasure: "مراقبة تركيز الأوزون والوقت", isCCP: true },
  { id: "4", step: "التعبئة", hazard: "تلوث من العبوات", type: "بيولوجي", severity: "عالي", likelihood: "نادر", controlMeasure: "تعقيم العبوات قبل التعبئة", isCCP: true },
  { id: "5", step: "التخزين", hazard: "نمو طحالب (ضوء/حرارة)", type: "بيولوجي", severity: "متوسط", likelihood: "محتمل", controlMeasure: "تخزين بعيداً عن الضوء، درجة حرارة مناسبة", isCCP: false },
];

const DEFAULT_CCPS: CCPRow[] = [
  {
    id: "1", ccpNumber: "CCP-1", hazard: "بقاء كائنات ممرضة بعد التعقيم",
    criticalLimit: "تركيز الأوزون ≥ 0.4 ppm لمدة ≥ 4 دقائق",
    monitoring: "قياس تركيز الأوزون ووقت التلامس",
    frequency: "كل دفعة إنتاج",
    correctiveAction: "إعادة التعقيم - فحص جهاز الأوزون - حجز الدفعة",
    verification: "تحليل ميكروبي أسبوعي - معايرة أجهزة القياس",
    records: "سجل التعقيم - سجل التحاليل"
  },
  {
    id: "2", ccpNumber: "CCP-2", hazard: "تلوث العبوات أثناء التعبئة",
    criticalLimit: "صفر تلوث ميكروبي على العبوات",
    monitoring: "فحص عينات عشوائية من العبوات المعقمة",
    frequency: "كل ساعتين أثناء الإنتاج",
    correctiveAction: "إيقاف التعبئة - إعادة تعقيم العبوات - فحص خط التعبئة",
    verification: "مسحات سطحية يومية - مراجعة السجلات",
    records: "سجل فحص العبوات - سجل المسحات"
  },
];

let rowId = 50;

const HACCPTables = () => {
  const [view, setView] = useState<"hazards" | "ccps">("hazards");
  const [hazards, setHazards] = useState<HazardRow[]>(DEFAULT_HAZARDS);
  const [ccps, setCCPs] = useState<CCPRow[]>(DEFAULT_CCPS);

  const addHazard = () => {
    const id = String(++rowId);
    setHazards((prev) => [...prev, {
      id, step: "", hazard: "", type: "بيولوجي", severity: "متوسط", likelihood: "محتمل", controlMeasure: "", isCCP: false,
    }]);
  };

  const updateHazard = (id: string, field: keyof HazardRow, value: any) => {
    setHazards((prev) => prev.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const removeHazard = (id: string) => {
    setHazards((prev) => prev.filter((h) => h.id !== id));
  };

  const addCCP = () => {
    const id = String(++rowId);
    setCCPs((prev) => [...prev, {
      id, ccpNumber: `CCP-${prev.length + 1}`, hazard: "", criticalLimit: "", monitoring: "", frequency: "", correctiveAction: "", verification: "", records: "",
    }]);
  };

  const updateCCP = (id: string, field: keyof CCPRow, value: string) => {
    setCCPs((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCCP = (id: string) => {
    setCCPs((prev) => prev.filter((c) => c.id !== id));
  };

  const exportTable = async () => {
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const el = document.getElementById("haccp-table-export");
      if (!el) return;
      await html2pdf().set({
        margin: 8,
        filename: view === "hazards" ? "تحليل-المخاطر.pdf" : "خطة-HACCP.pdf",
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      }).from(el).save();
      toast.success("تم التصدير بنجاح");
    } catch {
      toast.error("خطأ في التصدير");
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "حرج": return "bg-destructive/20 text-destructive";
      case "عالي": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "متوسط": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-card flex-wrap">
        <Select value={view} onValueChange={(v: "hazards" | "ccps") => setView(v)}>
          <SelectTrigger className="w-52 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hazards">جدول تحليل المخاطر</SelectItem>
            <SelectItem value="ccps">خطة HACCP (CCPs)</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={view === "hazards" ? addHazard : addCCP} className="gap-1.5">
          <Plus className="w-4 h-4" />
          إضافة صف
        </Button>
        <Button variant="outline" size="sm" onClick={exportTable} className="gap-1.5">
          <Download className="w-4 h-4" />
          تصدير PDF
        </Button>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <div id="haccp-table-export" dir="rtl" style={{ fontFamily: "Cairo" }}>
          {view === "hazards" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right min-w-[120px]">الخطوة</TableHead>
                  <TableHead className="text-right min-w-[140px]">الخطر</TableHead>
                  <TableHead className="text-right min-w-[80px]">النوع</TableHead>
                  <TableHead className="text-right min-w-[80px]">الشدة</TableHead>
                  <TableHead className="text-right min-w-[80px]">الاحتمال</TableHead>
                  <TableHead className="text-right min-w-[160px]">إجراء التحكم</TableHead>
                  <TableHead className="text-right min-w-[60px]">CCP?</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hazards.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <Input value={h.step} onChange={(e) => updateHazard(h.id, "step", e.target.value)} className="h-8 text-xs" />
                    </TableCell>
                    <TableCell>
                      <Input value={h.hazard} onChange={(e) => updateHazard(h.id, "hazard", e.target.value)} className="h-8 text-xs" />
                    </TableCell>
                    <TableCell>
                      <Select value={h.type} onValueChange={(v) => updateHazard(h.id, "type", v)}>
                        <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="بيولوجي">بيولوجي</SelectItem>
                          <SelectItem value="كيميائي">كيميائي</SelectItem>
                          <SelectItem value="فيزيائي">فيزيائي</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${severityColor(h.severity)}`}>
                        {h.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select value={h.likelihood} onValueChange={(v) => updateHazard(h.id, "likelihood", v)}>
                        <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="نادر">نادر</SelectItem>
                          <SelectItem value="محتمل">محتمل</SelectItem>
                          <SelectItem value="متوقع">متوقع</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input value={h.controlMeasure} onChange={(e) => updateHazard(h.id, "controlMeasure", e.target.value)} className="h-8 text-xs" />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={h.isCCP}
                        onChange={(e) => updateHazard(h.id, "isCCP", e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHazard(h.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right min-w-[70px]">رقم CCP</TableHead>
                  <TableHead className="text-right min-w-[130px]">الخطر</TableHead>
                  <TableHead className="text-right min-w-[130px]">الحد الحرج</TableHead>
                  <TableHead className="text-right min-w-[120px]">المراقبة</TableHead>
                  <TableHead className="text-right min-w-[80px]">التكرار</TableHead>
                  <TableHead className="text-right min-w-[130px]">الإجراء التصحيحي</TableHead>
                  <TableHead className="text-right min-w-[120px]">التحقق</TableHead>
                  <TableHead className="text-right min-w-[100px]">السجلات</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ccps.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Input value={c.ccpNumber} onChange={(e) => updateCCP(c.id, "ccpNumber", e.target.value)} className="h-8 text-xs w-20" />
                    </TableCell>
                    <TableCell>
                      <Textarea value={c.hazard} onChange={(e) => updateCCP(c.id, "hazard", e.target.value)} className="text-xs min-h-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Textarea value={c.criticalLimit} onChange={(e) => updateCCP(c.id, "criticalLimit", e.target.value)} className="text-xs min-h-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Textarea value={c.monitoring} onChange={(e) => updateCCP(c.id, "monitoring", e.target.value)} className="text-xs min-h-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Input value={c.frequency} onChange={(e) => updateCCP(c.id, "frequency", e.target.value)} className="h-8 text-xs" />
                    </TableCell>
                    <TableCell>
                      <Textarea value={c.correctiveAction} onChange={(e) => updateCCP(c.id, "correctiveAction", e.target.value)} className="text-xs min-h-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Textarea value={c.verification} onChange={(e) => updateCCP(c.id, "verification", e.target.value)} className="text-xs min-h-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Input value={c.records} onChange={(e) => updateCCP(c.id, "records", e.target.value)} className="h-8 text-xs" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCCP(c.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HACCPTables;
