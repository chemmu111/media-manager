import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Eye,
  Calendar,
  FileText,
  Users,
  Trophy,
  Zap,
  Target,
  Star,
  Clock,
  ChevronRight,
  PlayCircle,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { io as ioClient, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL.replace("/api", "");

const API_BASE    = import.meta.env.VITE_API_BASE_URL;
const API_CONTENT = `${API_BASE}/content`;

interface ContentItem {
  _id: string;
  title: string;
  type: string;
  status: string;
  submittedBy: string;
  submittedAt: string;
}

/* ─── Static / mock data ─────────────────────────────────────────────────── */

type TaskStatus = "upcoming" | "unassigned" | "in-progress" | "under-review" | "completed" | "released";

const teamHighlights = [
  { initials: "AJ", color: "bg-blue-500", name: "Alex J.", score: 98, tasks: 14, badge: "⚡ Top Speed" },
  { initials: "SR", color: "bg-violet-500", name: "Sara R.", score: 94, tasks: 12, badge: "🎯 Accurate" },
  { initials: "MK", color: "bg-emerald-500", name: "Mike K.", score: 88, tasks: 10, badge: "📈 Consistent" },
  { initials: "LA", color: "bg-amber-500", name: "Lara A.", score: 82, tasks: 9, badge: "✨ Creative" },
];

const statusConfig: Record<string, { label: string, className: string; dot: string }> = {
  "upcoming":    { label: "Upcoming",    className: "bg-slate-100 text-slate-700 border border-slate-200",     dot: "bg-slate-500" },
  "unassigned":  { label: "Unassigned",  className: "bg-gray-100 text-gray-600 border border-gray-200",        dot: "bg-gray-400" },
  "in-progress": { label: "In Progress", className: "bg-blue-100 text-blue-700 border border-blue-200",        dot: "bg-blue-500" },
  "under-review":{ label: "Under Review",className: "bg-violet-100 text-violet-700 border border-violet-200",  dot: "bg-violet-500" },
  "completed":   { label: "Completed",   className: "bg-green-100 text-green-700 border border-green-200",     dot: "bg-green-500" },
  "released":    { label: "Released",    className: "bg-emerald-100 text-emerald-700 border border-emerald-200",dot: "bg-emerald-500" },
};

function deadlineMeta(dateStr: string): { label: string; color: string } {
  const now  = new Date();
  now.setHours(0, 0, 0, 0);
  const d    = new Date(dateStr);
  const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  const fmt  = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff < 0)  return { label: fmt + " · Overdue", color: "text-red-600 font-semibold" };
  if (diff === 0) return { label: "Today",            color: "text-red-500 font-semibold" };
  if (diff === 1) return { label: "Tomorrow",         color: "text-amber-600 font-semibold" };
  return { label: fmt, color: "text-gray-500" };
}

/* ─── Mini sparkline bars (pure CSS) ──────────────────────────────────────── */
const SparkBars = ({ values, color }: { values: number[]; color: string }) => (
  <div className="flex items-end gap-0.5 h-8">
    {values.map((v, i) => (
      <div key={i} className={`w-2 rounded-sm ${color}`} style={{ height: `${v}%`, minHeight: 4 }} />
    ))}
  </div>
);

const SparkLine = ({ values, color }: { values: number[]; color: string }) => {
  const max = Math.max(...values);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 80},${32 - (v / max) * 28}`)
    .join(" ");
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none">
      <polyline points={pts} strokeWidth="2" stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={80} cy={32 - (values[values.length - 1] / max) * 28} r="2.5" fill={color} />
    </svg>
  );
};

/* ─── Dashboard ────────────────────────────────────────────────────────────── */

const Dashboard = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [pendingItems, setPendingItems] = useState<ContentItem[]>([]);
  const [dashboardTasks, setDashboardTasks] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_CONTENT}?status=pending`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setPendingItems(data))
      .catch(() => {})
      .finally(() => setLoadingContent(false));

    fetch(`${API_BASE}/tasks`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setDashboardTasks(data))
      .catch(() => {});

    fetch(`${API_BASE}/status`)
      .then((r) => setDbOnline(r.ok))
      .catch(() => setDbOnline(false));

    // Real-time task updates
    const socket: Socket = ioClient(SOCKET_URL, { withCredentials: true });
    socket.on("taskUpdated", (updatedTask: any) => {
      setDashboardTasks((prev) => {
        const exists = prev.find((t) => t._id === updatedTask._id);
        if (exists) {
          return prev.map((t) => (t._id === updatedTask._id ? { ...t, ...updatedTask } : t));
        }
        return [...prev, updatedTask];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const pendingReview = pendingItems.length;
  const videoCount   = pendingItems.filter((i) => i.type === "video").length;

  const filteredTasks =
    statusFilter === "All"
      ? dashboardTasks
      : dashboardTasks.filter((t) => t.status === statusFilter);

  const statCards = [
    {
      label: "Projects in Progress",
      value: 5,
      sub: "5 projects",
      icon: BarChart2,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      accent: "border-l-blue-500",
      chart: <SparkBars values={[40, 65, 45, 80, 60, 90, 70]} color="bg-blue-300" />,
    },
    {
      label: "Tasks Pending Review",
      value: loadingContent ? "—" : pendingReview || 2,
      sub: "Action Needed",
      icon: AlertTriangle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      accent: "border-l-amber-500",
      badge: { text: "Action Needed", cls: "bg-amber-100 text-amber-700 border-amber-200" },
      chart: null,
    },
    {
      label: "Completed This Week",
      value: 3,
      sub: "3 tasks",
      icon: CheckCircle2,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      accent: "border-l-green-500",
      chart: <SparkLine values={[1, 2, 1, 3, 2, 3, 3]} color="#22c55e" />,
    },
    {
      label: "Active Deadlines",
      value: 2,
      sub: "Today / Tomorrow",
      icon: Clock,
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-600",
      accent: "border-l-yellow-400",
      badge: { text: "2 tasks due soon", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      chart: null,
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-[#f5f6fa] min-h-full">

      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, {authUser?.name?.split(" ")[0] || "Admin"} — here's your production overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* DB status badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white shadow-sm">
            {dbOnline === null ? (
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
            ) : dbOnline ? (
              <>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
                </span>
                <span className="text-xs font-medium text-green-700">Database Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-600">Database Offline</span>
              </>
            )}
          </div>
          <Button
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white shadow-sm"
            onClick={() => navigate("/tasks")}
          >
            <ArrowUpRight className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* ── Top stat cards ─────────────────────────────────────────── */}
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
                    {s.value}
                  </p>
                  {s.badge ? (
                    <span
                      className={`mt-2 inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge.cls}`}
                    >
                      {s.badge.text}
                    </span>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                  )}
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
              </div>
              {s.chart && <div className="mt-3 pt-3 border-t border-gray-50">{s.chart}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Middle row: Workflow (70%) + Right panel (30%) ─────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">

        {/* Current Workflow table — 7 cols */}
        <Card className="xl:col-span-7 bg-white shadow-sm border border-gray-100 rounded-xl">
          <CardHeader className="pb-0 pt-5 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-blue-500" />
                Current Workflow — Team Space 1
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Live task board for active projects</p>
            </div>
            <button
              onClick={() => navigate("/tasks")}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </CardHeader>

            <div className="px-6 pt-4 pb-2 flex items-center gap-2 flex-wrap">
            {(["All", "upcoming", "unassigned", "in-progress", "under-review", "completed", "released"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as TaskStatus | "All")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  statusFilter === s
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {s === "All" ? "All" : statusConfig[s]?.label || s}
              </button>
            ))}
          </div>

          <CardContent className="p-0 pb-2">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr_auto] gap-3 px-6 py-2.5 bg-gray-50 border-y border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <span>Task</span>
              <span>Project / Team</span>
              <span>Assigned To</span>
              <span>Deadline</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-gray-50">
              {filteredTasks.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">
                  No tasks match this filter.
                </div>
              )}
              {filteredTasks.map((task) => {
                const dl   = deadlineMeta(task.endDate || task.createdAt);
                const sc   = statusConfig[task.status] || statusConfig["unassigned"];
                
                // Safety extract assignees
                const assignName = typeof task.assignedTo === 'object' && task.assignedTo ? task.assignedTo.name : task.assignee || 'Unassigned';
                const initialStr = assignName.substring(0,2).toUpperCase();
                
                // Color gen
                const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
                const colorHash = assignName.length % colors.length;
                const avatarBg = colors[colorHash];

                const projectName = typeof task.teamSpaceId === 'object' && task.teamSpaceId ? task.teamSpaceId.name : typeof task.teamId === 'object' && task.teamId ? task.teamId.name : 'General';

                return (
                  <div
                    key={task._id}
                    className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr_auto] gap-3 items-center px-6 py-3.5 hover:bg-gray-50/70 transition-colors group"
                  >
                    {/* Task name */}
                    <div className="flex flex-col truncate">
                        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                        {task.createdBy && typeof task.createdBy === 'object' && (
                            <p className="text-[9px] text-gray-400 mt-0.5 truncate flex items-center gap-1">
                                {task.createdBy.role === 'admin' 
                                  ? <span className="font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-sm">Assigned by Admin</span> 
                                  : <>By <span className="font-semibold">{task.createdBy.name}</span></>
                                }
                            </p>
                        )}
                    </div>

                    {/* Project */}
                    <p className="text-xs text-gray-500 truncate">{projectName}</p>

                    {/* Avatar */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full ${avatarBg} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
                        title={assignName}
                      >
                        {initialStr}
                      </div>
                      <span className="text-xs text-gray-600 hidden lg:inline truncate">
                        {assignName}
                      </span>
                    </div>

                    {/* Deadline */}
                    <span className={`text-xs ${dl.color}`}>{dl.label}</span>

                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit ${sc.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Edit"
                        onClick={() => navigate("/tasks")}
                        className="w-7 h-7 rounded-md bg-gray-100 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors text-gray-500"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Review"
                        onClick={() => navigate("/review")}
                        className="w-7 h-7 rounded-md bg-gray-100 hover:bg-violet-100 hover:text-violet-600 flex items-center justify-center transition-colors text-gray-500"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right panel — 3 cols */}
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
              {teamHighlights.map((member, idx) => (
                <div key={member.name} className="flex items-center gap-3">
                  {/* Rank */}
                  <span className="w-5 text-center text-xs font-bold text-gray-400">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                  </span>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                    {member.initials}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-800 truncate">{member.name}</p>
                      <span className="text-xs font-bold text-gray-700">{member.score}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${member.color} opacity-70`}
                        style={{ width: `${member.score}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {member.badge} · {member.tasks} tasks
                    </p>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs h-8"
                onClick={() => navigate("/reports")}
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                Full Performance Report
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Milestones */}
          <Card className="bg-white shadow-sm border border-gray-100 rounded-xl">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-violet-500" />
                Upcoming Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {/* Congratulations row */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-green-800">5/5 Videos — April</p>
                  <p className="text-[10px] text-green-600 mt-0.5">YouTube target achieved! 🎉</p>
                </div>
              </div>

              {/* Target row */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-800">Onam Campaign</p>
                  <p className="text-[10px] text-violet-600 mt-0.5">50 days · Release creatives</p>
                </div>
              </div>

              {/* Mini deadline list */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Next deadlines
                </p>
                {[
                  { label: "Social Reels Q1 wrap", date: "Mar 20" },
                  { label: "Brand Launch deliverables", date: "Mar 22" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      {m.label}
                    </span>
                    <span className="text-gray-400 font-medium">{m.date}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => navigate("/targets")}
              >
                View Monthly Targets
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <Card className="bg-white shadow-sm border border-gray-100 rounded-xl">
        <CardHeader className="pb-3 pt-5 px-6">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: Eye,
                label: "Review Submissions",
                sub: `${loadingContent ? "…" : videoCount} pending`,
                color: "text-blue-600",
                bg: "bg-blue-50",
                hover: "hover:border-blue-300 hover:bg-blue-50/50",
                path: "/review",
              },
              {
                icon: Calendar,
                label: "Content Calendar",
                sub: "View schedule",
                color: "text-violet-600",
                bg: "bg-violet-50",
                hover: "hover:border-violet-300 hover:bg-violet-50/50",
                path: "/calendar",
              },
              {
                icon: FileText,
                label: "Reports",
                sub: "Analytics & stats",
                color: "text-green-600",
                bg: "bg-green-50",
                hover: "hover:border-green-300 hover:bg-green-50/50",
                path: "/reports",
              },
              {
                icon: Users,
                label: "Team Space",
                sub: "Manage editors",
                color: "text-amber-600",
                bg: "bg-amber-50",
                hover: "hover:border-amber-300 hover:bg-amber-50/50",
                path: "/tasks",
              },
            ].map((qa) => (
              <button
                key={qa.label}
                onClick={() => navigate(qa.path)}
                className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 ${qa.hover} transition-all text-left group`}
              >
                <div className={`w-9 h-9 rounded-lg ${qa.bg} flex items-center justify-center shrink-0`}>
                  <qa.icon className={`w-4 h-4 ${qa.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{qa.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{qa.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default Dashboard;
