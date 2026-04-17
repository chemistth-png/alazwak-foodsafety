import { useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, FolderOpen, FileText, Bot, PieChart, LogOut, Droplets, ClipboardList, BookOpen, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { path: "/", label: "المحادثة", icon: MessageSquare },
  { path: "/agent", label: "الوكيل الذكي", icon: Bot },
  { path: "/dashboard", label: "الإحصائيات", icon: PieChart },
  { path: "/documents", label: "المستندات", icon: FolderOpen },
  { path: "/sops", label: "SOPs", icon: FileText },
  { path: "/plans", label: "المخططات", icon: ClipboardList },
  { path: "/library", label: "المكتبة المرجعية", icon: BookOpen },
  { path: "/groundwater", label: "المياه الجوفية", icon: Waves },
  { path: "/audit", label: "سجل التدقيق", icon: ClipboardList },
];

const DesktopSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  if (location.pathname === "/auth" || location.pathname === "/landing" || location.pathname === "/install") return null;

  return (
    <aside className="hidden md:flex flex-col w-56 border-s bg-card h-full shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
          <Droplets className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-foreground leading-tight">Alazwak</h1>
          <p className="text-[10px] text-muted-foreground">سلامة الغذاء</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-2 space-y-0.5">
        <div className="px-3 py-1">
          <ThemeToggle />
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
