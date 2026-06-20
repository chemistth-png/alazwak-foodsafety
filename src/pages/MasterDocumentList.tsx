import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Eye,
  Trash2,
  Loader2,
  Search,
  Printer,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import DocumentHeader from "@/components/DocumentHeader";

interface DocRow {
  id: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
  content: string;
}

const MasterDocumentList = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id, file_name, file_size, created_at, content")
      .order("created_at", { ascending: false });
    if (error) toast.error("فشل تحميل قائمة الوثائق");
    setDocs((data as DocRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return toast.error("فشل الحذف");
    toast.success("تم الحذف");
    setDocs((p) => p.filter((d) => d.id !== id));
  };

  const filtered = search
    ? docs.filter((d) => d.file_name.toLowerCase().includes(search.toLowerCase()))
    : docs;

  const codeFor = (d: DocRow, i: number) =>
    `DOC-${String(filtered.length - i).padStart(3, "0")}`;

  const statusBadge = (d: DocRow) => {
    const len = d.content?.length || 0;
    if (len > 5000) return <Badge>معتمدة</Badge>;
    if (len > 0) return <Badge variant="secondary">قيد المراجعة</Badge>;
    return <Badge variant="outline">مسودة</Badge>;
  };

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-background">
      <DocumentHeader
        docCode="F-01-1"
        version="01"
        title="قائمة الوثائق الرئيسية - Master Document List"
      />

      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">قائمة الوثائق الرئيسية</h1>
            <p className="text-xs text-muted-foreground">
              F-01-1 • {docs.length} وثيقة
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 ms-2" />
            طباعة
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="px-4 pt-4 pb-2 max-w-6xl mx-auto w-full print:hidden">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="pr-9 rounded-xl"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-20 md:pb-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              لا توجد وثائق. ارفع مستندات من شاشة الشات لإضافتها هنا.
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الكود</TableHead>
                    <TableHead className="text-right">العنوان</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right print:hidden">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d, i) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{codeFor(d, i)}</TableCell>
                      <TableCell className="font-medium">{d.file_name}</TableCell>
                      <TableCell>{statusBadge(d)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell className="print:hidden">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate("/documents")}
                            title="عرض"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const blob = new Blob([d.content], { type: "text/plain;charset=utf-8" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = d.file_name + ".txt";
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            title="تنزيل"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الوثيقة</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل تريد حذف "{d.file_name}"؟
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogAction
                                  onClick={() => handleDelete(d.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterDocumentList;
