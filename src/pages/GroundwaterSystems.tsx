import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Droplets,
  Filter,
  FlaskConical,
  Sparkles,
  Sun,
  Beaker,
  ExternalLink,
  Waves,
  TestTube,
  ShieldCheck,
  Pickaxe,
} from "lucide-react";

interface StandardRef {
  id: string;
  title: string;
  titleEn: string;
  org: string;
  description: string;
  url: string;
  icon: typeof Droplets;
}

const SOURCE_STANDARDS: StandardRef[] = [
  {
    id: "epa-gw",
    title: "معايير EPA لمياه الآبار الجوفية",
    titleEn: "EPA Ground Water & Drinking Water Standards",
    org: "U.S. Environmental Protection Agency",
    description:
      "اللوائح الفيدرالية الأمريكية للمياه الجوفية، حدود الملوثات الأولية والثانوية (NPDWR / NSDWR) ومتطلبات حماية مصادر المياه.",
    url: "https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations",
    icon: ShieldCheck,
  },
  {
    id: "fda-129",
    title: "FDA 21 CFR Part 129 – تصنيع المياه المعبأة",
    titleEn: "FDA 21 CFR Part 129 – Bottled Water Processing",
    org: "U.S. Food & Drug Administration",
    description:
      "الممارسات التصنيعية الجيدة (CGMP) لمياه الشرب المعبأة: حماية المصدر، التعقيم، التعبئة، ومراقبة الجودة.",
    url: "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-129",
    icon: FlaskConical,
  },
  {
    id: "fda-165",
    title: "FDA 21 CFR Part 165 – جودة المياه المعبأة",
    titleEn: "FDA 21 CFR Part 165 – Bottled Water Quality",
    org: "U.S. Food & Drug Administration",
    description: "الحدود الميكروبيولوجية والكيميائية والإشعاعية المسموح بها في المياه المعبأة الجاهزة للاستهلاك.",
    url: "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-165",
    icon: Beaker,
  },
  {
    id: "epa-uic",
    title: "برنامج EPA لحماية المياه الجوفية (UIC)",
    titleEn: "EPA Underground Injection Control Program",
    org: "U.S. Environmental Protection Agency",
    description: "متطلبات حماية الآبار من التلوث، تصنيف الآبار، والرقابة على الحقن تحت الأرض.",
    url: "https://www.epa.gov/uic",
    icon: Pickaxe,
  },
];

interface TreatmentStage {
  id: string;
  name: string;
  nameEn: string;
  icon: typeof Filter;
  purpose: string;
  technical: string;
  parameters: string[];
  reference: { label: string; url: string };
}

const TREATMENT_STAGES: TreatmentStage[] = [
  {
    id: "pre-filtration",
    name: "1. الترشيح الأولي (Pre-filtration)",
    nameEn: "Pre-filtration",
    icon: Filter,
    purpose: "إزالة العوالق والشوائب الكبيرة (الرمل، الصدأ، الطين) لحماية مراحل المعالجة اللاحقة.",
    technical:
      "يستخدم فلاتر متعددة الطبقات: فلتر رملي (Multi-Media)، فلتر كربوني (Activated Carbon) لإزالة الكلور والمواد العضوية، وفلتر دقيق 5 ميكرون.",
    parameters: ["العكارة < 1 NTU", "الكلور المتبقي < 0.1 ppm", "إزالة الجسيمات > 5 µm"],
    reference: {
      label: "WHO – Water Treatment Principles",
      url: "https://www.who.int/publications/i/item/9789241549950",
    },
  },
  {
    id: "ro",
    name: "2. التناضح العكسي (Reverse Osmosis - RO)",
    nameEn: "Reverse Osmosis",
    icon: Droplets,
    purpose: "إزالة الأملاح الذائبة والمعادن الثقيلة والملوثات الكيميائية بنسبة تصل إلى 99%.",
    technical:
      "أغشية شبه نفاذة بضغط 8-15 بار، تفصل الأيونات والجزيئات. يتطلب نظام CIP دوري للتنظيف ومعدل استرداد 50-75%.",
    parameters: ["TDS الناتج < 50 ppm", "ضغط التشغيل 10-12 bar", "نسبة الرفض > 98%"],
    reference: {
      label: "WHO – Desalination for Safe Water Supply",
      url: "https://www.who.int/publications/i/item/WHO-SDE-WSH-07-0",
    },
  },
  {
    id: "mineral",
    name: "3. إعادة الأملاح المعدنية (Mineral Dosing)",
    nameEn: "Mineral Dosing",
    icon: Sparkles,
    purpose: "إضافة المعادن الأساسية (كالسيوم، مغنيسيوم، بيكربونات) لتحسين الطعم والقيمة الصحية بعد RO.",
    technical:
      "حقن محسوب لمحاليل الكالسيوم والمغنيسيوم، أو إمرار المياه عبر طبقات حجر الكلس (Calcite). ضبط TDS النهائي 80-200 ppm.",
    parameters: ["TDS النهائي 80-200 ppm", "pH 6.5 - 8.5", "العسر 30-150 mg/L CaCO₃"],
    reference: {
      label: "WHO – Calcium and Magnesium in Drinking Water",
      url: "https://www.who.int/publications/i/item/9789241563550",
    },
  },
  {
    id: "ozone-uv",
    name: "4. التعقيم بالأوزون والأشعة فوق البنفسجية",
    nameEn: "Ozone & UV Sterilization",
    icon: Sun,
    purpose: "القضاء التام على البكتيريا والفيروسات والطفيليات دون ترك مخلفات كيميائية.",
    technical:
      "أوزون بتركيز 0.2-0.4 ppm لمدة 4-10 دقائق، يليه UV بطول موجة 254 nm وجرعة ≥ 40 mJ/cm². تعقيم نهائي قبل التعبئة.",
    parameters: ["O₃ المتبقي 0.1-0.4 ppm", "UV ≥ 40 mJ/cm²", "العد البكتيري الكلي = 0 CFU/mL"],
    reference: {
      label: "WHO – Disinfectants in Drinking Water",
      url: "https://www.who.int/publications/i/item/9789241548151",
    },
  },
];

interface LimitRow {
  parameter: string;
  unit: string;
  rawWell: string;
  finished: string;
  reference: string;
}

const LIMITS: LimitRow[] = [
  { parameter: "العكارة (Turbidity)", unit: "NTU", rawWell: "≤ 5", finished: "≤ 1", reference: "ES 1589 / Codex" },
  { parameter: "اللون", unit: "TCU", rawWell: "≤ 15", finished: "≤ 5", reference: "ES 1589" },
  { parameter: "درجة الحموضة (pH)", unit: "—", rawWell: "6.5 - 8.5", finished: "6.5 - 8.5", reference: "Codex 48-2001" },
  { parameter: "إجمالي الأملاح الذائبة (TDS)", unit: "mg/L", rawWell: "≤ 1500", finished: "≤ 1000", reference: "ES 1589" },
  { parameter: "العسر الكلي", unit: "mg/L CaCO₃", rawWell: "≤ 500", finished: "≤ 500", reference: "ES 1589" },
  { parameter: "الكلوريدات", unit: "mg/L", rawWell: "≤ 500", finished: "≤ 250", reference: "Codex 48-2001" },
  { parameter: "الكبريتات", unit: "mg/L", rawWell: "≤ 400", finished: "≤ 250", reference: "ES 1589" },
  { parameter: "النترات (NO₃)", unit: "mg/L", rawWell: "≤ 50", finished: "≤ 50", reference: "Codex / WHO" },
  { parameter: "النتريت (NO₂)", unit: "mg/L", rawWell: "≤ 0.2", finished: "≤ 0.02", reference: "Codex 48-2001" },
  { parameter: "الحديد (Fe)", unit: "mg/L", rawWell: "≤ 1.0", finished: "≤ 0.3", reference: "ES 1589" },
  { parameter: "المنجنيز (Mn)", unit: "mg/L", rawWell: "≤ 0.5", finished: "≤ 0.1", reference: "ES 1589" },
  { parameter: "الزرنيخ (As)", unit: "mg/L", rawWell: "≤ 0.01", finished: "≤ 0.01", reference: "Codex / WHO" },
  { parameter: "الرصاص (Pb)", unit: "mg/L", rawWell: "≤ 0.01", finished: "≤ 0.01", reference: "Codex 48-2001" },
  { parameter: "العد البكتيري الكلي", unit: "CFU/mL", rawWell: "≤ 500", finished: "0", reference: "ES 1589" },
  { parameter: "القولونيات الكلية (Coliforms)", unit: "/100 mL", rawWell: "غير محدد", finished: "غير قابل للكشف", reference: "Codex 48-2001" },
  { parameter: "E. coli", unit: "/100 mL", rawWell: "غير قابل للكشف", finished: "غير قابل للكشف", reference: "WHO / Codex" },
];

const GroundwaterSystems = () => {
  const [activeStage, setActiveStage] = useState<string>(TREATMENT_STAGES[0].id);

  return (
    <div className="flex-1 overflow-y-auto bg-background" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4 border-b pb-5">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shrink-0">
            <Waves className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">المياه الجوفية وأنظمة المعالجة</h1>
            <p className="text-sm text-muted-foreground mt-1">
              وحدة فنية متخصصة في معايير المياه الجوفية، مراحل المعالجة، والحدود القياسية للمياه الخام والمعبأة.
            </p>
          </div>
        </div>

        <Tabs defaultValue="standards" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="standards" className="gap-2 py-2.5">
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">معايير المصدر</span>
              <span className="sm:hidden">المعايير</span>
            </TabsTrigger>
            <TabsTrigger value="treatment" className="gap-2 py-2.5">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">مراحل المعالجة</span>
              <span className="sm:hidden">المعالجة</span>
            </TabsTrigger>
            <TabsTrigger value="limits" className="gap-2 py-2.5">
              <TestTube className="w-4 h-4" />
              <span className="hidden sm:inline">الحدود القياسية</span>
              <span className="sm:hidden">الحدود</span>
            </TabsTrigger>
          </TabsList>

          {/* Source Water Standards */}
          <TabsContent value="standards" className="mt-5 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {SOURCE_STANDARDS.map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base leading-tight">{s.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1" dir="ltr">{s.titleEn}</p>
                          <Badge variant="secondary" className="mt-2 text-[10px]">{s.org}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <CardDescription className="text-sm leading-relaxed">{s.description}</CardDescription>
                      <Button asChild variant="outline" size="sm" className="w-full gap-2">
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                          فتح المرجع الرسمي
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Treatment Stages */}
          <TabsContent value="treatment" className="mt-5 space-y-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {TREATMENT_STAGES.map((stage) => {
                const Icon = stage.icon;
                const isActive = activeStage === stage.id;
                return (
                  <button
                    key={stage.id}
                    onClick={() => setActiveStage(stage.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-11 h-11 rounded-lg ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium leading-tight">{stage.nameEn}</span>
                  </button>
                );
              })}
            </div>

            {TREATMENT_STAGES.filter((s) => s.id === activeStage).map((stage) => {
              const Icon = stage.icon;
              return (
                <Card key={stage.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary text-primary-foreground">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{stage.name}</CardTitle>
                        <p className="text-xs text-muted-foreground" dir="ltr">{stage.nameEn}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">الهدف</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{stage.purpose}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">الوصف الفني</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{stage.technical}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">معايير التشغيل</h4>
                      <div className="flex flex-wrap gap-2">
                        {stage.parameters.map((p, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-normal">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <a href={stage.reference.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                          {stage.reference.label}
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Standard Limits Table */}
          <TabsContent value="limits" className="mt-5 space-y-3">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <TestTube className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">جدول الحدود القياسية</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      مقارنة الحدود المسموح بها بين مياه الآبار الخام والمياه المعبأة النهائية وفقاً للمواصفة المصرية
                      <span className="font-semibold text-foreground"> ES 1589 </span>
                      و
                      <span className="font-semibold text-foreground"> Codex Stan 48-2001</span>.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right font-bold">المعيار</TableHead>
                        <TableHead className="text-right font-bold">الوحدة</TableHead>
                        <TableHead className="text-right font-bold">مياه الآبار الخام</TableHead>
                        <TableHead className="text-right font-bold">المياه المعبأة</TableHead>
                        <TableHead className="text-right font-bold">المرجع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {LIMITS.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.parameter}</TableCell>
                          <TableCell className="text-muted-foreground text-xs" dir="ltr">{row.unit}</TableCell>
                          <TableCell dir="ltr" className="text-right">{row.rawWell}</TableCell>
                          <TableCell dir="ltr" className="text-right text-primary font-semibold">{row.finished}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal">{row.reference}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    المواصفة المصرية ES 1589
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    المواصفة القياسية المصرية لمياه الشرب المعبأة الصادرة عن الهيئة المصرية العامة للمواصفات والجودة (EOS).
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-full gap-2">
                    <a href="https://www.eos.org.eg/en" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      الهيئة المصرية للمواصفات
                    </a>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Codex Stan 48-2001
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    المعيار الدولي للمياه المعبأة بخلاف المياه المعدنية الطبيعية، الصادر عن هيئة الدستور الغذائي (Codex Alimentarius).
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-full gap-2">
                    <a href="https://www.fao.org/fao-who-codexalimentarius/sh-proxy/en/?lnk=1&url=https%253A%252F%252Fworkspace.fao.org%252Fsites%252Fcodex%252FStandards%252FCXS%2B227-2001%252FCXS_227e.pdf" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Codex Alimentarius
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GroundwaterSystems;
