import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Calendar,
  User,
  Film,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE = `http://${window.location.hostname}:8080/api`;

// ── Sectioned nav structure ───────────────────────────────────────────────────
const navSections = [
  {
    label: "General",
    items: [
      { label: "Dashboard",        icon: LayoutDashboard, path: "/editor/dashboard"  },
      { label: "My Tasks",         icon: ListTodo,        path: "/editor/tasks"      },
      { label: "Review Feedback",  icon: MessageSquare,   path: "/editor/feedback"   },
      { label: "Content Calendar", icon: Calendar,        path: "/editor/calendar"   },
      { label: "Profile",          icon: User,            path: "/editor/profile"    },
    ],
  },
];

const EditorSidebar = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      toast.success("Logged out successfully");
      navigate("/");
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Film className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-semibold text-sidebar-accent-foreground tracking-tight">
          Media Manager
        </span>
      </div>

      {/* Sectioned nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            {/* Section label */}
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {section.label}
            </p>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default EditorSidebar;
