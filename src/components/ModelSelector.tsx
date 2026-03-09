import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot } from "lucide-react";

export interface ModelOption {
  id: string;
  label: string;
  description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "سريع ومتوازن" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", description: "أحدث نموذج تحليل" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "متوازن ومتعدد المهام" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "الأقوى في التحليل" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Lite", description: "الأسرع والأخف" },
  { id: "openai/gpt-5.2", label: "GPT-5.2", description: "أحدث نموذج من OpenAI" },
  { id: "openai/gpt-5", label: "GPT-5", description: "دقة عالية وتحليل معمق" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "أداء جيد وسريع" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", description: "خفيف وسريع جداً" },
];

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ModelSelector = ({ value, onChange, disabled }: ModelSelectorProps) => {
  const selected = AVAILABLE_MODELS.find((m) => m.id === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 w-[180px] rounded-lg text-xs border-border bg-background">
        <div className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
          <SelectValue>{selected?.label || "اختر النموذج"}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id} className="text-xs">
            <div className="flex flex-col">
              <span className="font-medium">{model.label}</span>
              <span className="text-muted-foreground text-[10px]">{model.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;
