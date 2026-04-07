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
  Video,
  Film,
  Palette,
  UserCheck,
  UserX,
  Flame,
  Award,
  Download,
  ArrowRight,
  TrendingDown,
  Circle,
  Plus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { io as ioClient, Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

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

interface AttendanceUser {
  name: string;
  role: string;
  attendance: "present" | "leave";
}

type TaskStatus = "upcoming" | "unassigned" | "in-progress" | "under-review" | "completed" | "released";

/* ─── Static data ─────────────────────────────────────────────────────────── */

const teamHighlights = [
  { initials: "AJ", color: "bg-blue-500",    name: "Alex J.",  score: 98, tasks: 14, badge: "⚡ Top Speed"  },
  { initials: "SR", color: "bg-violet-500",  name: "Sara R.",  score: 94, tasks: 12, badge: "🎯 Accurate"   },
  { initials: "MK", color: "bg-emerald-500", name: "Mike K.",  score: 88, tasks: 10, badge: "📈 Consistent" },
  { initials: "LA", color: "bg-amber-500",   name: "Lara A.",  score: 82, tasks:  9, badge: "✨ Creative"   },
];

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  "upcoming":     { label: "Upcoming",     className: "bg-slate-100 text-slate-700 border border-slate-200",      dot: "bg-slate-500"   },
  "unassigned":   { label: "Unassigned",   className: "bg-gray-100 text-gray-600 border border-gray-200",         dot: "bg-gray-400"    },
  "in-progress":  { label: "In Progress",  className: "bg-blue-100 text-blue-700 border border-blue-200",         dot: "bg-blue-500"    },
  "under-review": { label: "Under Review", className: "bg-violet-100 text-violet-700 border border-violet-200",   dot: "bg-violet-500"  },
  "completed":    { label: "Completed",    className: "bg-green-100 text-green-700 border border-green-200",      dot: "bg-green-500"   },
  "released":     { label: "Released",     className: "bg-emerald-100 text-emerald-700 border border-emerald-200",dot: "bg-emerald-500" },
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function deadlineMeta(dateStr: string): { label: string; color: string } {
  const now  = new Date(); now.setHours(0, 0, 0, 0);
  const d    = new Date(dateStr);
  const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  const fmt  = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff < 0)   return { label: fmt + " · Overdue", color: "text-red-600 font-semibold" };
  if (diff === 0) return { label: "Today",             color: "text-red-500 font-semibold" };
  if (diff === 1) return { label: "Tomorrow",          color: "text-amber-600 font-semibold" };
  return { label: fmt, color: "text-gray-500" };
}

function daysUntil(target: Date): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 86_400_000));
}

function daysUntilEndOfMonth(): number {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return daysUntil(end);
}

/* ─── Mini sparkline bars ─────────────────────────────────────────────────── */
const SparkBars = ({ values, color }: { values: number[]; color: string }) => (
  <div className="flex items-end gap-0.5 h-8">
    {values.map((v, i) => (
      <div key={i} className={`w-2 rounded-sm ${color}`} style={{ height: `${v}%`, minHeight: 4 }} />
    ))}
  </div>
);

const SparkLine = ({ values, color }: { values: number[]; color: string }) => {
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 80},${32 - (v / max) * 28}`).join(" ");
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none">
      <polyline points={pts} strokeWidth="2" stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={80} cy={32 - (values[values.length - 1] / max) * 28} r="2.5" fill={color} />
    </svg>
  );
};

/* ─── Radial progress ──────────────────────────────────────────────────────── */
const RadialProg = ({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) => {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [pendingItems,    setPendingItems]    = useState<ContentItem[]>([]);
  const [dashboardTasks,  setDashboardTasks]  = useState<any[]>([]);
  const [attendance,      setAttendance]      = useState<AttendanceUser[]>([]);
  const [loadingContent,  setLoadingContent]  = useState(true);
  const [statusFilter,    setStatusFilter]    = useState<TaskStatus | "All">("All");
  const [dbOnline,        setDbOnline]        = useState<boolean | null>(null);

  useEffect(() => {
    // Content pending review
    fetch(`${API_CONTENT}?status=pending`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setPendingItems(d))
      .catch(() => {})
      .finally(() => setLoadingContent(false));

    // All tasks
    fetch(`${API_BASE}/tasks`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setDashboardTasks(d))
      .catch(() => {});

    // Attendance
    fetch(`${API_BASE}/auth/attendance`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setAttendance(d))
      .catch(() => {});

    // DB health
    fetch(`${API_BASE}/status`)
      .then((r) => setDbOnline(r.ok))
      .catch(() => setDbOnline(false));

    // Real-time updates
    const socket: Socket = ioClient(SOCKET_URL, { withCredentials: true });
    socket.on("taskUpdated", (t: any) => {
      setDashboardTasks((prev) => {
        const exists = prev.find((x) => x._id === t._id);
        return exists ? prev.map((x) => (x._id === t._id ? { ...x, ...t } : x)) : [...prev, t];
      });
    });
    socket.on("taskDeleted", ({ _id }: { _id: string }) => {
      setDashboardTasks((prev) => prev.filter((t) => t._id !== _id));
    });
    return () => { socket.disconnect(); };
  }, []);

  /* ── Derived analytics ──────────────────────────────────────────────────── */

  // Review counts by category
  const longVideos   = pendingItems.filter((i) => ["long_video","video","youtube"].some((k) => i.type?.toLowerCase().includes(k))).length;
  const shortVideos  = pendingItems.filter((i) => ["short","reel","story","tiktok"].some((k) => i.type?.toLowerCase().includes(k))).length;
  const designs      = pendingItems.filter((i) => ["design","graphic","thumbnail","image","poster"].some((k) => i.type?.toLowerCase().includes(k))).length;
  const totalPending = pendingItems.length || (longVideos + shortVideos + designs) || 0;

  // Released this month
  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const releasedThisMonth = dashboardTasks.filter(
    (t) => t.status === "released" && new Date(t.updatedAt ?? t.createdAt) >= startOfMonth
  ).length;

  // Under review
  const underReviewCount = dashboardTasks.filter((t) => t.status === "under-review").length;
  const inProgressCount  = dashboardTasks.filter((t) => t.status === "in-progress").length;
  const completedCount   = dashboardTasks.filter((t) => ["completed","released"].includes(t.status)).length;

  // Target countdown — assume 10 releases per month target
  const monthTarget      = 10;
  const targetPct        = Math.min(Math.round((releasedThisMonth / monthTarget) * 100), 100);
  const daysLeftMonth    = daysUntilEndOfMonth();

  // Onam 2026: August 26
  const onamDate         = new Date(2026, 7, 26);
  const daysToOnam       = daysUntil(onamDate);

  // Attendance
  const presentList  = attendance.filter((u) => u.attendance === "present");
  const absentList   = attendance.filter((u) => u.attendance === "leave");

  // Best editor (first in static highlights; real data would come from tasks)
  const bestEditor   = teamHighlights[0];

  // Filtered tasks for table
  const filteredTasks = statusFilter === "All"
    ? dashboardTasks
    : dashboardTasks.filter((t) => t.status === statusFilter);

  /* ── Top stat cards ─────────────────────────────────────────────────────── */
  const statCards = [
    {
      label: "Projects in Progress", value: inProgressCount || 5,
      sub: `${inProgressCount || 5} active`,
      icon: BarChart2,      iconBg: "bg-blue-50",   iconColor: "text-blue-600",  accent: "border-l-blue-500",
      chart: <SparkBars values={[40,65,45,80,60,90,70]} color="bg-blue-300" />,
    },
    {
      label: "Pending Review",       value: loadingContent ? "—" : underReviewCount || 2,
      sub: "Action Needed",
      icon: AlertTriangle,  iconBg: "bg-amber-50",  iconColor: "text-amber-600", accent: "border-l-amber-500",
      badge: { text: "Action Needed", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    },
    {
      label: "Completed This Month", value: completedCount,
      sub: `${completedCount} tasks`,
      icon: CheckCircle2,   iconBg: "bg-green-50",  iconColor: "text-green-600", accent: "border-l-green-500",
      chart: <SparkLine values={[1,2,1,3,2,3,completedCount||3]} color="#22c55e" />,
    },
    {
      label: "Active Deadlines",     value: 2,
      sub: "Today / Tomorrow",
      icon: Clock,          iconBg: "bg-yellow-50", iconColor: "text-yellow-600",accent: "border-l-yellow-400",
      badge: { text: "2 tasks due soon", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    },
  ];

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-6 space-y-6 bg-[#f5f6fa] min-h-full">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm">Admin Insights</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">
             Welcome, {authUser?.name?.split(" ")[0] || "Admin"} — Production is at <span className="text-emerald-600 font-bold">84% capacity</span> today.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* DB status */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
            {dbOnline === null ? (
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
            ) : dbOnline ? (
              <>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
                </span>
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-tight">System Live</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[11px] font-bold text-red-600 uppercase tracking-tight">System Down</span>
              </>
            )}
          </div>
          
          <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block" />

          {/* Action buttons */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 gap-2 text-xs font-bold rounded-xl border-gray-200 hover:border-gray-900 bg-white shadow-sm transition-all active:scale-95"
            onClick={() => navigate("/reports")}
          >
            <Download className="w-4 h-4 text-gray-400" />
            Get Work Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 gap-2 text-xs font-bold rounded-xl border-gray-200 hover:border-gray-900 bg-white shadow-sm transition-all active:scale-95"
            onClick={() => navigate("/calendar")}
          >
            <Calendar className="w-4 h-4 text-gray-400" />
            Marketing Calendar
          </Button>
          <Button
            size="sm"
            className="h-10 px-5 bg-gray-900 hover:bg-black text-white gap-2 text-xs font-bold rounded-xl shadow-lg shadow-gray-200 transition-all active:scale-95 ml-1"
            onClick={() => navigate("/tasks")}
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* ── Top stat row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s, idx) => (
          <Card key={s.label} className={cn(
             "bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-300 transform hover:-translate-y-1",
             idx === 1 && totalPending > 0 ? " ring-2 ring-amber-400 ring-offset-2" : ""
          )}>
            <CardContent className="p-0">
              <div className="p-5 flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-4xl font-black text-gray-900 tracking-tighter">{s.value}</p>
                  {"badge" in s && s.badge ? (
                    <span className={cn("inline-flex text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wide", s.badge.cls)}>
                      {s.badge.text}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[11px] font-bold text-emerald-600">{s.sub}</p>
                    </div>
                  )}
                </div>
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-300", s.iconBg)}>
                  <s.icon className={cn("w-6 h-6", s.iconColor)} />
                </div>
              </div>
              {"chart" in s && s.chart && (
                 <div className="px-5 pb-4 mt-auto">
                    <div className="h-8 w-full opacity-60 group-hover:opacity-100 transition-opacity">
                       {s.chart}
                    </div>
                 </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ANALYTICS SECTION — 4 cards row
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* ① Videos to Review */}
        <Card className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 transition-transform group-hover:rotate-12">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Review</p>
                  <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{totalPending}</p>
                </div>
              </div>
              {totalPending > 0 && (
                <div className="flex flex-col items-end">
                   <span className="text-[9px] font-black px-2 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-widest animate-bounce">
                     Urgent
                   </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 mb-5">
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/50 border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-default">
                <div className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs text-gray-600 font-bold">Long Videos</span>
                </div>
                <span className="text-xs font-black text-gray-900">{longVideos || 3}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/50 border border-transparent hover:border-violet-100 hover:bg-violet-50/30 transition-all cursor-default">
                <div className="flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs text-gray-600 font-bold">Short Videos</span>
                </div>
                <span className="text-xs font-black text-gray-900">{shortVideos || 5}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/50 border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-default">
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs text-gray-600 font-bold">Designs</span>
                </div>
                <span className="text-xs font-black text-gray-900">{designs || 2}</span>
              </div>
            </div>

            <Button
              size="sm"
              className="w-full h-10 text-xs font-bold bg-blue-600 hover:bg-blue-800 text-white rounded-xl shadow-md shadow-blue-100 transition-all active:scale-95 group/btn"
              onClick={() => navigate("/review")}
            >
              Enter Review Suite <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </CardContent>
        </Card>

        {/* ② Team Space Analytics */}
        <Card className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 transition-transform group-hover:-rotate-12">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth Engine</p>
                <div className="flex items-baseline gap-1.5">
                   <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{releasedThisMonth}</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Released</p>
                </div>
              </div>
            </div>

            <div className="mb-5 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
              <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-2">
                <span>Monthly Target</span>
                <span className="text-emerald-600">{releasedThisMonth} / {monthTarget}</span>
              </div>
              <div className="h-2.5 bg-white rounded-full overflow-hidden border border-gray-100">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${targetPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                 <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{targetPct}% Complete</p>
                 <TrendingUp className="w-3 h-3 text-emerald-500" />
              </div>
            </div>

            <div className="space-y-2">
              {[
                { icon: Circle, text: `${inProgressCount} in Production`, color: "text-blue-500" },
                { icon: Star,   text: `${underReviewCount} Approval Gates`,  color: "text-amber-500" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 group/item">
                  <item.icon className={cn("w-3 h-3 fill-current group-hover/item:scale-125 transition-transform", item.color)} />
                  <span className="text-[11px] text-gray-600 font-bold">{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ③ Target Countdown */}
        <Card className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 to-purple-600" />
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center border border-violet-100 transition-transform group-hover:scale-110">
                <Target className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deadline Pulse</p>
                <div className="flex items-baseline gap-1.5">
                   <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{daysLeftMonth}</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Days Left</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 py-1 mb-5">
              <div className="relative group/radial">
                <RadialProg pct={targetPct} color="#8b5cf6" size={84} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-black text-gray-900 leading-none">{targetPct}%</p>
                    <p className="text-[8px] text-gray-400 font-black uppercase">Quota</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{releasedThisMonth} Done</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{monthTarget - releasedThisMonth} Left</span>
                </div>
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner transition-colors",
              targetPct >= 80 ? "bg-emerald-50 text-emerald-700" : targetPct >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-600"
            )}>
              {targetPct >= 80 ? <Flame className="w-4 h-4" /> : targetPct >= 50 ? <Zap className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {targetPct >= 80 ? "On Fire!" : targetPct >= 50 ? "Steady Pace" : "Low Output"}
            </div>
          </CardContent>
        </Card>

        {/* ④ Event Reminder */}
        <Card className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl shadow-inner border border-orange-100 transition-transform group-hover:rotate-12">
                🎭
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Major Event</p>
                <p className="text-base font-black text-gray-900 tracking-tight">Onam 2026</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { value: Math.floor(daysToOnam / 30), unit: "M" },
                { value: Math.floor((daysToOnam % 30) / 7), unit: "W" },
                { value: daysToOnam % 7, unit: "D" },
              ].map(({ value, unit }) => (
                <div key={unit} className="flex flex-col items-center justify-center bg-orange-50/50 border border-orange-100 rounded-2xl py-2.5 group/timer transition-colors hover:bg-orange-100">
                  <span className="text-2xl font-black text-orange-600 leading-none tracking-tighter truncate w-full text-center">{value}</span>
                  <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest mt-1">{unit}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 mb-5 opacity-70 group-hover:opacity-100 transition-opacity">
              <div className="flex items-start gap-2">
                 <div className="w-1 h-1 rounded-full bg-orange-400 mt-1.5" />
                 <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Content Lock: Aug 10</p>
              </div>
              <div className="flex items-start gap-2">
                 <div className="w-1 h-1 rounded-full bg-orange-400 mt-1.5" />
                 <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Marketing Blast: Aug 15</p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full h-10 text-[10px] font-black uppercase tracking-widest border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl transition-all active:scale-95"
              onClick={() => navigate("/calendar")}
            >
              <Calendar className="w-4 h-4 mr-2 opacity-50" /> Access Strategy
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECOND ANALYTICS ROW — Attendance + Performance
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* ⑤ Team Attendance */}
        <Card className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-teal-400 to-cyan-500" />
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-500" />
              Team Attendance
              <span className="ml-auto text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Today
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Present */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <UserCheck className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                    Working Today
                  </span>
                  <span className="ml-auto text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
                    {presentList.length || 4}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(presentList.length > 0 ? presentList : [
                    { name: "Alex Johnson", role: "editor" },
                    { name: "Sara Rahman",  role: "editor" },
                    { name: "Mike Kumar",   role: "editor" },
                    { name: "Lara Ahmed",   role: "member" },
                  ]).slice(0, 5).map((u) => {
                    const colors = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500"];
                    const bg     = colors[u.name.length % colors.length];
                    return (
                      <div key={u.name} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-gray-800 truncate">{u.name.split(" ")[0]}</p>
                          <p className="text-[9px] text-gray-400 capitalize">{u.role}</p>
                        </div>
                        <span className="ml-auto flex h-1.5 w-1.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Absent */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                    <UserX className="w-3 h-3 text-red-500" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                    On Leave
                  </span>
                  <span className="ml-auto text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">
                    {absentList.length || 1}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {absentList.length > 0 ? absentList.slice(0, 5).map((u) => (
                    <div key={u.name} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-red-50/50">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-[9px] font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-500 truncate">{u.name.split(" ")[0]}</p>
                        <p className="text-[9px] text-red-400 capitalize">On leave</p>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <CheckCircle2 className="w-6 h-6 text-green-400 mb-1" />
                      <p className="text-[10px] font-semibold text-gray-400">Full team present!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ⑥ Team Performance */}
        <Card className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-yellow-400" />
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Team Performance
              <span className="ml-auto text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                This Month
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {/* Best performer spotlight */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 mb-4">
              <div className="relative shrink-0">
                <div className={`w-14 h-14 rounded-2xl ${bestEditor.color} flex items-center justify-center text-white text-xl font-extrabold shadow-lg`}>
                  {bestEditor.initials}
                </div>
                <span className="absolute -top-1 -right-1 text-base">🥇</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-gray-900">{bestEditor.name}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 border border-amber-300 uppercase tracking-wide">
                    MVP
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">{bestEditor.badge} · {bestEditor.tasks} tasks this month</p>
                <div className="mt-2 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full"
                    style={{ width: `${bestEditor.score}%` }}
                  />
                </div>
                <p className="text-[10px] text-amber-700 font-bold mt-1">Performance score: {bestEditor.score}/100</p>
              </div>
            </div>

            {/* Rest of team */}
            <div className="space-y-2">
              {teamHighlights.slice(1).map((m, idx) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="w-4 text-center text-xs text-gray-300 font-bold">{idx === 0 ? "🥈" : idx === 1 ? "🥉" : `${idx + 2}`}</span>
                  <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-gray-700 truncate">{m.name}</p>
                      <span className="text-[10px] font-bold text-gray-600">{m.score}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.color} opacity-70`} style={{ width: `${m.score}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 h-8 text-xs gap-1"
              onClick={() => navigate("/reports")}
            >
              <Award className="w-3.5 h-3.5" /> Full Performance Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          WORKFLOW TABLE
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6">

        {/* Current Workflow table */}
        <Card className="bg-white shadow-sm border border-gray-100 rounded-xl">
          <CardHeader className="pb-0 pt-5 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-blue-500" />
                Current Workflow
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
            {(["All","upcoming","unassigned","in-progress","under-review","completed","released"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as TaskStatus | "All")}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors",
                  statusFilter === s
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                )}
              >
                {s === "All" ? "All" : statusConfig[s]?.label || s}
              </button>
            ))}
          </div>

          <CardContent className="p-0 pb-2">
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
                <div className="py-10 text-center text-sm text-gray-400">No tasks match this filter.</div>
              )}
              {filteredTasks.map((task) => {
                const dl          = deadlineMeta(task.endDate || task.createdAt);
                const sc          = statusConfig[task.status] || statusConfig["unassigned"];
                const assignName  = typeof task.assignedTo === "object" && task.assignedTo ? task.assignedTo.name : task.assignee || "Unassigned";
                const initials    = assignName.substring(0, 2).toUpperCase();
                const avatarColors= ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500"];
                const avatarBg    = avatarColors[assignName.length % avatarColors.length];
                const projectName = typeof task.teamSpaceId === "object" && task.teamSpaceId ? task.teamSpaceId.name : typeof task.teamId === "object" && task.teamId ? task.teamId.name : "General";

                return (
                  <div
                    key={task._id}
                    className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr_auto] gap-3 items-center px-6 py-3.5 hover:bg-gray-50/70 transition-colors group"
                  >
                    <div className="flex flex-col truncate">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      {task.createdBy && typeof task.createdBy === "object" && (
                        <p className="text-[9px] text-gray-400 mt-0.5 truncate flex items-center gap-1">
                          {task.createdBy.role === "admin"
                            ? <span className="font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-sm">Assigned by Admin</span>
                            : <><span className="font-semibold">{task.createdBy.name}</span></>
                          }
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{projectName}</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${avatarBg} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                        {initials}
                      </div>
                      <span className="text-xs text-gray-600 hidden lg:inline truncate">{assignName}</span>
                    </div>
                    <span className={`text-xs ${dl.color}`}>{dl.label}</span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit ${sc.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
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
                  <span className="w-5 text-center text-xs font-bold text-gray-400">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                  </span>
                  <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                    {member.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-800 truncate">{member.name}</p>
                      <span className="text-xs font-bold text-gray-700">{member.score}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${member.color} opacity-70`} style={{ width: `${member.score}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{member.badge} · {member.tasks} tasks</p>
                  </div>
                </div>
              ))}
              <Button
                variant="outline" size="sm"
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
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-green-800">5/5 Videos — April</p>
                  <p className="text-[10px] text-green-600 mt-0.5">YouTube target achieved! 🎉</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-800">Onam Campaign</p>
                  <p className="text-[10px] text-violet-600 mt-0.5">{daysToOnam} days · Release creatives</p>
                </div>
              </div>
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Next deadlines</p>
                {[
                  { label: "Social Reels Q1 wrap",       date: "Mar 20" },
                  { label: "Brand Launch deliverables",  date: "Mar 22" },
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
                variant="outline" size="sm"
                className="w-full text-xs h-8"
                onClick={() => navigate("/calendar")}
              >
                View Monthly Targets
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
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
                icon: Eye,      label: "Review Submissions", sub: `${loadingContent ? "…" : totalPending} pending`,
                color: "text-blue-600", bg: "bg-blue-50", hover: "hover:border-blue-300 hover:bg-blue-50/50", path: "/review",
              },
              {
                icon: Calendar, label: "Content Calendar",  sub: "View schedule",
                color: "text-violet-600", bg: "bg-violet-50", hover: "hover:border-violet-300 hover:bg-violet-50/50", path: "/calendar",
              },
              {
                icon: FileText, label: "Work Report",       sub: "Analytics & stats",
                color: "text-green-600",  bg: "bg-green-50",  hover: "hover:border-green-300 hover:bg-green-50/50",  path: "/reports",
              },
              {
                icon: Users,    label: "Team Space",        sub: "Manage editors",
                color: "text-amber-600",  bg: "bg-amber-50",  hover: "hover:border-amber-300 hover:bg-amber-50/50",  path: "/tasks",
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
