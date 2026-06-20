import { useState, useEffect } from "react";
import { Download, CheckCircle2, Share, MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 text-center" dir="rtl">
        <CheckCircle2 className="w-16 h-16 text-secondary mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">التطبيق مثبّت بالفعل! ✅</h1>
        <p className="text-muted-foreground">يمكنك فتحه من الشاشة الرئيسية لجهازك.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 overflow-y-auto" dir="rtl">
      <div className="max-w-md w-full space-y-6 text-center">
        <img src="/app-icon.png" alt="Alazwak Food Safety" className="w-20 h-20 mx-auto rounded-2xl shadow-lg" />
        <h1 className="text-2xl font-bold text-foreground">تثبيت التطبيق</h1>
        <p className="text-muted-foreground">
          ثبّت Alazwak Food Safety على جهازك للوصول السريع بدون متصفح.
        </p>

        {deferredPrompt && (
          <Button onClick={handleInstall} size="lg" className="w-full gap-2 text-lg">
            <Download className="w-5 h-5" />
            تثبيت التطبيق
          </Button>
        )}

        {isIOS && (
          <Card className="border-primary/20 bg-accent/30">
            <CardContent className="p-5 space-y-4 text-right">
              <h3 className="font-semibold text-foreground">خطوات التثبيت على iPhone / iPad:</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                  <p>اضغط على زر <Share className="inline w-4 h-4" /> المشاركة في أسفل المتصفح</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                  <p>اختر <Plus className="inline w-4 h-4" /> "إضافة إلى الشاشة الرئيسية"</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                  <p>اضغط "إضافة" للتأكيد</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!deferredPrompt && !isIOS && (
          <Card className="border-primary/20 bg-accent/30">
            <CardContent className="p-5 space-y-4 text-right">
              <h3 className="font-semibold text-foreground">خطوات التثبيت:</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                  <p>اضغط على <MoreVertical className="inline w-4 h-4" /> قائمة المتصفح</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                  <p>اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Install;
