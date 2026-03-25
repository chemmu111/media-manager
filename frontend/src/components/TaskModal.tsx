import { useState, useEffect, useRef } from "react";
import { X, Flag, User, Calendar, AlignLeft, Tag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const API = `http://${window.location.hostname}:8080/api/tasks`;

type TaskStatus = "upcoming_event" | "unassigned" | "in_progress" | "completed" | "under_review" | "released" | "rejected";
type Priority = "high" | "medium" | "low";
type Platform = "youtube" | "instagram" | "facebook" | "linkedin" | "other";
type TaskType = "task" | "event";

export interface ModalTask {
  _id?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  endDate: string;
  platform?: Platform;
  type?: TaskType;
}

interface TaskModalProps {
  mode: "create" | "edit";
  initialStatus?: TaskStatus;
  task?: ModalTask;
  onClose: () => void;
  onSaved: (task: ModalTask) => void;
}

const TEAM_MEMBERS = [
  "Editor 1",
  "Editor 2",
  "Editor 3",
  "Designer 1",
  "Designer 2",
  "Content Writer",
  "Videographer",
  "Editor 5",
];

const PRIORITIES: { value: Priority; label: string; color: string; dot: string }[] = [
  { value: "high",   label: "High",   color: "text-red-400",    dot: "bg-red-400" },
  { value: "medium", label: "Medium", color: "text-amber-400",  dot: "bg-amber-400" },
  { value: "low",    label: "Low",    color: "text-slate-400",  dot: "bg-slate-400" },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "upcoming_event", label: "Upcoming Event" },
  { value: "unassigned",     label: "Unassigned" },
  { value: "in_progress",    label: "In Progress" },
  { value: "completed",     label: "Completed" },
  { value: "under_review",   label: "Under Review" },
  { value: "released",       label: "Released" },
  { value: "rejected",       label: "Rejected / Under Correction" },
];

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "youtube",   label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook",  label: "Facebook" },
  { value: "linkedin",  label: "LinkedIn" },
  { value: "other",     label: "Other" },
];

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "task",  label: "Task" },
  { value: "event", label: "Event" },
];

export default function TaskModal({ mode, initialStatus = "unassigned", task, onClose, onSaved }: TaskModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ModalTask>({
    _id:         task?._id ?? undefined,
    title:       task?.title ?? "",
    description: task?.description ?? "",
    status:      task?.status ?? initialStatus,
    priority:    task?.priority ?? "medium",
    assignee:    task?.assignee ?? "",
    endDate:     task?.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "",
    platform:    task?.platform ?? "other",
    type:        task?.type ?? "task",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const set = (key: keyof ModalTask, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setError("");
    setSaving(true);

    try {
      const body = {
        title:       form.title.trim(),
        description: form.description,
        status:      form.status,
        priority:    form.priority,
        assignee:    form.assignee,
        endDate:     form.endDate || undefined,
        platform:    form.platform,
        type:        form.type,
      };

      const url    = mode === "edit" && form._id ? `${API}/${form._id}` : API;
      const method = mode === "edit" && form._id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save task");
      }

      const saved = await res.json();
      onSaved(saved);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const priority = PRIORITIES.find((p) => p.value === form.priority)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#ffffff] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-700">
            {mode === "create" ? "Create Task" : "Edit Task"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Task title…"
              className="w-full bg-transparent text-lg font-semibold text-gray-900 placeholder:text-gray-300 outline-none border-none"
            />
          </div>

          {/* Description */}
          <div className="flex gap-3">
            <AlignLeft className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Add a description…"
              rows={2}
              className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 outline-none border border-gray-100 focus:bg-white focus:border-indigo-200 transition-all resize-none"
            />
          </div>

          {/* Metadata row */}
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Flag className="w-3 h-3" /> Priority
              </label>
              <div className="flex gap-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set("priority", p.value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      form.priority === p.value
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", p.dot)} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlignLeft className="w-3 h-3" /> Type
              </label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Platform */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="text-[10px]">🌐</span> Platform
              </label>
              <select
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <User className="w-3 h-3" /> Assignee
              </label>
              <select
                value={form.assignee}
                onChange={(e) => set("assignee", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {TEAM_MEMBERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Due Date
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2 justify-end bg-gray-50/30 pt-2 border-t border-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === "create" ? "Create Task" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
