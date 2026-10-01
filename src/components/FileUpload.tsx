import { useState, useRef } from "react";
import { Paperclip, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { invokeLovableFunction } from "@/lib/lovableFunctions";
import { toast } from "sonner";

const ALLOWED_EXTENSIONS = ["pdf", "docx", "doc", "xls", "xlsx", "jpg", "jpeg", "png", "webp", "rtf", "txt", "csv", "md"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface FileUploadProps {
  onFileProcessed: (fileName: string, fileText: string, documentId: string) => void;
  disabled?: boolean;
}

const FileUpload = ({ onFileProcessed, disabled }: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (inputRef.current) inputRef.current.value = "";

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("نوع الملف غير مدعوم. الأنواع المدعومة: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, WEBP, RTF, TXT, CSV, MD");
      return;
    }

    if (ext === "doc") {
      toast.warning("صيغة .doc القديمة قد لا تُستخرج بدقة. يُفضل تحويل الملف إلى .docx للحصول على نتائج أفضل.", { duration: 6000 });
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("حجم الملف يتجاوز الحد الأقصى (20 ميجابايت)");
      return;
    }

    setIsUploading(true);
    setPendingFile({ name: file.name });

    try {
      // Get authenticated user (required by RLS - files must be in user-scoped folder)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("يجب تسجيل الدخول لرفع الملفات");
        setIsUploading(false);
        setPendingFile(null);
        return;
      }
      // Upload to storage under user's own folder for RLS isolation
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const filePath = `${user.id}/${crypto.randomUUID()}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const parsed = await invokeLovableFunction<{
        text?: string;
        content?: string;
        documentId?: string;
        document_id?: string;
        id?: string;
        error?: string;
      }>("parse-document", { filePath, fileName: file.name, mimeType: file.type });

      const parsedText = typeof parsed?.text === "string"
        ? parsed.text
        : typeof parsed?.content === "string"
          ? parsed.content
          : "";
      const documentId = typeof parsed?.documentId === "string"
        ? parsed.documentId
        : typeof parsed?.document_id === "string"
          ? parsed.document_id
          : typeof parsed?.id === "string"
            ? parsed.id
            : "";

      // The parser is the single owner of document persistence. Never insert
      // a second row from the client — that created duplicate documents.
      if (!documentId) {
        console.error("unexpected parse-document response:", parsed);
        throw new Error(parsed?.error || "خدمة تحليل المستند لم تُرجع معرّف المستند المحفوظ");
      }
      onFileProcessed(file.name, parsedText, documentId);
      toast.success(`تم تحميل وتحليل وحفظ الملف: ${file.name}`);
    } catch (e: any) {
      console.error("File upload error:", e);
      toast.error(e.message || "حدث خطأ أثناء تحميل الملف");
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.rtf,.txt,.csv,.md"
        aria-label="إرفاق مستند"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl h-11 w-11 shrink-0"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        title="إرفاق ملف (PDF, Word, TXT)"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};

interface AttachedFileChipProps {
  fileName: string;
  onRemove: () => void;
}

export const AttachedFileChip = ({ fileName, onRemove }: AttachedFileChipProps) => (
  <div className="flex items-center gap-1.5 bg-accent text-accent-foreground rounded-lg px-2.5 py-1 text-xs">
    <FileText className="w-3.5 h-3.5" />
    <span className="truncate max-w-[150px]">{fileName}</span>
    <button onClick={onRemove} className="hover:text-destructive">
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);

export default FileUpload;