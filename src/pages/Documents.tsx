import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
import {
  ArrowRight,
  FileText,
  Trash2,
  Search,
  Loader2,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

interface Document {
  id: string;
  file_name: string;
  content: string;
  file_size: number;
  created_at: string;
}

const Documents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDocuments(data as Document[]);
    if (error) console.error(error);
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      toast.error("فشل في حذف المستند");
    } else {
      toast.success("تم حذف المستند بنجاح");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const filtered = search.trim()
    ? documents.filter(
        (d) =>
          d.file_name.toLowerCase().includes(search.toLowerCase()) ||
          d.content.toLowerCase().includes(search.toLowerCase())
      )
    : documents;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              إدارة المستندات
            </h1>
            <p className="text-xs text-muted-foreground">
              {documents.length} مستند محفوظ في قاعدة المعرفة
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Search */}
      <div className="px-4 pt-4 pb-2 max-w-3xl mx-auto w-full">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في المستندات..."
            className="pr-9 rounded-xl"
          />
        </div>
      </div>

      {/* Documents List */}
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-accent">
                <FileText className="w-8 h-8 text-accent-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {search.trim()
                  ? "لا توجد نتائج مطابقة"
                  : "لا توجد مستندات محفوظة بعد. ارفع ملفات من الشات لإضافتها."}
              </p>
              {!search.trim() && (
                <Button variant="outline" onClick={() => navigate("/")}>
                  العودة للشات
                </Button>
              )}
            </div>
          ) : (
            filtered.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Doc header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent shrink-0">
                    <FileText className="w-4.5 h-4.5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {doc.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.created_at)} • {formatSize(doc.file_size)} •{" "}
                      {doc.content.length.toLocaleString()} حرف
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setExpandedId(expandedId === doc.id ? null : doc.id)
                      }
                      title="معاينة المحتوى"
                    >
                      {expandedId === doc.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="حذف المستند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف المستند</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف "{doc.file_name}"؟ سيتم إزالته
                            من قاعدة المعرفة ولن يتمكن المساعد الذكي من
                            الرجوع إليه.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row-reverse gap-2">
                          <AlertDialogAction
                            onClick={() => handleDelete(doc.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            حذف
                          </AlertDialogAction>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Expanded content preview */}
                {expandedId === doc.id && (
                  <div className="border-t px-4 py-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">
                      معاينة المحتوى:
                    </p>
                    <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
                      {doc.content.length > 3000
                        ? doc.content.slice(0, 3000) + "\n\n... [باقي المحتوى مقتطع]"
                        : doc.content}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Documents;
