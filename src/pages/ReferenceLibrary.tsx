import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, BookOpen, Globe, Droplets, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Category = "local" | "international" | "water";

interface Reference {
  id: string;
  category: Category;
  nameAr: string;
  nameEn: string;
  description: string;
  url: string;
  organization: string;
  keywords: string[];
}

const REFERENCES: Reference[] = [
  {
    id: "nfsa",
    category: "local",
    nameAr: "الهيئة القومية لسلامة الغذاء - اللوائح الفنية",
    nameEn: "National Food Safety Authority (NFSA) - Technical Regulations",
    description:
      "اللوائح الفنية المصرية الرسمية لسلامة الغذاء، المواصفات والاشتراطات الصحية للمنشآت الغذائية ومنتجاتها داخل جمهورية مصر العربية.",
    url: "https://www.nfsa.gov.eg/",
    organization: "NFSA - مصر",
    keywords: ["nfsa", "مصر", "egypt", "لوائح", "regulations", "سلامة الغذاء", "food safety"],
  },
  {
    id: "codex",
    category: "international",
    nameAr: "دستور الأغذية - قواعد البيانات (GSFA / المبيدات)",
    nameEn: "Codex Alimentarius Online Databases (GSFA / Pesticides)",
    description:
      "المعيار الدولي العام للمضافات الغذائية وقواعد بيانات الحدود القصوى لمتبقيات المبيدات، الصادر عن منظمة الأغذية والزراعة ومنظمة الصحة العالمية.",
    url: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/dbs/en/",
    organization: "FAO / WHO",
    keywords: ["codex", "gsfa", "pesticides", "مبيدات", "مضافات", "additives", "international"],
  },
  {
    id: "who-water",
    category: "international",
    nameAr: "إرشادات منظمة الصحة العالمية لجودة مياه الشرب",
    nameEn: "WHO Drinking Water Guidelines",
    description:
      "المرجع الدولي المعتمد لجودة مياه الشرب، يتضمن الحدود الميكروبيولوجية والكيميائية والإشعاعية لضمان مياه آمنة للاستهلاك البشري.",
    url: "https://www.who.int/publications/i/item/9789240045064",
    organization: "World Health Organization",
    keywords: ["who", "water", "مياه", "drinking water", "guidelines", "إرشادات"],
  },
  {
    id: "fda-129",
    category: "water",
    nameAr: "FDA 21 CFR Part 129 - المياه المعبأة",
    nameEn: "FDA 21 CFR Part 129 (Bottled Water)",
    description:
      "اللائحة الفيدرالية الأمريكية الخاصة بممارسات التصنيع والتعبئة والاحتفاظ بالمياه المعبأة، تشمل اشتراطات المنشأة والمعدات وعمليات التعقيم.",
    url: "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-129",
    organization: "U.S. FDA",
    keywords: ["fda", "cfr", "bottled water", "مياه معبأة", "21 cfr", "129"],
  },
  {
    id: "ibwa",
    category: "water",
    nameAr: "ملخصات دليل IBWA لجمعية المياه المعبأة الدولية",
    nameEn: "IBWA Manual Summaries",
    description:
      "ملخصات دليل العمليات النموذجية لجمعية المياه المعبأة الدولية (IBWA Model Code)، يغطي معايير الجودة وممارسات التصنيع الجيدة لمصانع المياه.",
    url: "https://bottledwater.org/education/ibwa-bottled-water-code-of-practice/",
    organization: "IBWA",
    keywords: ["ibwa", "model code", "bottled water", "مياه", "دليل"],
  },
];

const TAB_META: Record<Category, { label: string; icon: typeof MapPin; color: string }> = {
  local: { label: "محلي (مصر)", icon: MapPin, color: "text-primary" },
  international: { label: "دولي (WHO/FAO)", icon: Globe, color: "text-primary" },
  water: { label: "تكنولوجيا المياه", icon: Droplets, color: "text-primary" },
};

const ReferenceLibrary = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Category | "favorites">("local");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("reference_favorites")
      .select("reference_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setFavorites(new Set(data.map((r) => r.reference_id)));
      });
  }, [user]);

  const toggleFav = async (id: string) => {
    if (!user) {
      toast.error("سجّل الدخول لحفظ المفضلة");
      return;
    }
    const isFav = favorites.has(id);
    const next = new Set(favorites);
    if (isFav) {
      next.delete(id);
      setFavorites(next);
      await supabase.from("reference_favorites").delete().eq("user_id", user.id).eq("reference_id", id);
    } else {
      next.add(id);
      setFavorites(next);
      await supabase.from("reference_favorites").insert({ user_id: user.id, reference_id: id });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REFERENCES.filter((r) => {
      if (tab === "favorites" ? !favorites.has(r.id) : r.category !== tab) return false;
      if (!q) return true;
      const haystack = [r.nameAr, r.nameEn, r.description, r.organization, ...r.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, tab]);

  const counts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (r: Reference) =>
      !q ||
      [r.nameAr, r.nameEn, r.description, r.organization, ...r.keywords]
        .join(" ")
        .toLowerCase()
        .includes(q);
    return {
      local: REFERENCES.filter((r) => r.category === "local" && match(r)).length,
      international: REFERENCES.filter((r) => r.category === "international" && match(r)).length,
      water: REFERENCES.filter((r) => r.category === "water" && match(r)).length,
    };
  }, [search]);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24 md:pb-8" dir="rtl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                المكتبة المرجعية الرقمية
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Digital Reference Library — مصادر سلامة الغذاء وجودة المياه
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الكلمة المفتاحية..."
            className="pr-10 h-11 bg-card"
          />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as Category)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full h-auto p-1 mb-6">
            {(Object.keys(TAB_META) as Category[]).map((key) => {
              const { label, icon: Icon } = TAB_META[key];
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex flex-col md:flex-row items-center gap-1.5 md:gap-2 py-2.5 text-xs md:text-sm"
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                  >
                    {counts[key]}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(TAB_META) as Category[]).map((key) => (
            <TabsContent key={key} value={key} className="mt-0">
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">لا توجد مراجع مطابقة لبحثك في هذا القسم</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered.map((ref) => (
                    <Card
                      key={ref.id}
                      className="flex flex-col hover:shadow-md hover:border-primary/40 transition-all group"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {ref.organization}
                          </Badge>
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                            {(() => {
                              const Icon = TAB_META[ref.category].icon;
                              return <Icon className="w-4 h-4" />;
                            })()}
                          </div>
                        </div>
                        <CardTitle className="text-base md:text-lg leading-snug text-foreground">
                          {ref.nameAr}
                        </CardTitle>
                        <CardDescription className="text-xs font-medium text-muted-foreground/80" dir="ltr">
                          {ref.nameEn}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 justify-between gap-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {ref.description}
                        </p>
                        <Button
                          onClick={() => window.open(ref.url, "_blank", "noopener,noreferrer")}
                          className="w-full gap-2 group-hover:bg-primary/90"
                        >
                          <ExternalLink className="w-4 h-4" />
                          فتح المرجع
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default ReferenceLibrary;
