import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplets, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const hasRecovery = hash.includes("type=recovery");
    if (!hasRecovery) {
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValid(true);
      }
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("تم تحديث كلمة المرور بنجاح");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div dir="rtl" className="min-h-screen bg-background">
        <div className="border-b bg-card/50">
          <div className="container h-14 flex items-center">
            <button
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى تسجيل الدخول
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
          <div className="w-full max-w-sm text-center space-y-4">
            <h1 className="text-xl font-bold text-foreground">رابط غير صالح</h1>
            <p className="text-sm text-muted-foreground">
              رابط إعادة التعيين منتهي الصلاحية أو غير صحيح. يرجى طلب رابط جديد.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              العودة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="border-b bg-card/50">
        <div className="container h-14 flex items-center">
          <button
            onClick={() => navigate("/auth")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى تسجيل الدخول
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground">
              <Droplets className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-foreground">تعيين كلمة مرور جديدة</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور الجديدة</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                dir="ltr"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                dir="ltr"
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              تحديث كلمة المرور
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
