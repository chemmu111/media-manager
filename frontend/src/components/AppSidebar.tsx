import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  Eye,
  Calendar,
  User,
  Film,
  LogOut,
  Users,
  ChevronDown,
  Plus,
  Trash2,
  ChevronsUpDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTeams } from "@/context/TeamContext";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ── Sub-menu items inside each Team Space ─────────────────────────────────────
const TEAM_NAV_ITEMS = [
  { label: "My Tasks",          icon: ListTodo, suffix: "tasks"      },
  { label: "Review Feedback",   icon: Eye,      suffix: "review"     },
  { label: "Content Calendar",  icon: Calendar, suffix: "calendar"   },
  { label: "Team Space",        icon: Users,    suffix: "team-space" },
  { label: "Profile",           icon: User,     suffix: "profile"    },
];

// Map Tailwind color tokens → hex values for inline style usage
const COLOR_HEX: Record<string, string> = {
  "bg-blue-500":    "#3b82f6",
  "bg-violet-500":  "#8b5cf6",
  "bg-emerald-500": "#10b981",
  "bg-amber-500":   "#f59e0b",
  "bg-rose-500":    "#f43f5e",
  "bg-cyan-500":    "#06b6d4",
};
function teamHex(color: string) {
  return COLOR_HEX[color] ?? "#6366f1";
}

const MAX_VISIBLE = 3;

// ── Add Team inline input ─────────────────────────────────────────────────────
function AddTeamInput({ onAdd, onCancel }: { onAdd: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    const name = value.trim();
    if (name) onAdd(name);
    else onCancel();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="px-3 pb-2"
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={submit}
        placeholder="Team name…"
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40"
      />
    </motion.div>
  );
}

// ── Individual accordion item ─────────────────────────────────────────────────
function TeamAccordion({
  team,
  isOpen,
  onToggle,
  activeNavKey,
  onNavClick,
  onDelete,
}: {
  team: { _id: string; name: string; color: string };
  isOpen: boolean;
  onToggle: () => void;
  activeNavKey: string;
  onNavClick: (teamId: string, suffix: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const hex = teamHex(team.color);

  return (
    <div className="rounded-lg overflow-hidden">
      {/* ── Header ── */}
      <div className="group/header relative flex items-center">
        <button
          onClick={onToggle}
          className={cn(
            "flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-left",
            isOpen
              ? "bg-white/10 text-white"
              : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
          )}
        >
          {/* colour dot */}
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/20"
            style={{ backgroundColor: hex }}
          />
          <span className="flex-1 truncate">{team.name}</span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="shrink-0"
          >
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </motion.span>
        </button>

        {/* Trash icon — only visible on hover of the header row */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(team._id, team.name); }}
          className="absolute right-1 opacity-0 group-hover/header:opacity-100 w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          title="Remove team"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Sub-menu ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-3 pr-1 pb-1.5 pt-0.5 space-y-0.5 border-l-2 ml-[18px] mt-0.5"
              style={{ borderColor: `${hex}40` }}>
              {TEAM_NAV_ITEMS.map((item) => {
                const navKey = `${team._id}::${item.suffix}`;
                const active = activeNavKey === navKey;
                return (
                  <button
                    key={item.suffix}
                    onClick={() => onNavClick(team._id, item.suffix)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150",
                      active
                        ? "text-white"
                        : "text-sidebar-foreground/55 hover:text-white/90 hover:bg-white/5"
                    )}
                    style={active ? { backgroundColor: `${hex}25` } : {}}
                  >
                    {active && (
                      <span
                        className="absolute left-0 w-0.5 h-4 rounded-full -ml-[13px]"
                        style={{ backgroundColor: hex }}
                      />
                    )}
                    <item.icon className="w-3.5 h-3.5 shrink-0" style={active ? { color: hex } : {}} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
const AppSidebar = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { logout } = useAuth();
  const { teams, loading, activeTeamId, setActiveTeamId, addTeam, removeTeam } = useTeams();

  // ── Active team / nav state ──────────────────────────────────────────────
  // Which accordion is open
  const [openTeamId, setOpenTeamId] = useState<string | null>(() => activeTeamId);

  // Persist the open team whenever the active team changes externally
  useEffect(() => {
    if (activeTeamId) setOpenTeamId(activeTeamId);
  }, [activeTeamId]);

  // Active nav item key = "teamId::suffix"
  const [activeNavKey, setActiveNavKey] = useState<string>(() => {
    return localStorage.getItem("activeNavKey") ?? "";
  });

  // ── Show-more state ──────────────────────────────────────────────────────
  const [showAll, setShowAll] = useState(false);
  const displayedTeams = showAll ? teams : teams.slice(0, MAX_VISIBLE);
  const hasMore = teams.length > MAX_VISIBLE;

  // ── Add team input ───────────────────────────────────────────────────────
  const [showInput, setShowInput] = useState(false);

  // ── Seed teams on first load if none exist ───────────────────────────────
  useEffect(() => {
    if (!loading && teams.length === 0) {
      fetch(`${API_BASE}/teams/seed`, { method: "POST" })
        .then(() => window.location.reload())
        .catch(() => {});
    }
  }, [loading, teams.length]);

  const handleToggle = (teamId: string) => {
    const opening = openTeamId !== teamId;
    setOpenTeamId(opening ? teamId : null);
    // Selecting a team via its accordion header updates global state
    // so any mounted page (Tasks, etc.) can react without a full navigation
    if (opening) setActiveTeamId(teamId);
  };

  const handleNavClick = (teamId: string, suffix: string) => {
    const navKey = `${teamId}::${suffix}`;
    setActiveNavKey(navKey);
    setActiveTeamId(teamId);
    localStorage.setItem("activeNavKey", navKey);
    navigate(`/team/${teamId}/${suffix}`);
  };

  const handleAddTeam = async (name: string) => {
    setShowInput(false);
    const team = await addTeam(name);
    if (team) {
      setOpenTeamId(team._id);
      setShowAll(true);
      setActiveTeamId(team._id);
      toast.success(`"${name}" created`);
    } else {
      toast.error("Failed to create team. Check backend connection.");
    }
  };

  const handleDeleteTeam = (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}" and all its tasks, content, and feedback? This cannot be undone.`)) return;
    removeTeam(id).then(() => toast.success(`"${name}" deleted`));
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      await logout();
      navigate("/");
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <aside className="w-60 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* ── Logo ── */}
      <div className="p-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-lg">
          <Film className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-bold text-sidebar-accent-foreground tracking-tight">
          Media Manager
        </span>
      </div>

      {/* ── Overview nav ── */}
      <div className="px-3 pb-2 space-y-0.5">
        <button
          onClick={() => navigate("/dashboard")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
            location.pathname === "/dashboard"
              ? "bg-white/10 text-white"
              : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
          )}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          Dashboard
        </button>
        <button
          onClick={() => navigate("/users")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
            location.pathname === "/users"
              ? "bg-white/10 text-white"
              : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
          )}
        >
          <Users className="w-4 h-4 shrink-0" />
          User Management
        </button>
      </div>

      {/* ── Section label ── */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-1.5">
          <ChevronsUpDown className="w-3 h-3 text-sidebar-foreground/30" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
            Team Spaces
          </p>
        </div>
      </div>

      {/* ── Accordion list ── */}
      <nav className="flex-1 px-3 py-1 overflow-y-auto space-y-0.5">
        {loading ? (
          <div className="space-y-2 px-1 pt-1">
            {[1, 2].map((i) => (
              <div key={i} className="h-9 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence>
            {displayedTeams.map((team) => (
              <motion.div
                key={team._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <TeamAccordion
                  team={team}
                  isOpen={openTeamId === team._id}
                  onToggle={() => handleToggle(team._id)}
                  activeNavKey={activeNavKey}
                  onNavClick={handleNavClick}
                  onDelete={handleDeleteTeam}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* ── See More / Less ── */}
        {hasMore && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-sidebar-foreground/45 hover:text-white/75 transition-colors"
          >
            <ChevronDown
              className={cn("w-3.5 h-3.5 transition-transform duration-200", showAll && "rotate-180")}
            />
            {showAll ? "See Less" : `See ${teams.length - MAX_VISIBLE} More`}
          </button>
        )}
      </nav>

      {/* ── Add Team Space input + button ── */}
      <div className="px-3 pb-2">
        <AnimatePresence>
          {showInput && (
            <AddTeamInput
              onAdd={handleAddTeam}
              onCancel={() => setShowInput(false)}
            />
          )}
        </AnimatePresence>
        {!showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/15 text-[13px] font-medium text-sidebar-foreground/45 hover:border-white/30 hover:text-white/75 hover:bg-white/5 transition-all duration-200 group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:text-white/75" />
            Add Team Space
          </button>
        )}
      </div>

      {/* ── Sign out ── */}
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

export default AppSidebar;
