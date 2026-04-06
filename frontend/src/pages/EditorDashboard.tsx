import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ListTodo,
  Clock,
  CheckCircle2,
  Upload,
  MessageSquare,
  ExternalLink,
  AlertCircle,
  PlayCircle,
  ChevronRight,
  Users,
  Loader2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ─── Mock data ────────────────────────────────────────────────────────────────

const stats = [
  {
    label: "Assigned Tasks",
    value: 6,
    icon: ListTodo,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Pending Review",
    value: 2,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "Completed Videos",
    value: 14,
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    label: "Uploaded Videos",
    value: 9,
    icon: Upload,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

type TaskStatus = "Pending" | "Editing" | "Review" | "Completed";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  deadline: string;
  priority: "High" | "Medium" | "Low";
}

const tasks: Task[] = [
  {
    id: "1",
    title: "Instagram Reels Tips – Episode 4",
    status: "Editing",
    deadline: "2026-03-13",
    priority: "High",
  },
  {
    id: "2",
    title: "How to Grow on YouTube in 2026",
    status: "Pending",
    deadline: "2026-03-15",
    priority: "High",
  },
  {
    id: "3",
    title: "Behind the Scenes – March Shoot",
    status: "Review",
    deadline: "2026-03-11",
    priority: "Medium",
  },
  {
    id: "4",
    title: "Product Launch Teaser Video",
    status: "Completed",
    deadline: "2026-03-08",
    priority: "Low",
  },
  {
    id: "5",
    title: "Weekly Vlog – Week 10",
    status: "Pending",
    deadline: "2026-03-18",
    priority: "Medium",
  },
  {
    id: "6",
    title: "Brand Story Montage",
    status: "Editing",
    deadline: "2026-03-20",
    priority: "Low",
  },
];

type ReviewStatus = "pending" | "rejected" | "revision" | "approved";

interface FeedbackItem {
  id: string;
  videoTitle: string;
  status: ReviewStatus;
  comment?: string;
  from: string;
  date: string;
}

const reviewStatusConfig: Record<
  ReviewStatus,
  { label: string; badgeClass: string; borderColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending Review",
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
    borderColor: "border-l-amber-400",
    icon: <Clock className="w-3 h-3" />,
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-red-50 text-red-700 border border-red-200",
    borderColor: "border-l-red-400",
    icon: <MessageSquare className="w-3 h-3" />,
  },
  revision: {
    label: "Revision Required",
    badgeClass: "bg-blue-50 text-blue-700 border border-blue-200",
    borderColor: "border-l-blue-400",
    icon: <MessageSquare className="w-3 h-3" />,
  },
  approved: {
    label: "Approved",
    badgeClass: "bg-green-50 text-green-700 border border-green-200",
    borderColor: "border-l-green-400",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

const feedbackItems: FeedbackItem[] = [
  {
    id: "f1",
    videoTitle: "Instagram Reels Tips – Episode 3",
    status: "rejected",
    comment: "Add subtitles throughout and shorten the intro by at least 10 seconds. The opening hook needs to be stronger.",
    from: "Admin",
    date: "2026-03-09",
  },
  {
    id: "f2",
    videoTitle: "How to Grow on YouTube in 2026",
    status: "revision",
    comment: "Color grading looks inconsistent in the second half. Match the warm tones used in the intro.",
    from: "Admin",
    date: "2026-03-08",
  },
  {
    id: "f3",
    videoTitle: "Behind the Scenes – March Shoot",
    status: "pending",
    from: "Admin",
    date: "2026-03-07",
  },
  {
    id: "f4",
    videoTitle: "Product Launch Teaser Video",
    status: "approved",
    from: "Admin",
    date: "2026-03-06",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  Pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  Editing: {
    label: "Editing",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  Review: {
    label: "In Review",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  Completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200",
  },
};

const priorityConfig = {
  High: "bg-red-100 text-red-600 border-red-200",
  Medium: "bg-amber-100 text-amber-600 border-amber-200",
  Low: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatDeadline(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

interface AttendanceUser {
  _id: string;
  name: string;
  role: string;
  attendance: "present" | "leave";
}

const roleLabel: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  member: "Member",
};

// ─── Component ────────────────────────────────────────────────────────────────

const EditorDashboard = () => {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<TaskStatus | "All">("All");
  const [attendanceUsers, setAttendanceUsers] = useState<AttendanceUser[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  useEffect(() => {
    const fetchAttendance = () =>
      fetch(`${API_BASE}/auth/attendance`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setAttendanceUsers(data))
        .catch(() => {});

    fetchAttendance().finally(() => setLoadingAttendance(false));
    const interval = setInterval(fetchAttendance, 30000);
    return () => clearInterval(interval);
  }, []);

  const presentUsers = attendanceUsers.filter((u) => u.attendance === "present");
  const leaveUsers   = attendanceUsers.filter((u) => u.attendance === "leave");

  const filteredTasks =
    activeStatus === "All" ? tasks : tasks.filter((t) => t.status === activeStatus);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Editor Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Your tasks and feedback — all in one place.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.filter(s => s.label !== "Uploaded Videos").map((s) => (
          <Card key={s.label} className="rounded-xl shadow-sm border border-gray-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tasks section — takes 2 cols */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="rounded-xl shadow-sm border border-gray-100">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-600" />
                My Assigned Tasks
              </CardTitle>
              <button
                onClick={() => navigate("/editor/tasks")}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </CardHeader>

            {/* Status filter tabs */}
            <div className="px-6 pb-3 flex items-center gap-2 flex-wrap">
              {(["All", "Pending", "Editing", "Review", "Completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    activeStatus === s
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {filteredTasks.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-400">
                    No tasks in this category
                  </div>
                )}
                {filteredTasks.map((task) => {
                  const status = statusConfig[task.status];
                  const overdue = task.status !== "Completed" && isOverdue(task.deadline);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group"
                    >
                      {/* Left: icon + title */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <PlayCircle className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`flex items-center gap-1 text-[11px] ${
                                overdue ? "text-red-500 font-medium" : "text-gray-400"
                              }`}
                            >
                              {overdue && <AlertCircle className="w-3 h-3" />}
                              <Clock className="w-3 h-3" />
                              {formatDeadline(task.deadline)}
                              {overdue && " · Overdue"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: priority, status, action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                            priorityConfig[task.priority]
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${status.className}`}
                        >
                          {status.label}
                        </span>
                        <Button
                          size="sm"
                          variant={task.status === "Pending" ? "outline" : "default"}
                          className="h-7 px-3 text-xs"
                          onClick={() => navigate(`/editor/tasks`)}
                        >
                          {task.status === "Pending" ? "Open" : task.status === "Editing" ? "Continue" : "View"}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right col: Feedback + Team Attendance */}
        <div className="space-y-4">
          {/* Review Feedback card */}
          <Card className="rounded-xl shadow-sm border border-gray-100">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                Review Feedback
              </CardTitle>
              <button
                onClick={() => navigate("/editor/feedback")}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                All <ChevronRight className="w-3 h-3" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {feedbackItems.map((fb) => {
                  const sc = reviewStatusConfig[fb.status];
                  const needsAction = fb.status === "rejected" || fb.status === "revision";
                  return (
                    <div key={fb.id} className="p-5 hover:bg-gray-50/60 transition-colors">
                      {/* Title + status badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <PlayCircle className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-gray-800 leading-snug truncate">
                            {fb.videoTitle}
                          </p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.badgeClass}`}>
                          {sc.icon}
                          {sc.label}
                        </span>
                      </div>

                      {/* Comment */}
                      {fb.comment && (
                        <p className={`text-xs text-gray-600 leading-relaxed border-l-2 pl-3 ${sc.borderColor}`}>
                          {fb.comment}
                        </p>
                      )}

                      {/* Meta + upload revision button */}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[11px] text-gray-400">
                          From <span className="font-medium text-gray-600">{fb.from}</span>
                          {" · "}{formatDeadline(fb.date)}
                        </span>
                        {needsAction && (
                          <button
                            onClick={() => navigate("/editor/upload")}
                            className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            Upload Revision
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Team Attendance card — live from DB */}
          <Card className="rounded-xl shadow-sm border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Team Attendance
                {!loadingAttendance && (
                  <span className="ml-auto text-xs font-normal text-gray-400">
                    {presentUsers.length}/{attendanceUsers.length} present
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAttendance ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {attendanceUsers.map((u) => (
                      <div key={u._id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              u.attendance === "present"
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          />
                          <span className={u.attendance === "present" ? "text-gray-800" : "text-gray-400"}>
                            {u.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {roleLabel[u.role] ?? u.role}
                        </span>
                      </div>
                    ))}
                    {attendanceUsers.length === 0 && (
                      <p className="text-xs text-gray-400">No team members found.</p>
                    )}
                  </div>
                  {leaveUsers.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-400">
                        <span className="font-medium text-red-500">On leave: </span>
                        {leaveUsers.map((u) => u.name).join(", ")}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">


        <button
          onClick={() => navigate("/editor/feedback")}
          className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50/30 transition-colors group text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">View Feedback</p>
            <p className="text-xs text-gray-500">Check latest corrections</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/editor/calendar")}
          className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50/30 transition-colors group text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Content Calendar</p>
            <p className="text-xs text-gray-500">See upcoming deadlines</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default EditorDashboard;
