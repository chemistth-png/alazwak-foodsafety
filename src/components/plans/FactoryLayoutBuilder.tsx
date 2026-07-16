import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, RotateCcw, Move, ZoomIn, ZoomOut, Save, FolderOpen, Trash2, FilePlus, Pencil, Download, Upload, FileText } from "lucide-react";
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
  const [resizing, setResizing] = useState<string | null>(null);
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
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.35);
  const [importing, setImporting] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const CANVAS_W = 900;
  const CANVAS_H = 700;

  const renderPdfPages = async (
    file: File,
    maxPages = 3,
    scale = 2.0,
  ): Promise<{ images: string[]; firstPagePreview: string | null }> => {
    try {
      const pdfjs: any = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const pageCount = Math.min(pdf.numPages, maxPages);
      const images: string[] = [];
      let firstPagePreview: string | null = null;
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        // White background so transparent PDFs render cleanly for AI vision.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        // Higher-quality PNG for the AI (better edge detection), JPEG for preview.
        images.push(canvas.toDataURL("image/png"));
        if (i === 1) firstPagePreview = canvas.toDataURL("image/jpeg", 0.85);
      }
      return { images, firstPagePreview };
    } catch (e) {
      console.error("PDF render failed:", e);
      return { images: [], firstPagePreview: null };
    }
  };

  // Resolve heavy overlaps on the canvas by nudging later items to the side.
  const resolveOverlaps = (arr: LayoutItem[]): LayoutItem[] => {
    const out = arr.map((i) => ({ ...i }));
    for (let i = 0; i < out.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = out[j], b = out[i];
        const x1 = Math.max(a.x, b.x);
        const y1 = Math.max(a.y, b.y);
        const x2 = Math.min(a.x + a.width, b.x + b.width);
        const y2 = Math.min(a.y + a.height, b.y + b.height);
        const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const areaB = b.width * b.height;
        if (areaB > 0 && inter / areaB > 0.6) {
          // Move b just below a if room, else to the right.
          if (a.y + a.height + b.height + 8 <= CANVAS_H) {
            b.y = a.y + a.height + 8;
          } else {
            b.x = Math.min(CANVAS_W - b.width, a.x + a.width + 8);
          }
        }
      }
    }
    return out;
  };

  const importFromDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (docInputRef.current) docInputRef.current.value = "";
    if (!file) return;
    if (!user) { toast.error("يجب تسجيل الدخول"); return; }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["pdf", "doc", "docx"].includes(ext)) {
      toast.error("الصيغ المدعومة: PDF, DOC, DOCX");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("حجم الملف يتجاوز 20 ميجابايت");
      return;
    }

    setImporting(true);
    const loadingToast = toast.loading("جارٍ تحليل المخطط بدقة عالية...");
    try {
      let images: string[] = [];
      let firstPagePreview: string | null = null;
      let filePath: string | null = null;

      if (ext === "pdf") {
        // Render pages client-side at 2x for high spatial accuracy.
        const rendered = await renderPdfPages(file, 3, 2.0);
        images = rendered.images;
        firstPagePreview = rendered.firstPagePreview;
      }

      // For DOC/DOCX (or PDF fallback), upload the file so the backend can read it.
      if (images.length === 0) {
        filePath = `${user.id}/${crypto.randomUUID()}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat-files").upload(filePath, file);
        if (upErr) throw upErr;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/layout-from-doc`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ filePath, fileName: file.name, images }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "فشل" }));
        throw new Error(err.error || "فشل التحليل");
      }
      const { items: rawItems } = await resp.json();
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new Error("لم يتم اكتشاف أي مناطق في الملف");
      }

      if (firstPagePreview) setBackgroundImage(firstPagePreview);

      const mapped: LayoutItem[] = rawItems.map((it: any, idx: number) => {
        const type = ZONE_TYPES[it.type] ? it.type : "production";
        const color = ZONE_TYPES[type]?.color || "hsl(199 89% 85%)";
        const nx = Math.max(0, Math.min(0.98, Number(it.x) || 0));
        const ny = Math.max(0, Math.min(0.98, Number(it.y) || 0));
        const nw = Math.max(0.03, Math.min(1 - nx, Number(it.width) || 0.15));
        const nh = Math.max(0.03, Math.min(1 - ny, Number(it.height) || 0.12));
        return {
          id: String(++itemId),
          type,
          label: String(it.label || ZONE_TYPES[type]?.label || `منطقة ${idx + 1}`),
          x: Math.round(nx * CANVAS_W),
          y: Math.round(ny * CANVAS_H),
          width: Math.max(60, Math.round(nw * CANVAS_W)),
          height: Math.max(50, Math.round(nh * CANVAS_H)),
          color,
        };
      });
      const finalItems = resolveOverlaps(mapped);
      setItems(finalItems);
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      setCurrentId(null);
      toast.dismiss(loadingToast);
      toast.success(`تم استيراد ${finalItems.length} منطقة${firstPagePreview ? " مع صورة خلفية للتتبع" : ""}`);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error("Import error:", err);
      toast.error(err?.message || "فشل استيراد المخطط");
    } finally {
      setImporting(false);
    }
  };



  const newLayout = () => {
    setItems([]);
    setTitle("مخطط جديد");
    setCurrentId(null);
    toast.success("تم إنشاء مخطط جديد فارغ");
  };

  const editLabel = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const name = prompt("اسم المنطقة:", item.label);
    if (name) setItems((prev) => prev.map((i) => (i.id === id ? { ...i, label: name } : i)));
  };

  const importInputRef = useRef<HTMLInputElement>(null);

  const exportLayout = () => {
    try {
      const payload = { title, type: "factory_layout", version: 1, exportedAt: new Date().toISOString(), items };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = (title || "factory_layout").replace(/[\\/:*?"<>|]+/g, "_");
      a.href = url;
      a.download = `${safe}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تصدير المخطط");
    } catch (e: any) {
      toast.error("فشل التصدير: " + (e?.message || ""));
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (importInputRef.current) importInputRef.current.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedItems: LayoutItem[] = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(importedItems)) throw new Error("صيغة ملف غير صالحة");
      const valid = importedItems.every(
        (i) => i && typeof i.id === "string" && typeof i.x === "number" && typeof i.y === "number" &&
               typeof i.width === "number" && typeof i.height === "number"
      );
      if (!valid) throw new Error("عناصر المخطط غير صالحة");
      setItems(importedItems);
      if (parsed.title && typeof parsed.title === "string") setTitle(parsed.title);
      setCurrentId(null);
      toast.success("تم استيراد المخطط");
    } catch (e: any) {
      toast.error("فشل الاستيراد: " + (e?.message || "ملف غير صالح"));
    }
  };

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

  const handleResizeDown = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(id);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (dragging) {
      const x = (e.clientX - rect.left) / scale - dragOffset.x;
      const y = (e.clientY - rect.top) / scale - dragOffset.y;
      setItems((prev) =>
        prev.map((item) =>
          item.id === dragging ? { ...item, x: Math.max(0, x), y: Math.max(0, y) } : item
        )
      );
    } else if (resizing) {
      const px = (e.clientX - rect.left) / scale;
      const py = (e.clientY - rect.top) / scale;
      setItems((prev) =>
        prev.map((item) =>
          item.id === resizing
            ? { ...item, width: Math.max(60, px - item.x), height: Math.max(50, py - item.y) }
            : item
        )
      );
    }
  }, [dragging, resizing, dragOffset, scale]);

  const handleMouseUp = useCallback(() => { setDragging(null); setResizing(null); }, []);

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
        <Button variant="outline" size="sm" onClick={newLayout} className="gap-1.5">
          <FilePlus className="w-4 h-4" />
          جديد
        </Button>
        <Button variant="outline" size="sm" onClick={saveLayout} disabled={saving} className="gap-1.5">
          <Save className="w-4 h-4" />
          {saving ? "..." : "حفظ"}
        </Button>
        <Button variant="outline" size="sm" onClick={openLoadDialog} className="gap-1.5">
          <FolderOpen className="w-4 h-4" />
          تحميل
        </Button>
        <Button variant="outline" size="sm" onClick={exportLayout} className="gap-1.5">
          <Download className="w-4 h-4" />
          تصدير JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()} className="gap-1.5">
          <Upload className="w-4 h-4" />
          استيراد JSON
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
        <Button variant="outline" size="sm" onClick={() => docInputRef.current?.click()} disabled={importing} className="gap-1.5">
          <FileText className="w-4 h-4" />
          {importing ? "جارٍ التحليل..." : "استيراد PDF/Word"}
        </Button>
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf"
          onChange={importFromDoc}
          className="hidden"
        />
        {backgroundImage && (
          <>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">شفافية:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={bgOpacity}
                onChange={(e) => setBgOpacity(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setBackgroundImage(null)} className="gap-1.5">
              إزالة الخلفية
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => { setItems(DEFAULT_LAYOUT); setCurrentId(null); }} className="gap-1.5">
          <RotateCcw className="w-4 h-4" />
          افتراضي
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
          {/* Background image (imported PDF page) */}
          {backgroundImage && (
            <img
              src={backgroundImage}
              alt="مخطط مرجعي مستورد"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              style={{ opacity: bgOpacity }}
              draggable={false}
            />
          )}
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
              onDoubleClick={() => editLabel(item.id)}
            >
              <Move className="opacity-0 group-hover:opacity-40 absolute" style={{ width: 16 * scale, height: 16 * scale, top: 4 * scale, left: 4 * scale }} />
              <button
                className="absolute opacity-70 hover:!opacity-100 text-foreground/70 hover:text-foreground"
                style={{ top: 2 * scale, right: 24 * scale, fontSize: 12 * scale }}
                onClick={(e) => { e.stopPropagation(); editLabel(item.id); }}
                title="تعديل الاسم"
              >
                <Pencil style={{ width: 12 * scale, height: 12 * scale }} />
              </button>
              <button
                className="absolute opacity-70 hover:!opacity-100 text-destructive font-bold"
                style={{ top: 2 * scale, right: 6 * scale, fontSize: 14 * scale }}
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                title="حذف"
              >
                ✕
              </button>
              <span className="px-1 leading-tight">{item.label}</span>
              {/* Resize handle */}
              <div
                onMouseDown={(e) => handleResizeDown(item.id, e)}
                className="absolute bg-primary/60 hover:bg-primary cursor-nwse-resize rounded-tl"
                style={{ width: 14 * scale, height: 14 * scale, bottom: 0, left: 0 }}
                title="تغيير الحجم"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="p-2 border-t bg-card text-xs text-muted-foreground text-center">
        اسحب للتحريك • اسحب الزاوية لتغيير الحجم • ✎ لتعديل الاسم • ✕ للحذف
      </div>
    </div>
  );
};

export default FactoryLayoutBuilder;
