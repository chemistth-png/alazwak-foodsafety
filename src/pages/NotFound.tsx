import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowRight } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-accent mx-auto mb-2">
          <span className="text-4xl font-extrabold text-accent-foreground">404</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">الصفحة غير موجودة</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button onClick={() => navigate("/")} className="gap-1.5">
            <Home className="w-4 h-4" />
            الصفحة الرئيسية
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
