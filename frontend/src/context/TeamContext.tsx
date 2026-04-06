import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export interface Team {
  _id: string;
  name: string;
  color: string;
  emoji: string;
  description: string;
}

interface TeamContextType {
  teams: Team[];
  loading: boolean;
  activeTeamId: string | null;
  setActiveTeamId: (id: string | null) => void;
  refreshTeams: () => void;
  addTeam: (name: string) => Promise<Team | null>;
  removeTeam: (id: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType>({
  teams: [],
  loading: true,
  activeTeamId: null,
  setActiveTeamId: () => {},
  refreshTeams: () => {},
  addTeam: async () => null,
  removeTeam: async () => {},
});

export const useTeams = () => useContext(TeamContext);

// Accent colours cycle for auto-generated teams
const TEAM_ACCENT_CYCLE = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];
const TEAM_EMOJI_CYCLE = ["🎬", "📱", "🎯", "🚀", "💡", "🎨"];

export const TeamProvider = ({ children }: { children: ReactNode }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Persist activeTeamId in localStorage across page refreshes
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => {
    return localStorage.getItem("activeTeamId") ?? null;
  });

  const setActiveTeamId = (id: string | null) => {
    setActiveTeamIdState(id);
    if (id) {
      localStorage.setItem("activeTeamId", id);
    } else {
      localStorage.removeItem("activeTeamId");
    }
  };

  const fetchTeams = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/teams`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeams(data);
          // If persisted activeTeamId no longer exists, reset it
          if (activeTeamId && !data.find((t: Team) => t._id === activeTeamId)) {
            setActiveTeamId(data[0]?._id ?? null);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTeamId]);

  useEffect(() => {
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTeam = async (name: string): Promise<Team | null> => {
    const idx = teams.length;
    const color = TEAM_ACCENT_CYCLE[idx % TEAM_ACCENT_CYCLE.length];
    const emoji = TEAM_EMOJI_CYCLE[idx % TEAM_EMOJI_CYCLE.length];
    try {
      const res = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), color, emoji, description: "" }),
      });
      if (!res.ok) throw new Error("Failed to create team");
      const team: Team = await res.json();
      setTeams((prev) => [...prev, team]);
      return team;
    } catch {
      return null;
    }
  };

  const removeTeam = async (id: string): Promise<void> => {
    try {
      await fetch(`${API_BASE}/teams/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setTeams((prev) => prev.filter((t) => t._id !== id));
      if (activeTeamId === id) {
        const remaining = teams.filter((t) => t._id !== id);
        setActiveTeamId(remaining[0]?._id ?? null);
      }
    } catch {
      // silently fail — UI stays unchanged
    }
  };

  return (
    <TeamContext.Provider
      value={{ teams, loading, activeTeamId, setActiveTeamId, refreshTeams: fetchTeams, addTeam, removeTeam }}
    >
      {children}
    </TeamContext.Provider>
  );
};
