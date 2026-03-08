import { useState, useRef } from "react";
import { Paperclip, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "txt", "csv", "md"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface FileUploadProps {
  onFileProcessed: (fileName: string, fileText: string) => void;
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
      toast.error("نوع الملف غير مدعوم. الأنواع المدعومة: PDF, Word, Excel, TXT, CSV");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("حجم الملف يتجاوز الحد الأقصى (20 ميجابايت)");
      return;
    }

    setIsUploading(true);
    setPendingFile({ name: file.name });

    try {
      // Upload to storage
      // Sanitize filename to ASCII-only for storage compatibility
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const filePath = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Parse the document
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ filePath, fileName: file.name, mimeType: file.type }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "فشل في تحليل الملف");
      }

      const { text } = await resp.json();
      
      // Save parsed content to documents table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("documents").insert({
          user_id: user.id,
          file_name: file.name,
          content: text,
          file_size: file.size,
        });
      }
      
      onFileProcessed(file.name, text);
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
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.md"
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
        title="إرفاق ملف (PDF, Word, Excel)"
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
