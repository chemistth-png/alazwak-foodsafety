import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplets, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type AuthView = "login" | "register" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else if (view === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب.");
      } else if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.");
        setView("login");
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const getSubtitle = () => {
    switch (view) {
      case "login": return "سجّل دخولك للمتابعة";
      case "register": return "أنشئ حساباً جديداً";
      case "forgot": return "استعد حسابك عبر البريد الإلكتروني";
    }
  };

  const getSubmitLabel = () => {
    switch (view) {
      case "login": return "تسجيل الدخول";
      case "register": return "إنشاء حساب";
      case "forgot": return "إرسال رابط الاستعادة";
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Back to Landing */}
      <div className="border-b bg-card/50">
        <div className="container h-14 flex items-center">
          <button
            onClick={() => navigate("/landing")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى الصفحة الرئيسية
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
        <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground">
            <Droplets className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Alazwak FoodSafety</h1>
          <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              dir="ltr"
            />
          </div>
          {view !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
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
              {view === "login" && (
                <button
                  type="button"
                  onClick={() => { setView("forgot"); setPassword(""); }}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  نسيت كلمة المرور؟
                </button>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            {getSubmitLabel()}
          </Button>
        </form>

        {view === "login" && (
          <p className="text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <button
              onClick={() => setView("register")}
              className="text-primary font-medium hover:underline"
            >
              إنشاء حساب
            </button>
          </p>
        )}
        {view === "register" && (
          <p className="text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <button
              onClick={() => setView("login")}
              className="text-primary font-medium hover:underline"
            >
              تسجيل الدخول
            </button>
          </p>
        )}
        {view === "forgot" && (
          <p className="text-center text-sm text-muted-foreground">
            <button
              onClick={() => setView("login")}
              className="text-primary font-medium hover:underline"
            >
              العودة إلى تسجيل الدخول
            </button>
          </p>
        )}
      </div>
      </div>
    </div>
  );
};

export default Auth;
