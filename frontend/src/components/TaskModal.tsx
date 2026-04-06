import { useState, useEffect, useRef } from "react";
import { X, Flag, User, Calendar, AlignLeft, Tag, Loader2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeams } from "@/context/TeamContext";

const API       = `${import.meta.env.VITE_API_BASE_URL}/tasks`;
const USERS_API = `${import.meta.env.VITE_API_BASE_URL}/users`;

type TaskStatus = "upcoming" | "unassigned" | "in-progress" | "under-review" | "completed" | "released";
type Priority   = "high" | "medium" | "low";
type Platform   = "youtube" | "instagram" | "facebook" | "linkedin" | "other";
type TaskType   = "task" | "event";

interface Editor {
  _id:      string;
  name:     string;
  username: string;
  email:    string;
  role:     string;
}

export interface ModalTask {
  _id?:        string;
  title:       string;
  description: string;
  status:      TaskStatus;
  priority:    Priority;
  assignedTo?: string;  // ObjectId — set when admin picks an editor
  assignee?:   string;  // legacy plain-string name (kept for backwards compat)
  endDate:     string;
  platform?:   Platform;
  type?:       TaskType;
}

interface TaskModalProps {
  mode:           "create" | "edit";
  initialStatus?: TaskStatus;
  task?:          ModalTask;
  teamId?:        string;
  isAdmin?:       boolean;
  onClose:        () => void;
  onSaved:        (task: ModalTask) => void;
}

const PRIORITIES: { value: Priority; label: string; color: string; ring: string; dot: string }[] = [
  { value: "high",   label: "High",   color: "text-rose-400",  ring: "ring-rose-400/40",  dot: "bg-rose-400"  },
  { value: "medium", label: "Medium", color: "text-amber-400", ring: "ring-amber-400/40", dot: "bg-amber-400" },
  { value: "low",    label: "Low",    color: "text-slate-400", ring: "ring-slate-400/40", dot: "bg-slate-500" },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "upcoming",     label: "Upcoming"      },
  { value: "unassigned",   label: "Unassigned"    },
  { value: "in-progress",  label: "In Progress"   },
  { value: "under-review", label: "Under Review"  },
  { value: "completed",    label: "Completed"     },
  { value: "released",     label: "Released"      },
];

const PLATFORMS: { value: Platform; label: string; emoji: string }[] = [
  { value: "youtube",   label: "YouTube",   emoji: "▶"  },
  { value: "instagram", label: "Instagram", emoji: "📷" },
  { value: "facebook",  label: "Facebook",  emoji: "f"  },
  { value: "linkedin",  label: "LinkedIn",  emoji: "in" },
  { value: "other",     label: "Other",     emoji: "🌐" },
];

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "task",  label: "Task"  },
  { value: "event", label: "Event" },
];

function initials(name: string) {
  const safeName = (name || "User").trim() || "User";
  return safeName.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-indigo-500 to-blue-600",
  ];
  const safeName = (name || "User").trim() || "User";
  let hash = 0;
  for (const c of safeName) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

function GlassSelect({
  label, icon, value, onChange, children,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
        {icon} {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-gray-900 border border-white/10 rounded-xl px-3 py-2 pr-8
                     text-sm text-white outline-none focus:border-violet-400/50
                     focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
          style={{ colorScheme: "dark" }}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
      </div>
    </div>
  );
}

export default function TaskModal({
  mode,
  initialStatus = "unassigned",
  task,
  teamId,
  isAdmin = false,
  onClose,
  onSaved,
}: TaskModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const { activeTeamId } = useTeams();

  // Prop takes precedence; fall back to the globally selected team from the sidebar
  const effectiveTeamId = teamId ?? activeTeamId ?? undefined;

  const [form, setForm] = useState<ModalTask>({
    _id:         task?._id,
    title:       task?.title       ?? "",
    description: task?.description ?? "",
    status:      (task?.status as TaskStatus) ?? initialStatus,
    priority:    task?.priority    ?? "medium",
    assignedTo:  task?.assignedTo  ?? "",
    endDate:     task?.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "",
    platform:    task?.platform    ?? "other",
    type:        task?.type        ?? "task",
  });

  const [editors,        setEditors]        = useState<Editor[]>([]);
  const [loadingEditors, setLoadingEditors] = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");

  useEffect(() => {
    titleRef.current?.focus();

    if (!isAdmin) return;
    setLoadingEditors(true);
    fetch(`${USERS_API}?role=editor`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: Editor[]) => setEditors(Array.isArray(data) ? data : []))
      .catch(() => setEditors([]))
      .finally(() => setLoadingEditors(false));
  }, [isAdmin]);

  const set = (key: keyof ModalTask, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  const selectedEditor = editors.find((e) => e._id === form.assignedTo);

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setError("");
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        title:       form.title.trim(),
        description: form.description,
        status:      form.status,
        priority:    form.priority,
        endDate:     form.endDate || undefined,
        platform:    form.platform,
        type:        form.type,
        ...(effectiveTeamId ? { teamSpaceId: effectiveTeamId, teamId: effectiveTeamId } : {}),
        ...(form.assignedTo ? { assignedTo: form.assignedTo } : {}),
      };

      const url    = mode === "edit" && form._id ? `${API}/${form._id}` : API;
      const method = mode === "edit" && form._id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save task");
      }

      onSaved(await res.json());
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at center, rgba(109,40,217,0.12) 0%, rgba(0,0,0,0.78) 100%)" }}
      onClick={onClose}
    >
      <div className="absolute inset-0 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.09]"
        style={{
          background: "linear-gradient(145deg, rgba(13,11,28,0.96) 0%, rgba(18,8,38,0.96) 100%)",
          backdropFilter: "blur(28px) saturate(180%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top glow line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
              <span className="text-[10px] text-white font-bold">T</span>
            </div>
            <h2 className="text-sm font-semibold text-white/80 tracking-tight">
              {mode === "create" ? "New Task" : "Edit Task"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30
                       hover:text-white/70 hover:bg-white/[0.07] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* Title */}
          <input
            ref={titleRef}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Task title…"
            className="w-full bg-transparent text-xl font-semibold text-white placeholder:text-white/20
                       outline-none border-none tracking-tight pb-2
                       border-b border-white/[0.07] focus:border-violet-500/40 transition-colors"
          />

          {/* Description */}
          <div className="flex gap-3">
            <AlignLeft className="w-4 h-4 text-white/25 mt-2.5 shrink-0" />
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Add a description…"
              rows={2}
              className="flex-1 bg-white/[0.04] rounded-xl px-3 py-2.5 text-sm text-white/65
                         placeholder:text-white/20 outline-none border border-white/[0.07]
                         focus:border-violet-400/40 focus:bg-white/[0.06] transition-all resize-none"
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <GlassSelect
              label="Status" icon={<Tag className="w-3 h-3" />}
              value={form.status} onChange={(v) => set("status", v)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value} className="bg-gray-900 text-white">{s.label}</option>
              ))}
            </GlassSelect>

            <GlassSelect
              label="Type" icon={<AlignLeft className="w-3 h-3" />}
              value={form.type!} onChange={(v) => set("type", v)}
            >
              {TASK_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-gray-900 text-white">{t.label}</option>
              ))}
            </GlassSelect>

            <GlassSelect
              label="Platform" icon={<span className="text-[10px]">🌐</span>}
              value={form.platform!} onChange={(v) => set("platform", v)}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value} className="bg-gray-900 text-white">{p.emoji} {p.label}</option>
              ))}
            </GlassSelect>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                <Calendar className="w-3 h-3" /> Due Date
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2
                           text-sm text-white/70 outline-none focus:border-violet-400/50
                           focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <Flag className="w-3 h-3" /> Priority
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set("priority", p.value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                    form.priority === p.value
                      ? `bg-white/[0.09] border-white/20 ${p.color} ring-1 ${p.ring}`
                      : "bg-white/[0.03] border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/50"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", p.dot)} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign to Editor — admin only, fetched live from DB */}
          {isAdmin && (
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                <User className="w-3 h-3" /> Assign To
              </label>

              {loadingEditors ? (
                <div className="flex items-center gap-2 py-2 text-white/30 text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading editors…
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Selected editor card */}
                  {selectedEditor && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-400/20">
                      <div className={cn(
                        "w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] font-bold text-white shrink-0",
                        avatarColor(selectedEditor.username)
                      )}>
                        {initials(selectedEditor.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate leading-none mb-0.5">
                          @{selectedEditor.username}
                        </p>
                        <p className="text-[10px] text-white/35 truncate">{selectedEditor.email}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md bg-violet-500/20 text-[9px] text-violet-300 font-bold uppercase tracking-wide shrink-0">
                        {selectedEditor.role}
                      </span>
                      <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    </div>
                  )}

                  <div className="relative">
                    <select
                      value={form.assignedTo}
                      onChange={(e) => set("assignedTo", e.target.value)}
                      className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 pr-8
                                 text-sm text-white outline-none focus:border-violet-400/50
                                 focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
                      style={{ colorScheme: "light", backgroundColor: "rgb(15 10 35 / 0.6)" }}
                    >
                      <option value="" className="bg-white text-gray-900">— Unassigned —</option>
                      {editors.map((e) => (
                        <option key={e._id} value={e._id} className="bg-white text-gray-900">
                          @{e.username}  •  {e.role}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 px-3 py-2 rounded-xl border border-rose-500/20">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex gap-2 justify-end border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white/35
                       hover:text-white/65 hover:bg-white/[0.06] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="relative px-6 py-2 rounded-xl text-sm font-semibold text-white
                       disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group
                       shadow-lg shadow-violet-500/25 transition-all flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)" }}
          >
            {/* Shimmer */}
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0
                             translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === "create" ? "Create Task" : "Save Changes"}
          </button>
        </div>

        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/35 to-transparent" />
      </div>
    </div>
  );
}
