import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, LogOut, X, Search, FolderOpen, LayoutGrid, FileText, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatSidebarProps {
  currentId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  open: boolean;
  onClose: () => void;
}

const ChatSidebar = ({ currentId, onSelect, onNew, open, onClose }: ChatSidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  };

  useEffect(() => { load(); }, [currentId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("conversations").delete().eq("id", id);
    if (currentId === id) onNew();
    load();
    toast.success("تم حذف المحادثة");
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed md:relative z-50 top-0 right-0 h-[100dvh] w-[88vw] max-w-[340px] md:w-72 bg-card border-s flex flex-col overflow-hidden transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between gap-2 p-3 border-b shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 flex-1 min-h-12 text-base" onClick={() => { onNew(); onClose(); }}>
            <Plus className="w-4 h-4" />
            محادثة جديدة
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden mr-1 min-h-11 min-w-11" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في المحادثات..."
              className="pr-9 h-11 text-base"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); onClose(); }}
                className={cn(
                  "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-right transition-colors group",
                  currentId === c.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1 min-w-0">{c.title}</span>
                <Trash2
                  className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-destructive"
                  onClick={(e) => handleDelete(c.id, e)}
                />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                {search.trim() ? "لا توجد نتائج" : "لا توجد محادثات سابقة"}
              </p>
            )}
          </div>
        </ScrollArea>
        {/* Mobile-only nav links */}
        <div className="border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-1 md:hidden shrink-0">
          <Button variant="ghost" size="sm" className="w-full min-h-11 gap-2 text-base text-foreground justify-start" onClick={() => { navigate("/documents"); onClose(); }}>
            <FolderOpen className="w-4 h-4" /> إدارة المستندات
          </Button>
          <Button variant="ghost" size="sm" className="w-full min-h-11 gap-2 text-base text-foreground justify-start" onClick={() => { navigate("/plans"); onClose(); }}>
            <LayoutGrid className="w-4 h-4" /> المخططات والخطط
          </Button>
          <Button variant="ghost" size="sm" className="w-full min-h-11 gap-2 text-base text-foreground justify-start" onClick={() => { navigate("/sops"); onClose(); }}>
            <FileText className="w-4 h-4" /> إدارة SOPs
          </Button>
          <Button variant="ghost" size="sm" className="w-full min-h-11 gap-2 text-base text-foreground justify-start" onClick={() => { navigate("/agent"); onClose(); }}>
            <Bot className="w-4 h-4" /> الوكيل الذكي
          </Button>
          <Button variant="ghost" size="sm" className="w-full min-h-11 gap-2 text-base text-muted-foreground justify-start" onClick={signOut}>
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </Button>
        </div>
      </aside>
    </>
  );
};

export default ChatSidebar;
