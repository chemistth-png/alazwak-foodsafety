import { useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, FolderOpen, LayoutGrid, FileText, Bot, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "المحادثة", icon: MessageSquare },
  { path: "/agent", label: "الوكيل", icon: Bot },
  { path: "/dashboard", label: "الإحصائيات", icon: PieChart },
  { path: "/documents", label: "المستندات", icon: FolderOpen },
  { path: "/sops", label: "SOPs", icon: FileText },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on auth page and SOP template
  if (location.pathname === "/auth" || location.pathname === "/sop") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[56px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
