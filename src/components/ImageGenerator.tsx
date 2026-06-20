import { useState } from "react";
import { ImagePlus, Loader2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ImageGenerator = () => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setImageUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;
      if (data?.images?.[0]?.image_url?.url) {
        setImageUrl(data.images[0].image_url.url);
      } else {
        toast.error("لم يتم إنتاج صورة، حاول بوصف مختلف");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "حدث خطأ أثناء إنتاج الصورة");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `alazwak-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="إنتاج صورة بالذكاء الاصطناعي">
          <ImagePlus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>إنتاج صورة بالذكاء الاصطناعي</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="اكتب وصف الصورة... مثال: مخطط تدفق معالجة المياه"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && generate()}
              disabled={loading}
            />
            <Button onClick={generate} disabled={loading || !prompt.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنتاج"}
            </Button>
          </div>

          {imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={imageUrl} alt={prompt} className="w-full h-auto" />
              <div className="absolute top-2 left-2 flex gap-1">
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={downloadImage}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setImageUrl(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">جاري إنتاج الصورة...</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageGenerator;
