import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowRight, Camera, CheckCircle2, XCircle, AlertTriangle,
  ClipboardList, Loader2, Bug, Droplets, ShieldCheck, Upload
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface ChecklistItem { id: string; text: string; }
interface Checklist { id: string; label: string; icon: any; color: string; items: ChecklistItem[]; }

const CHECKLISTS: Checklist[] = [
  {
    id: "pest_control",
    label: "مكافحة الآفات",
    icon: Bug,
    color: "bg-red-500/10 text-red-600",
    items: [
      { id: "p1", text: "جميع محطات الطُعم مثبتة ومُرقّمة" },
      { id: "p2", text: "لا توجد آثار قوارض أو حشرات في مناطق الإنتاج" },
      { id: "p3", text: "الأبواب الخارجية محكمة الإغلاق" },
      { id: "p4", text: "مصائد الحشرات الضوئية (UV) تعمل ونظيفة" },
      { id: "p5", text: "سجل زيارة شركة مكافحة الآفات محدث" },
    ],
  },
  {
    id: "filters",
    label: "نظافة الفلاتر",
    icon: Droplets,
    color: "bg-cyan-500/10 text-cyan-600",
    items: [
      { id: "f1", text: "فلاتر الرمل (Sand Filter) تم غسلها العكسي (Backwash)" },
      { id: "f2", text: "فلاتر الكربون (Carbon Filter) ضمن العمر الافتراضي" },
      { id: "f3", text: "أغشية RO ضغطها ضمن الحدود المسموحة" },
      { id: "f4", text: "فلاتر Micron نظيفة أو تم استبدالها" },
      { id: "f5", text: "لا توجد تسربات في خطوط المعالجة" },
    ],
  },
  {
    id: "ccp",
    label: "نقاط التحكم الحرجة (CCP)",
    icon: ShieldCheck,
    color: "bg-orange-500/10 text-orange-600",
    items: [
      { id: "c1", text: "درجة حرارة البسترة ضمن الحد الحرج" },
      { id: "c2", text: "تركيز الكلور المتبقي مطابق للمواصفة" },
      { id: "c3", text: "كاشف المعادن يعمل ومُعاير" },
      { id: "c4", text: "سجلات المراقبة موقّعة ومكتملة" },
      { id: "c5", text: "إجراءات الاستجابة للانحراف موثقة" },
    ],
  },
];

type Answer = "yes" | "no" | "improve" | null;

const GembaWalk = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeList, setActiveList] = useState<Checklist | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [deviationOpen, setDeviationOpen] = useState(false);
  const [deviationItem, setDeviationItem] = useState<ChecklistItem | null>(null);
  const [deviationNote, setDeviationNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openDeviation = (item: ChecklistItem, ans: Answer) => {
    setAnswers(prev => ({ ...prev, [item.id]: ans }));
    setDeviationItem(item);
    setDeviationNote("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setDeviationOpen(true);
    // trigger camera on mobile
    setTimeout(() => fileRef.current?.click(), 200);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const saveDeviation = async () => {
    if (!user || !deviationItem || !activeList) return;
    setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const path = `${user.id}/gemba/${Date.now()}-${photoFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("chat-files").upload(path, photoFile);
        if (upErr) throw upErr;
        photoUrl = path;
      }
      const severity = answers[deviationItem.id] === "no" ? "major" : "minor";
      const count = await supabase.from("nc_reports").select("id", { count: "exact", head: true });
      const num = (count.count || 0) + 1;
      const { error } = await supabase.from("nc_reports").insert({
        user_id: user.id,
        report_number: `NC-GEMBA-${String(num).padStart(4, "0")}`,
        title: `[Gemba - ${activeList.label}] ${deviationItem.text}`,
        description: [
          `تم رصد انحراف أثناء جولة Gemba في قائمة: ${activeList.label}`,
          `البند: ${deviationItem.text}`,
          `التقييم: ${answers[deviationItem.id] === "no" ? "لا (غير مطابق)" : "يحتاج تحسين"}`,
          deviationNote ? `ملاحظات المُدقق: ${deviationNote}` : "",
          photoUrl ? `مرفق صورة: ${photoUrl}` : "",
        ].filter(Boolean).join("\n"),
        category: activeList.id === "pest_control" ? "hygiene" : activeList.id === "filters" ? "equipment" : "process",
        severity,
        status: "open",
      });
      if (error) throw error;
      toast.success("تم إنشاء تقرير عدم مطابقة");
      setDeviationOpen(false);
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const skipDeviation = () => {
    if (deviationItem) setAnswers(prev => ({ ...prev, [deviationItem.id]: null }));
    setDeviationOpen(false);
  };

  const AnswerButton = ({ item }: { item: ChecklistItem }) => {
    const ans = answers[item.id];
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm" variant={ans === "yes" ? "default" : "outline"}
          className={`h-9 gap-1 ${ans === "yes" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
          onClick={() => setAnswers(p => ({ ...p, [item.id]: "yes" }))}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> نعم
        </Button>
        <Button
          size="sm" variant={ans === "improve" ? "default" : "outline"}
          className={`h-9 gap-1 ${ans === "improve" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
          onClick={() => openDeviation(item, "improve")}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> تحسين
        </Button>
        <Button
          size="sm" variant={ans === "no" ? "default" : "outline"}
          className={`h-9 gap-1 ${ans === "no" ? "bg-destructive hover:bg-destructive/90" : ""}`}
          onClick={() => openDeviation(item, "no")}
        >
          <XCircle className="w-3.5 h-3.5" /> لا
        </Button>
      </div>
    );
  };

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => activeList ? setActiveList(null) : navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">جولة Gemba - التفتيش الميداني</h1>
            <p className="text-xs text-muted-foreground">
              {activeList ? activeList.label : "اختر قائمة فحص للبدء"}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex-1 overflow-auto px-4 py-4 pb-20 md:pb-4">
        <div className="max-w-4xl mx-auto">
          {!activeList ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CHECKLISTS.map(cl => {
                const Icon = cl.icon;
                return (
                  <button
                    key={cl.id}
                    onClick={() => { setActiveList(cl); setAnswers({}); }}
                    className="flex flex-col items-start gap-3 p-5 rounded-xl border bg-card text-right hover:border-primary/40 hover:bg-accent transition-all"
                  >
                    <div className={`p-3 rounded-lg ${cl.color}`}><Icon className="w-6 h-6" /></div>
                    <div>
                      <p className="font-bold text-foreground">{cl.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{cl.items.length} بنود</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {activeList.items.map((item, idx) => {
                const ans = answers[item.id];
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-relaxed">
                          <span className="text-muted-foreground me-2">{idx + 1}.</span>
                          {item.text}
                        </p>
                        {ans && (
                          <Badge
                            variant="outline"
                            className={`mt-2 text-[10px] ${
                              ans === "yes" ? "border-emerald-500 text-emerald-600" :
                              ans === "no" ? "border-destructive text-destructive" :
                              "border-amber-500 text-amber-600"
                            }`}
                          >
                            {ans === "yes" ? "مطابق" : ans === "no" ? "غير مطابق - تم رفع NCR" : "يحتاج تحسين - تم رفع NCR"}
                          </Badge>
                        )}
                      </div>
                      <AnswerButton item={item} />
                    </CardContent>
                  </Card>
                );
              })}
              <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
                <span>
                  تم الرد على {Object.values(answers).filter(Boolean).length} من {activeList.items.length}
                </span>
                <Button size="sm" variant="outline" onClick={() => navigate("/nc-reports")}>
                  عرض تقارير عدم المطابقة
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={deviationOpen} onOpenChange={(o) => !o && skipDeviation()}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> توثيق الانحراف
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-sm">{deviationItem?.text}</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              className="hidden"
            />
            <Button variant="outline" className="w-full gap-2" onClick={() => fileRef.current?.click()}>
              <Camera className="w-4 h-4" />
              {photoFile ? "تغيير الصورة" : "التقاط صورة للانحراف"}
            </Button>
            {photoPreview && (
              <img src={photoPreview} alt="صورة معاينة للانحراف المرصود" className="w-full h-48 object-cover rounded-lg border" />
            )}
            <Textarea
              value={deviationNote}
              onChange={(e) => setDeviationNote(e.target.value)}
              placeholder="ملاحظات إضافية (اختياري)"
              rows={3}
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={saveDeviation} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              حفظ وإنشاء NCR
            </Button>
            <Button variant="outline" onClick={skipDeviation}>تخطي</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GembaWalk;
