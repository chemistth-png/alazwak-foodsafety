import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowRight, FileText, Filter, Loader2, Search, FolderOpen } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";

interface Template {
  id: number;
  title: string;
  file_path: string;
  category: string;
  created_at: string;
}

const QMSTemplates = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("master_templates" as any)
        .select("id, title, file_path, category, created_at")
        .order("category", { ascending: true })
        .order("title", { ascending: true });
      if (error) {
        toast.error("تعذر تحميل القوالب");
        console.error(error);
      } else {
        setRows((data as any) || []);
      }
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQ = !q || r.title.toLowerCase().includes(q) || r.file_path.toLowerCase().includes(q);
      const matchC = category === "all" || r.category === category;
      return matchQ && matchC;
    });
  }, [rows, search, category]);

  const fileType = (p: string) => {
    const ext = p.split(".").pop()?.toLowerCase() || "";
    return ext.toUpperCase();
  };

  const folder = (p: string) => {
    const parts = p.split("/");
    return parts.slice(0, -1).join(" / ");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">
                GHP / SSOPs &amp; QMS Templates
              </h1>
              <p className="text-[11px] text-muted-foreground">
                مكتبة قوالب نظام إدارة الجودة وسلامة الغذاء
              </p>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="max-w-6xl mx-auto p-4 pb-20 md:pb-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-[11px] text-muted-foreground">إجمالي القوالب</p>
            <p className="text-2xl font-bold text-foreground">{rows.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] text-muted-foreground">التصنيفات</p>
            <p className="text-2xl font-bold text-foreground">{categories.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] text-muted-foreground">معروض حالياً</p>
            <p className="text-2xl font-bold text-primary">{filtered.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] text-muted-foreground">الإجراءات (Procedures)</p>
            <p className="text-2xl font-bold text-foreground">
              {rows.filter((r) => r.file_path.toLowerCase().includes("/procedure/")).length}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالعنوان أو المسار..."
              className="pr-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات ({rows.length})</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c} ({rows.filter((r) => r.category === c).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right w-[42%]">العنوان</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right hidden md:table-cell">المجلد</TableHead>
                    <TableHead className="text-right w-[80px]">النوع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{t.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {t.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[280px]">
                        {folder(t.file_path)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {fileType(t.file_path)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default QMSTemplates;
