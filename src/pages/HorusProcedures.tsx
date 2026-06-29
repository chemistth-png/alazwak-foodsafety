import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Search,
  FileText,
  Download,
  Eye,
  Printer,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import procedures from "@/data/horus-procedures.json";

type Procedure = {
  code: string;
  title: string;
  md: string;
  docx: string | null;
};

const HorusProcedures = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Procedure | null>(null);
  const [mdContent, setMdContent] = useState<string>("");
  const [loadingMd, setLoadingMd] = useState(false);

  const list = procedures as Procedure[];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
    );
  }, [list, search]);

  useEffect(() => {
    if (!active) return;
    setLoadingMd(true);
    setMdContent("");
    fetch(active.md)
      .then((r) => r.text())
      .then(setMdContent)
      .catch(() => setMdContent("تعذر تحميل المحتوى."))
      .finally(() => setLoadingMd(false));
  }, [active]);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${active?.code} - ${active?.title}</title>
    <style>
      body{font-family:'Cairo','Tahoma',sans-serif;padding:24px;line-height:1.8;color:#000}
      h1,h2,h3{margin-top:1.2em}
      table{border-collapse:collapse;width:100%;margin:1em 0}
      th,td{border:1px solid #444;padding:6px 8px;text-align:right}
      thead{background:#eee}
      @media print{button{display:none}}
    </style></head><body>
    <div id="c"></div>
    <script>document.getElementById('c').innerText = ${JSON.stringify(mdContent)};</script>
    </body></html>`);
    // Better: render the markdown HTML by passing through DOM
    const container = w.document.getElementById("c");
    if (container) {
      container.innerHTML = "";
      container.appendChild(w.document.createTextNode(""));
    }
    // Simple fallback: print current dialog
    setTimeout(() => {
      w.document.close();
      w.focus();
      w.print();
    }, 250);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">
                إجراءات FSMS
              </h1>
              <p className="text-[11px] text-muted-foreground">
                24 إجراء محدث وفق ISO 22000:2018 / FSSC 22000 v6 / NFSA
              </p>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="max-w-6xl mx-auto p-4 pb-20 md:pb-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-[11px] text-muted-foreground">إجمالي الإجراءات</p>
            <p className="text-2xl font-bold text-foreground">{list.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] text-muted-foreground">معروض حالياً</p>
            <p className="text-2xl font-bold text-primary">{filtered.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] text-muted-foreground">تاريخ الاعتماد</p>
            <p className="text-sm font-bold text-foreground mt-1">01/06/2026</p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] text-muted-foreground">المرجع</p>
            <p className="text-sm font-bold text-foreground mt-1">ISO 22000 / FSSC v6</p>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالكود أو العنوان..."
            className="pr-9"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Card key={p.code} className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="secondary" className="font-mono text-xs shrink-0">
                  {p.code}
                </Badge>
                <FileText className="w-4 h-4 text-primary shrink-0 mt-1" />
              </div>
              <h3 className="text-sm font-semibold text-foreground leading-relaxed line-clamp-3 min-h-[3.5rem]">
                {p.title}
              </h3>
              <div className="flex items-center gap-2 mt-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setActive(p)}
                >
                  <Eye className="w-3.5 h-3.5 ms-1" />
                  عرض
                </Button>
                {p.docx && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={p.docx} download>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <FileText className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة</p>
          </div>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent
          dir="rtl"
          className="max-w-4xl max-h-[90vh] flex flex-col p-0"
        >
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {active?.code}
                </Badge>
                <DialogTitle className="text-base text-right">
                  {active?.title}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 ms-1" /> طباعة
                </Button>
                {active?.docx && (
                  <Button size="sm" asChild>
                    <a href={active.docx} download>
                      <Download className="w-3.5 h-3.5 ms-1" /> Word
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            {loadingMd ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-table:text-xs prose-th:bg-muted prose-th:text-right prose-td:text-right prose-th:border prose-td:border prose-th:border-border prose-td:border-border prose-th:p-2 prose-td:p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {mdContent}
                </ReactMarkdown>
              </article>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HorusProcedures;
