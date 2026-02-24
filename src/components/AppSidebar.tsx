import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  Eye,
  Target,
  FileText,
  Calendar,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Team Space", icon: Users, path: "/team-space" },
  { label: "Tasks", icon: ListTodo, path: "/tasks" },
  { label: "Review", icon: Eye, path: "/review" },
  { label: "Targets", icon: Target, path: "/targets" },
  { label: "Reports", icon: FileText, path: "/reports" },
  { label: "Calendar", icon: Calendar, path: "/calendar" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

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

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
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
      </nav>
    </aside>
  );
};

export default AppSidebar;
