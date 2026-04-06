import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "member";
  preferredView?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isEditor: boolean;
  setUser: (u: AuthUser | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<AuthUser | null>(() => {
    // Hydrate from localStorage on first render for instant access
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const setUser = (u: AuthUser | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  };

  // On mount, verify session is still valid with the server
  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser({
            id: data._id ?? data.id,
            name: data.name,
            email: data.email,
            role: data.role ?? "editor",
            preferredView: data.preferredView,
          });
        } else {
          // Token expired or invalid — clear local state
          setUser(null);
        }
      } catch {
        // Network error — keep localStorage value so the UI still works offline
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    setUser(null);
  };

  const isAdmin = user?.role === "admin";
  const isEditor = !isAdmin; // member and editor both get the editor portal

  return (
    <AuthContext.Provider value={{ user, isAdmin, isEditor, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
