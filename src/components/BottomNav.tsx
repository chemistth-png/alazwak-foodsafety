import { useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, FolderOpen, FileText, Bot, PieChart, ListChecks, AlertTriangle, MoreHorizontal, ClipboardList, BookOpen, Waves, LogOut, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState } from "react";

const MAIN_NAV_ITEMS = [
  { path: "/", label: "المحادثة", icon: MessageSquare },
  { path: "/agent", label: "الوكيل", icon: Bot },
  { path: "/dashboard", label: "الإحصائيات", icon: PieChart },
  { path: "/documents", label: "المستندات", icon: FolderOpen },
];

const MORE_NAV_ITEMS = [
  { path: "/sops", label: "إجراءات التشغيل SOPs", icon: FileText },
  { path: "/master-list", label: "القائمة الرئيسية للوثائق", icon: ListChecks },
  { path: "/nc-reports", label: "تقارير عدم المطابقة", icon: AlertTriangle },
  { path: "/gemba", label: "جولة Gemba (تفتيش ميداني)", icon: Camera },
  { path: "/plans", label: "المخططات", icon: ClipboardList },
  { path: "/library", label: "المكتبة المرجعية", icon: BookOpen },
  { path: "/groundwater", label: "المياه الجوفية", icon: Waves },
  { path: "/audit", label: "سجل التدقيق", icon: ClipboardList },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [showMore, setShowMore] = useState(false);

  // Hide on auth page and SOP template
  if (location.pathname === "/auth" || location.pathname === "/sop") return null;

  const isMoreActive = MORE_NAV_ITEMS.some(item => location.pathname.startsWith(item.path));

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-16 left-4 right-4 bg-card border rounded-xl shadow-lg p-2 space-y-1 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {MORE_NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => {
                    navigate(path);
                    setShowMore(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-3.5 min-h-[48px] text-sm transition-colors text-right",
                    isActive
                      ? "bg-accent text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  dir="rtl"
                >
                  <Icon className={cn("w-5 h-5 shrink-0", isActive && "stroke-[2.5]")} />
                  <span>{label}</span>
                </button>
              );
            })}
            <div className="border-t my-1" />
            <button
              onClick={() => {
                setShowMore(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-3.5 min-h-[48px] text-sm text-destructive hover:bg-destructive/10 transition-colors text-right"
              dir="rtl"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm md:hidden safe-area-bottom overflow-hidden">
        <div className="flex flex-nowrap items-stretch justify-between h-16 w-full px-0.5 gap-0.5">
          {MAIN_NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "flex flex-1 basis-0 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive && "stroke-[2.5]")} />
                <span className="text-[9px] font-medium leading-tight truncate max-w-full w-full text-center">{label}</span>
              </button>
            );
          })}
          {/* More button - always visible */}
          <button
            onClick={() => setShowMore(!showMore)}
            aria-label="المزيد"
            className={cn(
              "flex flex-1 basis-0 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 rounded-lg transition-colors",
              isMoreActive || showMore
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal className={cn("w-5 h-5 shrink-0", (isMoreActive || showMore) && "stroke-[2.5]")} />
            <span className="text-[9px] font-medium leading-tight truncate max-w-full w-full text-center">المزيد</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
