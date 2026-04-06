import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Lock,
  Bell,
  Sun,
  Moon,
  LogOut,
  Edit3,
  Eye,
  EyeOff,
  TrendingUp,
  Award,
  ShieldCheck,
  CalendarDays,
  Mail,
  User,
  FileText,
  X,
  Save,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ── Types ─────────────────────────────────────────────────────────────────────
type StatusKey = "approved" | "pending" | "rejected" | "revision";

interface WorkItem {
  id: string;
  title: string;
  date: string;
  status: StatusKey;
}

// ── Board status → profile status mapping ─────────────────────────────────────
function boardToProfileStatus(s: string): StatusKey {
  if (s === "completed" || s === "released") return "approved";
  if (s === "rejected")                      return "rejected";
  if (s === "under_review")                  return "pending";
  return "revision";
}

// ── Status config ──────────────────────────────────────────────────────────────
const statusCfg: Record<StatusKey, { label: string; badge: string; icon: React.ReactNode }> = {
  approved: { label: "Approved",          badge: "bg-green-50 text-green-700 border border-green-200",   icon: <CheckCircle2 className="w-3 h-3" /> },
  pending:  { label: "Pending Review",    badge: "bg-amber-50 text-amber-700 border border-amber-200",   icon: <Clock        className="w-3 h-3" /> },
  rejected: { label: "Rejected",          badge: "bg-red-50 text-red-700 border border-red-200",         icon: <XCircle      className="w-3 h-3" /> },
  revision: { label: "Revision Required", badge: "bg-blue-50 text-blue-700 border border-blue-200",      icon: <MessageSquare className="w-3 h-3" /> },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const avatarGradient: Record<string, string> = {
  admin:  "from-violet-500 to-purple-700",
  editor: "from-indigo-500 to-blue-700",
  member: "from-teal-500 to-emerald-700",
};

// ── Password field with show/hide toggle ──────────────────────────────────────
function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:bg-white transition-all"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({
  currentName,
  currentBio,
  onSave,
  onClose,
}: {
  currentName: string;
  currentBio: string;
  onSave: (name: string, bio: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [bio,  setBio]  = useState(currentBio);

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    onSave(name.trim(), bio.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Edit Profile</h2>
              <p className="text-[11px] text-gray-400">Update your public information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
              Full Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell the team a bit about yourself…"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none"
            />
            <p className="text-[10px] text-gray-400 text-right mt-1">{bio.length}/200</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3">
          <Button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2 font-semibold"
          >
            <Save className="w-4 h-4" /> Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-gray-200 text-gray-600"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Change Password Modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSave = async () => {
    setError("");
    if (!current)          { setError("Please enter your current password.");              return; }
    if (next.length < 6)   { setError("New password must be at least 6 characters.");     return; }
    if (next !== confirm)  { setError("New password and confirmation do not match.");      return; }

    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    toast.success("Password changed successfully!");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Change Password</h2>
              <p className="text-[11px] text-gray-400">Choose a strong new password</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-4">
          <PasswordInput
            label="Current Password"
            value={current}
            onChange={setCurrent}
            placeholder="Enter your current password"
          />
          <PasswordInput
            label="New Password"
            value={next}
            onChange={setNext}
            placeholder="At least 6 characters"
          />
          <PasswordInput
            label="Confirm New Password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter new password"
          />

          {/* Strength indicator */}
          {next.length > 0 && (
            <div>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      next.length >= level * 2
                        ? level <= 1 ? "bg-red-400"
                          : level <= 2 ? "bg-orange-400"
                          : level <= 3 ? "bg-amber-400"
                          : "bg-green-500"
                        : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {next.length < 4 ? "Too short" : next.length < 6 ? "Weak" : next.length < 8 ? "Fair" : "Strong"}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-amber-500 hover:bg-amber-600 gap-2 font-semibold text-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              <><Lock className="w-4 h-4" /> Update Password</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 border-gray-200 text-gray-600"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, activeColor = "bg-indigo-500 border-indigo-500" }: {
  on: boolean;
  onToggle: () => void;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-300 shrink-0",
        on ? activeColor : "bg-gray-200 border-gray-200"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-300",
          on ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const Profile = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Submission history fetched from the Project Board tasks
  const [history, setHistory] = useState<WorkItem[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/tasks`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((tasks: { _id: string; title: string; status: string; dueDate?: string; createdAt?: string }[]) => {
        const items: WorkItem[] = tasks
          .filter((t) => ["completed","released","rejected","under_review","waiting_approval","under_correction"].includes(t.status))
          .map((t) => ({
            id:     t._id,
            title:  t.title,
            date:   t.dueDate ?? t.createdAt ?? new Date().toISOString(),
            status: boardToProfileStatus(t.status),
          }))
          .slice(0, 10);
        setHistory(items);
      })
      .catch(() => {});
  }, []);

  // Stats derived from live history
  const total    = history.length;
  const approved = history.filter((h: WorkItem) => h.status === "approved").length;
  const rejected = history.filter((h: WorkItem) => h.status === "rejected").length;
  const revision = history.filter((h: WorkItem) => h.status === "revision").length;
  const rate     = total > 0 ? Math.round((approved / total) * 100) : 0;

  // Profile state
  const [name,      setName]    = useState(user?.name  ?? "");
  const [bio,       setBio]     = useState(
    isAdmin
      ? "Managing the Media Manager platform, overseeing content quality and team performance."
      : "Passionate video editor specialising in short-form social content and brand storytelling."
  );
  const email     = user?.email ?? "";
  const joinedDate = "January 15, 2025";

  // Modal visibility
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Settings
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [darkMode,        setDarkMode]         = useState(
    () => document.documentElement.classList.contains("dark")
  );

  // Sync dark class on <html> whenever darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleToggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    toast.success(next ? "🌙 Dark mode enabled" : "☀️ Light mode enabled");
  };

  const handleNotificationToggle = () => {
    const next = !notificationsOn;
    setNotificationsOn(next);
    toast.success(next ? "🔔 Notifications enabled" : "🔕 Notifications disabled");
  };

  const handleSaveProfile = (newName: string, newBio: string) => {
    setName(newName);
    setBio(newBio);
    setShowEditModal(false);
    toast.success("✅ Profile updated successfully!");
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out. See you soon!");
    navigate("/");
  };

  const role     = user?.role ?? "editor";
  const gradient = avatarGradient[role] ?? avatarGradient.editor;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">

      {/* ── Profile Header Card ─────────────────────────────────────────────── */}
      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {/* Gradient banner */}
        <div
          className={cn(
            "h-28 bg-gradient-to-r",
            isAdmin
              ? "from-violet-500 via-purple-500 to-indigo-600"
              : "from-indigo-500 via-blue-500 to-cyan-500"
          )}
        />

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <div
                className={cn(
                  "w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-xl",
                  gradient
                )}
              >
                {initials(name || "U")}
              </div>
              <button
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center border-2 border-white hover:bg-gray-700 transition-colors"
                onClick={() => toast.info("Photo upload coming soon")}
                title="Change photo"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEditModal(true)}
              className="h-8 px-4 text-xs gap-1.5 mb-1 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </Button>
          </div>

          {/* Name */}
          <h1 className="text-xl font-bold text-gray-900">{name}</h1>

          {/* Role badge + email */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 mb-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide",
                isAdmin
                  ? "bg-violet-100 text-violet-700 border border-violet-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              )}
            >
              {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <Award className="w-3 h-3" />}
              {isAdmin ? "Admin" : "Senior Editor"}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Mail className="w-3.5 h-3.5" /> {email}
            </span>
          </div>

          {/* Bio */}
          <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">{bio}</p>
        </div>
      </Card>

      {/* ── Activity Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Submissions",   value: total,         icon: <FileText    className="w-4 h-4 text-gray-400"   />, accent: "border-l-gray-400",   color: "text-gray-800"   },
          { label: "Approved",            value: approved,      icon: <CheckCircle2 className="w-4 h-4 text-green-500"  />, accent: "border-l-green-500",  color: "text-green-600"  },
          { label: "Rejected / Revision", value: rejected + revision, icon: <XCircle className="w-4 h-4 text-red-400"  />, accent: "border-l-red-400",    color: "text-red-500"    },
          { label: "Approval Rate",       value: `${rate}%`,    icon: <TrendingUp  className="w-4 h-4 text-indigo-500" />, accent: "border-l-indigo-500", color: "text-indigo-600", bar: rate },
        ].map((s) => (
          <Card key={s.label} className={`p-4 border border-gray-100 border-l-4 ${s.accent} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
              {s.icon}
            </div>
            <p className={cn("text-3xl font-bold", s.color)}>{s.value}</p>
            {s.bar !== undefined && (
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${s.bar}%` }}
                />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* ── Basic Info + Account Settings ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Basic Info (read-only display; editing happens via modal) */}
        <Card className="p-5 border border-gray-100 shadow-sm rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" /> Basic Information
            </h2>
            <button
              onClick={() => setShowEditModal(true)}
              className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-3.5">
            {[
              { label: "Full Name",     value: name,       icon: <User        className="w-3.5 h-3.5 text-gray-300" /> },
              { label: "Email Address", value: email,      icon: <Mail        className="w-3.5 h-3.5 text-gray-300" /> },
              { label: "Joined Date",   value: joinedDate, icon: <CalendarDays className="w-3.5 h-3.5 text-gray-300" /> },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {f.label}
                </label>
                <p className="mt-1 text-sm font-medium text-gray-800 flex items-center gap-1.5">
                  {f.icon} {f.value}
                </p>
              </div>
            ))}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Bio
              </label>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">{bio}</p>
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="p-5 border border-gray-100 shadow-sm rounded-2xl">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-indigo-400" /> Account Settings
          </h2>

          <div className="space-y-0">
            {/* Change Password */}
            <div className="flex items-center justify-between py-3.5 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-700">Password</p>
                <p className="text-xs text-gray-400 mt-0.5">Last changed 30 days ago</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs gap-1.5 border-gray-200 hover:border-amber-300 hover:text-amber-600 transition-colors"
                onClick={() => setShowPasswordModal(true)}
              >
                <KeyRound className="w-3 h-3" /> Change
              </Button>
            </div>

            {/* Notifications toggle */}
            <div className="flex items-center justify-between py-3.5 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" /> Notifications
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {notificationsOn ? "Push notifications enabled" : "Notifications are off"}
                </p>
              </div>
              <Toggle
                on={notificationsOn}
                onToggle={handleNotificationToggle}
                activeColor="bg-indigo-500 border-indigo-500"
              />
            </div>

            {/* Theme toggle */}
            <div className="flex items-center justify-between py-3.5 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  {darkMode
                    ? <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    : <Sun  className="w-3.5 h-3.5 text-amber-500" />}
                  Theme
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {darkMode ? "Dark mode is active" : "Light mode is active"}
                </p>
              </div>
              <Toggle
                on={darkMode}
                onToggle={handleToggleDark}
                activeColor="bg-slate-700 border-slate-700"
              />
            </div>

            {/* Sign Out */}
            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full h-10 text-sm font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 gap-2 transition-colors rounded-xl"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Recent Submissions Table ─────────────────────────────────────────── */}
      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" /> Recent Submissions
          </h2>
          <span className="text-xs text-gray-400">{history.length} items</span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-6">Task / Content Title</div>
          <div className="col-span-3">Submission Date</div>
          <div className="col-span-3">Status</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-50">
          {history.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No submissions found on the Project Board yet.
            </div>
          )}
          {history.map((item: WorkItem) => {
            const s = statusCfg[item.status];
            return (
              <div
                key={item.id}
                className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-indigo-50/30 transition-colors cursor-default"
              >
                <div className="col-span-6 pr-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                </div>
                <div className="col-span-3 text-xs text-gray-500 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  {fmtDate(item.date)}
                </div>
                <div className="col-span-3">
                  <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full", s.badge)}>
                    {s.icon} {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showEditModal && (
        <EditProfileModal
          currentName={name}
          currentBio={bio}
          onSave={handleSaveProfile}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

export default Profile;
