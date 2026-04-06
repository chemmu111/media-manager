import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Trophy,
  TrendingUp,
  Search,
  MoreHorizontal,
  Edit3,
  Eye,
  Target,
  CalendarClock,
  CheckCircle2,
  Clock,
  Zap,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

const API_BASE = `http://${window.location.hostname}:8080/api`;

/* ─── Types ─────────────────────────────────────────────────────────────── */

type DisplayStatus = "In Editing" | "Submitted" | "Feedback" | "Pending" | "Completed";

interface EnrichedTask {
  _id: string;
  title: string;
  platform: string;
  assignee: string;
  assigneeColor: string;
  assigneeInit: string;
  endDate: string | null;
  displayStatus: DisplayStatus;
  priority: string;
}

interface TeamMember {
  name: string;
  role: string;
  taskCount: number;
  completed: number;
  efficiency: number;
  color: string;
  initials: string;
}

interface Milestone {
  _id: string;
  title: string;
  endDate: string;
  assignee: string;
  status: string;
  color: string;
}

/* ─── Config ─────────────────────────────────────────────────────────────── */

const STATUS_FILTERS: (DisplayStatus | "All")[] = [
  "All", "In Editing", "Submitted", "Feedback", "Pending", "Completed",
];

const statusConfig: Record<DisplayStatus, { className: string; dot: string }> = {
  "In Editing": { className: "bg-blue-100 text-blue-700 border border-blue-200",     dot: "bg-blue-500"   },
  Submitted:    { className: "bg-violet-100 text-violet-700 border border-violet-200", dot: "bg-violet-500" },
  Feedback:     { className: "bg-orange-100 text-orange-700 border border-orange-200", dot: "bg-orange-500" },
  Pending:      { className: "bg-gray-100 text-gray-600 border border-gray-200",       dot: "bg-gray-400"   },
  Completed:    { className: "bg-green-100 text-green-700 border border-green-200",   dot: "bg-green-500"  },
};

const RANK_BADGES = ["🥇", "🥈", "🥉"];

const MEMBER_BADGES = ["⚡ Top Speed", "🎯 Accurate", "📈 Consistent", "✨ Creative", "🔥 Rising Star"];

const platformLabel: Record<string, string> = {
  youtube:   "YouTube",
  instagram: "Instagram",
  facebook:  "Facebook",
  linkedin:  "LinkedIn",
  other:     "Other",
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function deadlineMeta(dateStr: string | null): { label: string; color: string } {
  if (!dateStr) return { label: "—", color: "text-gray-400" };
  const now  = new Date();
  now.setHours(0, 0, 0, 0);
  const d    = new Date(dateStr);
  const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  const fmt  = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff < 0)   return { label: `${fmt} · Overdue`, color: "text-red-600 font-semibold" };
  if (diff === 0) return { label: "Today",             color: "text-red-500 font-semibold" };
  if (diff === 1) return { label: "Tomorrow",          color: "text-amber-600 font-semibold" };
  return { label: fmt, color: "text-gray-500" };
}

/* ─── Action Dropdown ────────────────────────────────────────────────────── */

function ActionMenu({ onEdit, onReview }: { onEdit: () => void; onReview: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-500" />
            Edit Task
          </button>
          <button
            onClick={() => { onReview(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-violet-500" />
            Review
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

const TeamSpace = () => {
  const navigate = useNavigate();

  const [tasks, setTasks]               = useState<EnrichedTask[]>([]);
  const [teamMembers, setTeamMembers]   = useState<TeamMember[]>([]);
  const [milestones, setMilestones]     = useState<Milestone[]>([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | "All">("All");
  const [search, setSearch]             = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch(`${API_BASE}/team/workflow`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks ?? []);
        setTeamMembers(data.teamMembers ?? []);
        setMilestones(data.milestones ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  /* filtered + searched tasks */
  const visibleTasks = tasks.filter((t) => {
    const matchStatus = statusFilter === "All" || t.displayStatus === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.assignee ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  /* stat cards derived from live data */
  const inEditing   = tasks.filter((t) => t.displayStatus === "In Editing").length;
  const completed   = tasks.filter((t) => t.displayStatus === "Completed").length;
  const pending     = tasks.filter((t) => t.displayStatus === "Pending").length;
  const overdue     = tasks.filter((t) => {
    if (!t.endDate) return false;
    return new Date(t.endDate) < new Date() && t.displayStatus !== "Completed";
  }).length;

  const statCards = [
    {
      label:     "Active Editors",
      value:     teamMembers.length,
      sub:       "team members",
      icon:      Users,
      iconBg:    "bg-blue-50",
      iconColor: "text-blue-600",
      accent:    "border-l-blue-500",
    },
    {
      label:     "In Editing",
      value:     inEditing,
      sub:       "tasks in progress",
      icon:      Zap,
      iconBg:    "bg-violet-50",
      iconColor: "text-violet-600",
      accent:    "border-l-violet-500",
    },
    {
      label:     "Completed",
      value:     completed,
      sub:       "tasks done",
      icon:      CheckCircle2,
      iconBg:    "bg-green-50",
      iconColor: "text-green-600",
      accent:    "border-l-green-500",
    },
    {
      label:     "Overdue",
      value:     overdue,
      sub:       pending > 0 ? `+ ${pending} pending` : "no pending tasks",
      icon:      Clock,
      iconBg:    "bg-red-50",
      iconColor: "text-red-500",
      accent:    "border-l-red-500",
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-[#f5f6fa] min-h-full">

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Team Space 1
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live workflow board — all tasks across your team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search team member or task…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-64"
            />
          </div>
          <button
            onClick={fetchData}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors text-gray-500"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={`bg-white shadow-sm border border-gray-100 border-l-4 ${s.accent} rounded-xl`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {s.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 leading-none">
                    {loading ? "—" : s.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Middle row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">

        {/* ── Task table — 7 cols ────────────────────────────────── */}
        <Card className="xl:col-span-7 bg-white shadow-sm border border-gray-100 rounded-xl">
          <CardHeader className="pb-0 pt-5 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Current Workflow
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                All active tasks assigned across the team
              </p>
            </div>
            <button
              onClick={() => navigate("/tasks")}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
            >
              Full Board <ChevronRight className="w-3 h-3" />
            </button>
          </CardHeader>

          {/* Filter pills */}
          <div className="px-6 pt-4 pb-2 flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  statusFilter === s
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <CardContent className="p-0 pb-2">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1.2fr_auto] gap-3 px-6 py-2.5 bg-gray-50 border-y border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <span>Task Name</span>
              <span>Project</span>
              <span>Assigned To</span>
              <span>Deadline</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            <div className="divide-y divide-gray-50">
              {loading && (
                <div className="py-12 text-center text-sm text-gray-400">
                  Loading workflow…
                </div>
              )}

              {!loading && visibleTasks.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">
                  No tasks match this filter.
                </div>
              )}

              {!loading && visibleTasks.map((task) => {
                const dl = deadlineMeta(task.endDate);
                const sc = statusConfig[task.displayStatus] ?? statusConfig.Pending;
                return (
                  <div
                    key={task._id}
                    className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1.2fr_auto] gap-3 items-center px-6 py-3.5 hover:bg-gray-50/70 transition-colors group"
                  >
                    {/* Task name */}
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>

                    {/* Project (platform) */}
                    <p className="text-xs text-gray-500 truncate">
                      {platformLabel[task.platform] ?? task.platform ?? "—"}
                    </p>

                    {/* Assigned to */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full ${task.assigneeColor} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
                        title={task.assignee}
                      >
                        {task.assigneeInit || "?"}
                      </div>
                      <span className="text-xs text-gray-600 hidden lg:inline truncate">
                        {task.assignee || "Unassigned"}
                      </span>
                    </div>

                    {/* Deadline */}
                    <span className={`text-xs ${dl.color}`}>{dl.label}</span>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit ${sc.className}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {task.displayStatus}
                    </span>

                    {/* Action (three dots) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionMenu
                        onEdit={() => navigate("/tasks")}
                        onReview={() => navigate("/review")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Right panel — 3 cols ──────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4 flex flex-col">

          {/* Team Highlights */}
          <Card className="bg-white shadow-sm border border-gray-100 rounded-xl flex-1">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Team Highlights
                <span className="ml-auto text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Efficiency
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {loading && (
                <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
              )}
              {!loading && teamMembers.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No team members yet.</p>
              )}
              {!loading && teamMembers.slice(0, 5).map((member, idx) => (
                <div key={member.name} className="flex items-center gap-3">
                  {/* Rank */}
                  <span className="w-5 text-center text-xs font-bold text-gray-400">
                    {RANK_BADGES[idx] ?? `${idx + 1}`}
                  </span>
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}
                  >
                    {member.initials}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-800 truncate capitalize">
                        {member.name}
                      </p>
                      <span className="text-xs font-bold text-gray-700">
                        {member.efficiency}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${member.color} opacity-70 transition-all`}
                        style={{ width: `${member.efficiency}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {MEMBER_BADGES[idx % MEMBER_BADGES.length]} · {member.taskCount} tasks
                    </p>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs h-8"
                onClick={() => navigate("/tasks")}
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                View Full Task Board
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Milestones */}
          <Card className="bg-white shadow-sm border border-gray-100 rounded-xl">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-blue-500" />
                Upcoming Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {loading && (
                <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
              )}
              {!loading && milestones.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No upcoming deadlines.</p>
              )}
              {!loading && milestones.map((m) => {
                const dl = deadlineMeta(m.endDate);
                return (
                  <div key={m._id} className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Target className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{m.title}</p>
                      <p className={`text-[10px] mt-0.5 ${dl.color}`}>{dl.label}</p>
                      {m.assignee && (
                        <p className="text-[10px] text-gray-400 truncate">→ {m.assignee}</p>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        statusConfig[m.status as DisplayStatus]?.className ?? "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default TeamSpace;
