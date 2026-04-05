import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Source } from "@/lib/chat";

const SourcesBadge = ({ sources }: { sources: Source[] }) => {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>المصادر المرجعية ({sources.length})</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {sources.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-accent/50 px-2 py-0.5 text-[11px] text-accent-foreground"
            >
              <FileText className="w-3 h-3 shrink-0" />
              {s.file_name}
              {s.relevance > 0 && (
                <span className="text-muted-foreground">({s.relevance})</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default SourcesBadge;
