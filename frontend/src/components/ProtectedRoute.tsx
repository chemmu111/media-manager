import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface Props {
  role: "admin" | "editor";
}

/**
 * Wraps a group of routes and:
 * - Redirects to "/" if not logged in
 * - Redirects to the correct dashboard if the user's role doesn't match
 */
const ProtectedRoute = ({ role }: Props) => {
  const { user, loading } = useAuth();

  // While verifying the session, render nothing (avoids flash redirect)
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const isAdmin = user.role === "admin";

  if (role === "admin" && !isAdmin) {
    return <Navigate to="/editor/dashboard" replace />;
  }

  if (role === "editor" && isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
