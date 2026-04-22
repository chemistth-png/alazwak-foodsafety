import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, RotateCcw, Move, ZoomIn, ZoomOut, Save, FolderOpen, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LayoutItem {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const ZONE_TYPES: Record<string, { label: string; color: string; w: number; h: number }> = {
  production: { label: "منطقة إنتاج", color: "hsl(199 89% 85%)", w: 200, h: 150 },
  storage_raw: { label: "تخزين مواد خام", color: "hsl(45 93% 85%)", w: 160, h: 120 },
  storage_finished: { label: "تخزين منتجات تامة", color: "hsl(160 60% 85%)", w: 160, h: 120 },
  packaging: { label: "منطقة تعبئة", color: "hsl(280 60% 88%)", w: 180, h: 120 },
  lab: { label: "معمل الجودة", color: "hsl(340 60% 88%)", w: 140, h: 100 },
  washing: { label: "غسيل وتعقيم", color: "hsl(199 70% 78%)", w: 150, h: 100 },
  utilities: { label: "خدمات (كهرباء/مياه)", color: "hsl(210 20% 85%)", w: 140, h: 100 },
  office: { label: "مكاتب إدارية", color: "hsl(210 30% 90%)", w: 140, h: 100 },
  loading: { label: "منطقة تحميل/تفريغ", color: "hsl(30 70% 85%)", w: 180, h: 80 },
  changing: { label: "غرف تغيير ملابس", color: "hsl(0 0% 88%)", w: 100, h: 80 },
  waste: { label: "منطقة نفايات", color: "hsl(0 50% 88%)", w: 100, h: 80 },
  water_treatment: { label: "محطة معالجة المياه", color: "hsl(199 89% 80%)", w: 200, h: 130 },
};

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: "1", type: "loading", label: "منطقة الاستلام", x: 50, y: 50, width: 180, height: 80, color: "hsl(30 70% 85%)" },
  { id: "2", type: "storage_raw", label: "مخزن مواد خام", x: 50, y: 160, width: 160, height: 120, color: "hsl(45 93% 85%)" },
  { id: "3", type: "water_treatment", label: "محطة معالجة المياه", x: 250, y: 50, width: 200, height: 130, color: "hsl(199 89% 80%)" },
  { id: "4", type: "production", label: "خط الإنتاج", x: 250, y: 210, width: 200, height: 150, color: "hsl(199 89% 85%)" },
  { id: "5", type: "packaging", label: "منطقة التعبئة", x: 480, y: 210, width: 180, height: 120, color: "hsl(280 60% 88%)" },
  { id: "6", type: "lab", label: "معمل الجودة", x: 480, y: 50, width: 140, height: 100, color: "hsl(340 60% 88%)" },
  { id: "7", type: "storage_finished", label: "مخزن منتج تام", x: 480, y: 360, width: 160, height: 120, color: "hsl(160 60% 85%)" },
  { id: "8", type: "loading", label: "منطقة الشحن", x: 480, y: 510, width: 180, height: 80, color: "hsl(30 70% 85%)" },
  { id: "9", type: "washing", label: "غسيل وتعقيم", x: 250, y: 390, width: 150, height: 100, color: "hsl(199 70% 78%)" },
  { id: "10", type: "changing", label: "غرف تغيير ملابس", x: 50, y: 310, width: 100, height: 80, color: "hsl(0 0% 88%)" },
  { id: "11", type: "office", label: "مكاتب إدارية", x: 50, y: 420, width: 140, height: 100, color: "hsl(210 30% 90%)" },
  { id: "12", type: "waste", label: "نفايات", x: 50, y: 550, width: 100, height: 80, color: "hsl(0 50% 88%)" },
];

let itemId = 100;

const FactoryLayoutBuilder = () => {
  const [items, setItems] = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedZone, setSelectedZone] = useState("production");
  const [scale, setScale] = useState(1);
  const [title, setTitle] = useState("مخطط المصنع");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [savedList, setSavedList] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  const { user } = useAuth();
  const canvasRef = useRef<HTMLDivElement>(null);

  const saveLayout = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول"); return; }
    setSaving(true);
    const dataPayload = { items } as any;
    const { data, error } = currentId
      ? await supabase.from("flowcharts").update({ title, data: dataPayload, updated_at: new Date().toISOString() }).eq("id", currentId).select().single()
      : await supabase.from("flowcharts").insert({ user_id: user.id, title, type: "factory_layout", data: dataPayload }).select().single();
    setSaving(false);
    if (error) { toast.error("فشل الحفظ: " + error.message); return; }
    if (data) setCurrentId(data.id);
    toast.success("تم حفظ المخطط");
  };

  const openLoadDialog = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول"); return; }
    const { data, error } = await supabase
      .from("flowcharts")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .eq("type", "factory_layout")
      .order("updated_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setSavedList(data || []);
    setLoadOpen(true);
  };

  const loadLayout = async (id: string) => {
    const { data, error } = await supabase.from("flowcharts").select("*").eq("id", id).single();
    if (error || !data) { toast.error("فشل التحميل"); return; }
    const d = data.data as any;
    setItems(d?.items || []);
    setTitle(data.title);
    setCurrentId(data.id);
    setLoadOpen(false);
    toast.success("تم تحميل المخطط");
  };

  const deleteLayout = async (id: string) => {
    const { error } = await supabase.from("flowcharts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSavedList((prev) => prev.filter((s) => s.id !== id));
    if (currentId === id) setCurrentId(null);
    toast.success("تم الحذف");
  };

  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const item = items.find((i) => i.id === id);
    if (!item || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging(id);
    setDragOffset({
      x: (e.clientX - rect.left) / scale - item.x,
      y: (e.clientY - rect.top) / scale - item.y,
    });
  }, [items, scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale - dragOffset.x;
    const y = (e.clientY - rect.top) / scale - dragOffset.y;
    setItems((prev) =>
      prev.map((item) =>
        item.id === dragging ? { ...item, x: Math.max(0, x), y: Math.max(0, y) } : item
      )
    );
  }, [dragging, dragOffset, scale]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const addZone = () => {
    const zone = ZONE_TYPES[selectedZone];
    if (!zone) return;
    const id = String(++itemId);
    setItems((prev) => [
      ...prev,
      {
        id,
        type: selectedZone,
        label: zone.label,
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: zone.w,
        height: zone.h,
        color: zone.color,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-card flex-wrap">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="w-40 h-9 text-sm" placeholder="عنوان المخطط" />
        <Select value={selectedZone} onValueChange={setSelectedZone}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ZONE_TYPES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={addZone} className="gap-1.5">
          <Plus className="w-4 h-4" />
          منطقة
        </Button>
        <Button variant="outline" size="sm" onClick={saveLayout} disabled={saving} className="gap-1.5">
          <Save className="w-4 h-4" />
          {saving ? "..." : "حفظ"}
        </Button>
        <Button variant="outline" size="sm" onClick={openLoadDialog} className="gap-1.5">
          <FolderOpen className="w-4 h-4" />
          تحميل
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setItems(DEFAULT_LAYOUT); setCurrentId(null); }} className="gap-1.5">
          <RotateCcw className="w-4 h-4" />
          تعيين
        </Button>
        <div className="flex items-center gap-1 mr-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale((s) => Math.min(s + 0.1, 2))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>المخططات المحفوظة</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-auto space-y-2">
            {savedList.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد مخططات محفوظة</p>}
            {savedList.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50">
                <button className="flex-1 text-right text-sm" onClick={() => loadLayout(s.id)}>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.updated_at).toLocaleString("ar")}</div>
                </button>
                <Button size="icon" variant="ghost" onClick={() => deleteLayout(s.id)} className="h-8 w-8 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-muted/30">
        <div
          ref={canvasRef}
          className="relative cursor-crosshair"
          style={{
            width: 900 * scale,
            height: 700 * scale,
            minHeight: "100%",
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
            <defs>
              <pattern id="grid" width={20 * scale} height={20 * scale} patternUnits="userSpaceOnUse">
                <path d={`M ${20 * scale} 0 L 0 0 0 ${20 * scale}`} fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Items */}
          {items.map((item) => (
            <div
              key={item.id}
              className="absolute flex flex-col items-center justify-center text-center cursor-move select-none group border-2 border-transparent hover:border-primary/50 transition-colors"
              style={{
                left: item.x * scale,
                top: item.y * scale,
                width: item.width * scale,
                height: item.height * scale,
                backgroundColor: item.color,
                borderRadius: 8 * scale,
                fontSize: 12 * scale,
                fontFamily: "Cairo",
                fontWeight: 600,
              }}
              onMouseDown={(e) => handleMouseDown(item.id, e)}
              onDoubleClick={() => {
                const name = prompt("اسم المنطقة:", item.label);
                if (name) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, label: name } : i)));
              }}
            >
              <Move className="opacity-0 group-hover:opacity-40 absolute" style={{ width: 16 * scale, height: 16 * scale, top: 4 * scale, left: 4 * scale }} />
              <button
                className="absolute opacity-0 group-hover:opacity-70 hover:!opacity-100 text-destructive font-bold"
                style={{ top: 2 * scale, right: 6 * scale, fontSize: 14 * scale }}
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
              >
                ✕
              </button>
              <span className="px-1 leading-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-2 border-t bg-card text-xs text-muted-foreground text-center">
        اسحب المناطق لتحريكها • انقر مزدوجاً لتعديل الاسم • اضغط ✕ للحذف
      </div>
    </div>
  );
};

export default FactoryLayoutBuilder;
