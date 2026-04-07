import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const GoogleCallback = () => {
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const status = params.get("status");

    if (status !== "success") {
      navigate("/?error=google_auth_failed");
      return;
    }

    // Cookie is already set by backend — fetch the user profile
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUser({
          id: data._id ?? data.id,
          name: data.name,
          email: data.email,
          role: data.role ?? "editor",
          preferredView: data.preferredView,
        });
        const destination = data.role === "admin" ? "/dashboard" : "/editor/dashboard";
        navigate(destination, { replace: true });
      })
      .catch(() => navigate("/?error=google_auth_failed"));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
};

export default GoogleCallback;
