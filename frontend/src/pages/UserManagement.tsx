import { useState, useEffect } from "react";
import { Search, RefreshCw, Users, ShieldCheck, Pencil, UserCircle } from "lucide-react";

const API_USERS = `http://${window.location.hostname}:8080/api/users`;

interface User {
  _id:      string;
  name:     string;
  username: string;
  email:    string;
  role:     "admin" | "editor" | "member";
}

const ROLE_META: Record<User["role"], { label: string; dot: string; badge: string; icon: React.ReactNode }> = {
  admin:  {
    label: "Admin",
    dot:   "bg-violet-500",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    icon:  <ShieldCheck className="w-3 h-3" />,
  },
  editor: {
    label: "Editor",
    dot:   "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    icon:  <Pencil className="w-3 h-3" />,
  },
  member: {
    label: "Member",
    dot:   "bg-slate-400",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    icon:  <UserCircle className="w-3 h-3" />,
  },
};

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-blue-600",
];
function avatarGradient(name: string) {
  const safeName = (name || "User").trim() || "User";
  let h = 0;
  for (const c of safeName) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  const safeName = (name || "User").trim() || "User";
  return safeName.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function UserManagement() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [query,   setQuery]   = useState("");
  const [role,    setRole]    = useState<User["role"] | "all">("all");

  const load = () => {
    setLoading(true);
    setError("");
    fetch(API_USERS, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((data: User[]) => setUsers(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = users.filter((u) => {
    const matchesRole  = role === "all" || u.role === role;
    const q            = query.toLowerCase();
    const matchesQuery = !q ||
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  const counts = {
    all:    users.length,
    admin:  users.filter((u) => u.role === "admin").length,
    editor: users.filter((u) => u.role === "editor").length,
    member: users.filter((u) => u.role === "member").length,
  };

  return (
    <div className="p-6 space-y-6 bg-[#f5f6fa] min-h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All registered users — verify editors before assigning tasks.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Stat pills ── */}
      <div className="flex flex-wrap gap-2">
        {(["all", "admin", "editor", "member"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
              role === r
                ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {r === "all" ? (
              <><Users className="w-3.5 h-3.5" /> All</>
            ) : (
              <><span className={`w-2 h-2 rounded-full ${ROLE_META[r].dot}`} />{ROLE_META[r].label}</>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              role === r ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {counts[r]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Search bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, username, email…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 outline-none focus:border-gray-400 focus:bg-white transition-all"
            />
          </div>
          <p className="text-sm text-gray-400 ml-auto">
            {loading ? "Loading…" : `${filtered.length} of ${users.length} users`}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-red-500">
                    Failed to load users: {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const meta = ROLE_META[u.role];
                  return (
                    <tr key={u._id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Full Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(u.name)} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}
                          >
                            {initials(u.name)}
                          </div>
                          <span className="font-medium text-gray-900">{u.name}</span>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-6 py-4 text-gray-500 font-mono text-[13px]">
                        @{u.username}
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-gray-500">{u.email}</td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badge}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && !error && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
