import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { io as ioClient, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL.replace("/api", "");
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Calendar,
  Filter,
  Loader2,
  Globe,
  PlayCircle,
  Camera,
  MessageCircle,
  Briefcase,
  LayoutGrid,
  List,
  Edit3,
  Eye,
  Trophy,
  Zap,
  Target,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart2,
  ChevronRight,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTeams } from "@/context/TeamContext";
import TaskModal, { ModalTask } from "@/components/TaskModal";
import TaskChat from "@/components/TaskChat";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API = `${import.meta.env.VITE_API_BASE_URL}/tasks`;

type TaskStatus =
  | "upcoming"
  | "unassigned"
  | "in-progress"
  | "completed"
  | "under-review"
  | "released"
  | "rejected"
  | "idea_approved"
  | "preparing"
  | "shooting"
  | "waiting_approval"
  | "under_correction";
type Platform = "youtube" | "instagram" | "facebook" | "linkedin" | "other";
type TaskType = "task" | "event";

interface AssignedEditor {
  _id:  string;
  name: string;
  role: string;
}

interface Task {
  _id:        string;
  title:      string;
  description?: string;
  status:     TaskStatus;
  priority:   "high" | "medium" | "low";
  assignee?:  string;                           // legacy plain-string name
  assignedTo?: AssignedEditor | string | null;  // populated ObjectId
  endDate?:   string;
  platform?:  Platform;
  type?:      TaskType;
}

/* ─── Column definitions ───────────────────────────────────────────────────── */
const columns: {
  id: TaskStatus;
  label: string;
  dot: string;
  headerBg: string;
  badgeClass: string;
}[] = [
  {
    id: "upcoming",
    label: "Upcoming",
    dot: "bg-slate-500",
    headerBg: "border-t-slate-500",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    id: "unassigned",
    label: "Unassigned",
    dot: "bg-gray-400",
    headerBg: "border-t-gray-400",
    badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
  },
  {
    id: "in-progress",
    label: "In Progress",
    dot: "bg-blue-500",
    headerBg: "border-t-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    id: "completed",
    label: "Completed",
    dot: "bg-green-500",
    headerBg: "border-t-green-500",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
  },
  {
    id: "under-review",
    label: "Under Review",
    dot: "bg-amber-500",
    headerBg: "border-t-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    id: "released",
    label: "Released",
    dot: "bg-violet-500",
    headerBg: "border-t-violet-500",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    id: "rejected",
    label: "Correction",
    dot: "bg-red-500",
    headerBg: "border-t-red-500",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
  },
];

const tableStatusConfig: Record<
  TaskStatus,
  { label: string; className: string; dot: string }
> = {
  upcoming: {
    label: "Upcoming",
    className: "bg-slate-100 text-slate-700 border border-slate-200",
    dot: "bg-slate-500",
  },
  unassigned: {
    label: "Unassigned",
    className: "bg-gray-100 text-gray-600 border border-gray-200",
    dot: "bg-gray-400",
  },
  "in-progress": {
    label: "In Editing",
    className: "bg-blue-100 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border border-green-200",
    dot: "bg-green-500",
  },
  "under-review": {
    label: "Submitted",
    className: "bg-violet-100 text-violet-700 border border-violet-200",
    dot: "bg-violet-500",
  },
  released: {
    label: "Released",
    className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Feedback",
    className: "bg-orange-100 text-orange-700 border border-orange-200",
    dot: "bg-orange-500",
  },
  idea_approved: {
    label: "Idea Approved",
    className: "bg-yellow-100 text-yellow-700 border border-yellow-300",
    dot: "bg-yellow-400",
  },
  preparing: {
    label: "Preparing",
    className: "bg-orange-100 text-orange-700 border border-orange-300",
    dot: "bg-orange-400",
  },
  shooting: {
    label: "Shooting",
    className: "bg-amber-100 text-amber-700 border border-amber-300",
    dot: "bg-amber-500",
  },
  waiting_approval: {
    label: "Waiting Approval",
    className: "bg-orange-50 text-orange-800 border border-orange-300",
    dot: "bg-orange-600",
  },
  under_correction: {
    label: "Under Correction",
    className: "bg-rose-100 text-rose-700 border border-rose-300",
    dot: "bg-rose-400",
  },
};

const priorityConfig = {
  high: "bg-red-100 text-red-600 border border-red-200",
  medium: "bg-amber-100 text-amber-600 border border-amber-200",
  low: "bg-gray-100 text-gray-500 border border-gray-200",
};

const platformIcons: Record<string, React.ElementType> = {
  youtube: PlayCircle,
  instagram: Camera,
  facebook: MessageCircle,
  linkedin: Briefcase,
  other: Globe,
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function deadlineMeta(dateStr?: string): { label: string; color: string } {
  if (!dateStr) return { label: "No deadline", color: "text-gray-400" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  const fmt = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff < 0) return { label: `${fmt} · Overdue`, color: "text-red-600 font-semibold" };
  if (diff === 0) return { label: "Today", color: "text-red-500 font-semibold" };
  if (diff === 1) return { label: "Tomorrow", color: "text-amber-600 font-semibold" };
  return { label: fmt, color: "text-gray-500" };
}

/* ─── Priority badge config ────────────────────────────────────────────────── */
const priorityBadge: Record<string, { label: string; cls: string; dot: string }> = {
  high:   { label: "H", cls: "bg-red-50   text-red-600   border-red-200",   dot: "bg-red-500"   },
  medium: { label: "M", cls: "bg-amber-50 text-amber-600 border-amber-200", dot: "bg-amber-400" },
  low:    { label: "L", cls: "bg-gray-50  text-gray-400  border-gray-200",  dot: "bg-gray-300"  },
};

/* ─── Circular progress ring ──────────────────────────────────────────────── */
const ProgressRing = ({
  pct,
  color,
  trackColor = "#e5e7eb",
  size = 48,
}: {
  pct: number;
  color: string;
  trackColor?: string;
  size?: number;
}) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
};

/* ─── Sparklines ───────────────────────────────────────────────────────────── */
const SparkBars = ({ values, color }: { values: number[]; color: string }) => (
  <div className="flex items-end gap-0.5 h-7">
    {values.map((v, i) => (
      <div
        key={i}
        className={`w-2 rounded-sm ${color}`}
        style={{ height: `${v}%`, minHeight: 3 }}
      />
    ))}
  </div>
);

const SparkLine = ({ values, color }: { values: number[]; color: string }) => {
  const max = Math.max(...values);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 80},${28 - (v / max) * 24}`)
    .join(" ");
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" fill="none">
      <polyline
        points={pts}
        strokeWidth="2"
        stroke={color}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={80}
        cy={28 - (values[values.length - 1] / max) * 24}
        r="2.5"
        fill={color}
      />
    </svg>
  );
};

/* ─── Avatar initials helper ───────────────────────────────────────────────── */
const avatarColors = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];
function avatarColor(name: string) {
  const safeName = (name || "User").trim() || "User";
  let hash = 0;
  for (const c of safeName) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

/* ─── Static side-panel data ───────────────────────────────────────────────── */
const teamHighlights = [
  { initials: "AJ", name: "Alex J.", score: 98, tasks: 14, badge: "⚡ Top Speed" },
  { initials: "SR", name: "Sara R.", score: 94, tasks: 12, badge: "🎯 Accurate" },
  { initials: "MK", name: "Mike K.", score: 88, tasks: 10, badge: "📈 Consistent" },
  { initials: "LA", name: "Lara A.", score: 82, tasks: 9, badge: "✨ Creative" },
];

/* ══════════════════════════════════════════════════════════════════════════════
   TASK CARD INNER — reused by SortableTaskCard and DragOverlay
══════════════════════════════════════════════════════════════════════════════ */
const TaskCardInner = ({
  task,
  col,
  onClick,
  onChat,
  dragging = false,
  highlighted = false,
}: {
  task: Task;
  col: (typeof columns)[0];
  onClick?: (e: React.MouseEvent) => void;
  onChat?: (e: React.MouseEvent) => void;
  dragging?: boolean;
  highlighted?: boolean;
}) => {
  const PlatformIcon = platformIcons[task.platform || "other"];
  const pb = priorityBadge[task.priority] ?? priorityBadge.low;
  const dl = deadlineMeta(task.endDate);

  // Resolve editor name from populated assignedTo object or legacy assignee string
  const editorName =
    typeof task.assignedTo === "object" && task.assignedTo
      ? (task.assignedTo as AssignedEditor).name
      : task.assignee || null;

  const isActive = task.status === "in-progress";

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border shadow-sm select-none overflow-hidden group/card",
        "transition-all duration-300",
        dragging
          ? "shadow-2xl border-blue-300 rotate-2 scale-105"
          : highlighted
          ? "border-blue-400 ring-2 ring-blue-400/40 ring-offset-1 shadow-lg shadow-blue-100 scale-[1.01] cursor-grab"
          : "border-gray-100 hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5 cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Thin colour stripe */}
      <div className={cn("h-[3px] w-full", col.dot)} />

      <div className="p-3 space-y-2.5">
        {/* Row 1: priority pill + platform icon */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold border",
              pb.cls
            )}
          >
            {pb.label}
          </span>
          <PlatformIcon className="w-3.5 h-3.5 text-gray-200 group-hover/card:text-gray-400 transition-colors shrink-0" />
        </div>

        {/* Title */}
        <p className="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2">
          {task.title}
        </p>

        {/* Editor assignment badge + in-progress pulse */}
        {(editorName || isActive) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {editorName && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 max-w-[120px]">
                <div
                  className={cn(
                    "w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0",
                    avatarColor(editorName)
                  )}
                >
                  {editorName.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] text-indigo-700 font-semibold truncate leading-none">
                  {editorName.split(" ")[0]}
                </span>
              </div>
            )}

            {isActive && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100">
                {/* Pulse dot */}
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                </span>
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wide leading-none">
                  Active
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bottom row: due date + chat */}
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
          {/* Unassigned ghost avatar (only when no editor name to show in badge above) */}
          {!editorName && (
            <div className="w-5 h-5 rounded-full bg-gray-100 border border-dashed border-gray-300 shrink-0" />
          )}

          <div className={cn("flex items-center gap-1.5", editorName && "ml-auto")}>
            {task.endDate ? (
              <div className={cn("flex items-center gap-1 shrink-0 text-[10px] font-medium", dl.color)}>
                <Calendar className="w-3 h-3" />
                {formatDate(task.endDate)}
              </div>
            ) : (
              <span className="text-[10px] text-gray-300">No date</span>
            )}
            {!dragging && onChat && (
              <button
                onClick={(e) => { e.stopPropagation(); onChat(e); }}
                className="w-5 h-5 rounded-md flex items-center justify-center text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-colors opacity-0 group-hover/card:opacity-100"
                title="Open discussion"
              >
                <MessageSquare className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   SORTABLE KANBAN CARD
══════════════════════════════════════════════════════════════════════════════ */
const SortableTaskCard = ({
  task,
  col,
  onClick,
  onChat,
  highlighted = false,
}: {
  task: Task;
  col: (typeof columns)[0];
  onClick: (e: React.MouseEvent) => void;
  onChat: (e: React.MouseEvent) => void;
  highlighted?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? "transform 200ms ease",
    opacity: isDragging ? 0 : 1,
    pointerEvents: isDragging ? "none" as const : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {isDragging ? (
        <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 h-[88px]" />
      ) : (
        <TaskCardInner task={task} col={col} onClick={onClick} onChat={onChat} highlighted={highlighted} />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
const Tasks = () => {
  const { teamId: teamIdParam } = useParams<{ teamId?: string }>();
  const { activeTeamId }        = useTeams();
  const { isAdmin }             = useAuth();

  // URL param wins; fall back to the globally selected team from the sidebar
  const teamId = teamIdParam ?? activeTeamId ?? undefined;
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalInitialStatus, setModalInitialStatus] =
    useState<TaskStatus>("unassigned");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [chatTask,    setChatTask]    = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [recentlyUpdated, setRecentlyUpdated] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Real-time task updates via Socket.io ──────────────────────────────────
  useEffect(() => {
    const socket: Socket = ioClient(SOCKET_URL, { withCredentials: true });

    socket.on("taskUpdated", (updatedTask: Task) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? { ...t, ...updatedTask } : t))
      );

      // Highlight the updated card briefly, then clear
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      setRecentlyUpdated(updatedTask._id);
      highlightTimer.current = setTimeout(() => setRecentlyUpdated(null), 2000);
    });

    return () => {
      socket.disconnect();
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  useEffect(() => {
    setTasks([]);   // ← clear stale tasks immediately so spinner shows
    loadTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, activeTeamId]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const url = teamId ? `${API}?teamId=${teamId}` : API;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const openCreate = (status: TaskStatus = "unassigned") => {
    setModalMode("create");
    setModalInitialStatus(status);
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode("edit");
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSaved = (saved: any) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t._id === saved._id);
      if (exists) return prev.map((t) => (t._id === saved._id ? saved : t));
      return [...prev, saved];
    });
    setModalOpen(false);
  };

  const handleDragStart = (event: any) => setActiveId(event.active.id);

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find((t) => t._id === active.id);
    if (!activeTask) return;
    const isOverColumn = columns.some((c) => c.id === over.id);
    if (isOverColumn) {
      const newStatus = over.id as TaskStatus;
      if (activeTask.status !== newStatus)
        setTasks((prev) =>
          prev.map((t) => (t._id === active.id ? { ...t, status: newStatus } : t))
        );
    } else {
      const overTask = tasks.find((t) => t._id === over.id);
      if (overTask && activeTask.status !== overTask.status)
        setTasks((prev) =>
          prev.map((t) =>
            t._id === active.id ? { ...t, status: overTask.status } : t
          )
        );
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active } = event;
    setActiveId(null);
    const activeTask = tasks.find((t) => t._id === active.id);
    if (!activeTask) return;
    try {
      await fetch(`${API}/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: activeTask.status }),
      });
    } catch (err) {
      console.error("Failed to persist task status:", err);
    }
  };

  const activeTask = useMemo(
    () => tasks.find((t) => t._id === activeId),
    [activeId, tasks]
  );

  /* ── Derived counts ── */
  const inProgress  = tasks.filter((t) => t.status === "in-progress").length;
  const underReview = tasks.filter((t) => t.status === "under-review").length;
  const completed   = tasks.filter((t) => t.status === "completed" || t.status === "released").length;
  const todayTasks  = tasks.filter((t) => {
    if (!t.endDate) return false;
    const d = new Date(t.endDate);
    const now = new Date();
    const diff = Math.round((d.getTime() - now.setHours(0,0,0,0)) / 86_400_000);
    return diff === 0 || diff === 1;
  }).length;

  const filteredTableTasks =
    statusFilter === "All"
      ? tasks
      : tasks.filter((t) => t.status === statusFilter);

  /* ── Derived data for stat cards ── */
  const reviewTasks = tasks.filter((t) => t.status === "under-review").slice(0, 2);
  const totalTasks  = tasks.length;
  const inProgressPct = totalTasks > 0 ? Math.round((inProgress / totalTasks) * 100) : 0;
  const completedPct  = totalTasks > 0 ? Math.round((completed  / totalTasks) * 100) : 0;

  /* ════════════════ RENDER ════════════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#f5f6fa]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            Loading tasks…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 bg-[#f5f6fa] min-h-full">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Project Board
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Content production pipeline — Team Space 1
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-1">
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                viewMode !== "kanban"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800"
              )}
              onClick={() => setViewMode("list")}
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                viewMode === "kanban"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800"
              )}
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 font-semibold"
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </Button>

          <Button
            size="sm"
            className="h-9 bg-gray-900 hover:bg-gray-800 text-white text-xs gap-1.5 font-semibold"
            onClick={() => openCreate()}
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </Button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        {/* ① In Progress — blue + progress ring + sparkline */}
        <Card className="bg-white shadow-sm border border-gray-100 border-t-4 border-t-blue-500 rounded-xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">In Progress</p>
                <p className="text-4xl font-extrabold text-gray-900 leading-none">{inProgress}</p>
                <p className="text-[11px] text-blue-500 font-semibold mt-1">{inProgressPct}% of total</p>
              </div>
              <ProgressRing pct={inProgressPct} color="#3b82f6" trackColor="#dbeafe" size={48} />
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-50">
              <SparkBars values={[30, 50, 40, 70, 55, 80, inProgress * 10 || 5]} color="bg-blue-300" />
            </div>
          </CardContent>
        </Card>

        {/* ② Pending Review — amber + top 2 task list */}
        <Card className="bg-white shadow-sm border border-gray-100 border-t-4 border-t-amber-400 rounded-xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Review</p>
                <p className="text-4xl font-extrabold text-gray-900 leading-none">{underReview}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 mt-1">
                <AlertTriangle className="w-3 h-3" /> Needs Action
              </span>
            </div>
            <div className="mt-2 pt-2.5 border-t border-gray-50 space-y-1.5">
              {reviewTasks.length === 0 ? (
                <p className="text-[11px] text-gray-300 italic">No tasks in review</p>
              ) : (
                reviewTasks.map((t) => (
                  <div key={t._id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <p className="text-[11px] text-gray-600 font-medium truncate">{t.title}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* ③ Completed — green + faded checkmark watermark + sparkline */}
        <Card className="bg-white shadow-sm border border-gray-100 border-t-4 border-t-green-500 rounded-xl overflow-hidden">
          <CardContent className="p-4 relative">
            <CheckCircle2 className="absolute right-3 top-3 w-16 h-16 text-green-50 stroke-[1]" />
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Completed</p>
              <p className="text-4xl font-extrabold text-gray-900 leading-none">{completed}</p>
              <p className="text-[11px] text-green-600 font-semibold mt-1">{completedPct}% success rate</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-50 relative z-10">
              <SparkLine values={[1, 2, 2, 3, 4, 4, completed || 1]} color="#22c55e" />
            </div>
          </CardContent>
        </Card>

        {/* ④ Due Today / Tomorrow — red themed with calendar icon */}
        <Card className="bg-white shadow-sm border border-gray-100 border-t-4 border-t-red-400 rounded-xl overflow-hidden">
          <CardContent className="p-4 relative">
            <Clock className="absolute right-3 bottom-3 w-14 h-14 text-red-50 stroke-[1]" />
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Due Soon</p>
              <p className="text-4xl font-extrabold text-gray-900 leading-none">{todayTasks}</p>
              <p className="text-[11px] text-red-500 font-semibold mt-1">Due today or tomorrow</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-50 flex flex-wrap gap-1.5 relative z-10">
              {todayTasks === 0 ? (
                <span className="text-[11px] text-gray-300 italic">No imminent deadlines</span>
              ) : (
                tasks
                  .filter((t) => {
                    if (!t.endDate) return false;
                    const diff = Math.round((new Date(t.endDate).getTime() - new Date().setHours(0,0,0,0)) / 86_400_000);
                    return diff === 0 || diff === 1;
                  })
                  .slice(0, 2)
                  .map((t) => (
                    <span key={t._id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 truncate max-w-[120px]">
                      {t.title}
                    </span>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ══════════════ KANBAN VIEW ══════════════ */}
      {viewMode === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="grid gap-4 pb-6 overflow-x-auto"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))` }}
          >
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className={cn(
                    "flex flex-col rounded-xl shadow-sm border border-gray-100 border-t-4",
                    col.headerBg,
                    "bg-gray-50/80 p-3"
                  )}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between pb-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", col.dot)} />
                      <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-widest">
                        {col.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded-md min-w-[22px] text-center">
                        {colTasks.length}
                      </span>
                      <button
                        onClick={() => openCreate(col.id)}
                        className="w-6 h-6 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                        title={`Add to ${col.label}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <SortableContext
                    id={col.id}
                    items={colTasks.map((t) => t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-2 flex-1 min-h-[340px]">
                      {colTasks.map((task) => (
                        <SortableTaskCard
                          key={task._id}
                          task={task}
                          col={col}
                          highlighted={recentlyUpdated === task._id}
                          onClick={(e) => openEdit(task, e)}
                          onChat={(e) => { e.stopPropagation(); setChatTask(task); }}
                        />
                      ))}

                      {/* Hover-only ghost "Add Task" card for empty columns */}
                      {colTasks.length === 0 && (
                        <button
                          onClick={() => openCreate(col.id)}
                          className="group/ghost flex-1 min-h-[80px] rounded-xl border border-dashed border-gray-200 hover:border-gray-300 hover:bg-white/70 transition-all flex items-center justify-center"
                        >
                          <span className="opacity-0 group-hover/ghost:opacity-100 transition-opacity flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                            <Plus className="w-3.5 h-3.5" /> Add task
                          </span>
                        </button>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>

          <DragOverlay
            dropAnimation={{
              duration: 180,
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: "0.4" } },
              }),
            }}
          >
            {activeId && activeTask ? (
              <div className="w-56 drop-shadow-2xl">
                <TaskCardInner
                  task={activeTask}
                  col={columns.find((c) => c.id === activeTask.status) ?? columns[0]}
                  dragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ══════════════ TABLE / LIST VIEW ══════════════ */}
      {viewMode !== "kanban" && (
        <div className="grid grid-cols-1 xl:grid-cols-10 gap-5">

          {/* Workflow table — 7 cols */}
          <Card className="xl:col-span-7 bg-white shadow-sm border border-gray-100 rounded-xl">
            <CardHeader className="pb-0 pt-5 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Current Workflow — Team Space 1
                </CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tasks.length} total tasks
                </p>
              </div>
              <button
                onClick={() => openCreate()}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
              >
                Add task <Plus className="w-3 h-3" />
              </button>
            </CardHeader>

            {/* Status filter pills */}
            <div className="px-6 pt-4 pb-2 flex items-center gap-2 flex-wrap">
              {(["All", ...columns.map((c) => c.id)] as const).map((s) => {
                const col = columns.find((c) => c.id === s);
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s as TaskStatus | "All")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold border transition-colors uppercase tracking-wide",
                      statusFilter === s
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {col ? col.label : "All"}
                  </button>
                );
              })}
            </div>

            <CardContent className="p-0 pb-2">
              {/* Table header */}
              <div className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1.2fr_auto] gap-3 px-6 py-2.5 bg-gray-50 border-y border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Task</span>
                <span>Platform / Type</span>
                <span>Assigned To</span>
                <span>Deadline</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              <div className="divide-y divide-gray-50">
                {filteredTableTasks.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-400">
                    No tasks match this filter.
                  </div>
                )}
                {filteredTableTasks.map((task) => {
                  const sc  = tableStatusConfig[task.status];
                  const dl  = deadlineMeta(task.endDate);
                  const PlatformIcon = platformIcons[task.platform || "other"];
                  return (
                    <div
                      key={task._id}
                      className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1.2fr_auto] gap-3 items-center px-6 py-3.5 hover:bg-gray-50/70 transition-colors group"
                    >
                      {/* Task title + priority */}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{task.title}</p>
                        {task.priority && (
                          <span className={`mt-1 inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full ${priorityConfig[task.priority]}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                        )}
                      </div>

                      {/* Platform */}
                      <div className="flex items-center gap-2">
                        <PlatformIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 capitalize">
                          {task.platform || "Other"}
                        </span>
                      </div>

                      {/* Assignee */}
                      <div className="flex items-center gap-2">
                        {task.assignee ? (
                          <>
                            <div
                              className={`w-6 h-6 rounded-full ${avatarColor(task.assignee)} flex items-center justify-center shrink-0`}
                            >
                              <span className="text-[9px] font-bold text-white">
                                {task.assignee.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs text-gray-600 truncate hidden lg:inline">
                              {task.assignee}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-300 italic">—</span>
                        )}
                      </div>

                      {/* Deadline */}
                      <span className={`text-xs ${dl.color}`}>{dl.label}</span>

                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full w-fit ${sc.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title="Edit"
                          onClick={(e) => openEdit(task, e)}
                          className="w-7 h-7 rounded-md bg-gray-100 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors text-gray-500"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Review"
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
          <div className="xl:col-span-3 space-y-4">

            {/* Team Highlights */}
            <Card className="bg-white shadow-sm border border-gray-100 rounded-xl">
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
                    <div
                      className={`w-8 h-8 rounded-full ${avatarColor(member.name)} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}
                    >
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-800 truncate">{member.name}</p>
                        <span className="text-xs font-bold text-gray-700">{member.score}</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${avatarColor(member.name)} opacity-60`}
                          style={{ width: `${member.score}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {member.badge} · {member.tasks} tasks
                      </p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-1 text-xs h-8">
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
                    <p className="text-[10px] text-green-600 mt-0.5">Target achieved! 🎉</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-violet-800">Onam Campaign</p>
                    <p className="text-[10px] text-violet-600 mt-0.5">50 days · Release creatives</p>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
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
                      <span className="text-gray-400 font-semibold">{m.date}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs h-8">
                  <ChevronRight className="w-3.5 h-3.5 mr-1" />
                  View Monthly Targets
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Task Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <TaskModal
          mode={modalMode}
          initialStatus={modalInitialStatus as any}
          task={editingTask ? (editingTask as unknown as ModalTask) : undefined}
          teamId={teamId}
          isAdmin={isAdmin}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* ── Task Chat Panel (slides in from right) ───────────────── */}
      {chatTask && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setChatTask(null)}
          />
          {/* Panel */}
          <div className="fixed right-4 top-4 bottom-4 z-50 w-80 flex flex-col animate-in slide-in-from-right-8 duration-200">
            <TaskChat
              taskId={chatTask._id}
              taskTitle={chatTask.title}
              onClose={() => setChatTask(null)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Tasks;
