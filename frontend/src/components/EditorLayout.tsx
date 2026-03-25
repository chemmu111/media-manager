import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import EditorSidebar from "./EditorSidebar";
import { Bell, Info, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = `http://${window.location.hostname}:8080/api`;

const EditorLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attendance, setAttendance] = useState<"present" | "leave">("present");
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.attendance) setAttendance(data.attendance);
      }
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch {}
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const toggleAttendance = async () => {
    const next = attendance === "present" ? "leave" : "present";
    setAttendanceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attendance: next }),
      });
      if (res.ok) {
        setAttendance(next);
        toast.success(next === "present" ? "Marked as Present" : "Marked as On Leave");
      }
    } catch {
      toast.error("Failed to update attendance");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      toast.success("Logged out successfully");
      navigate("/");
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <EditorSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-2">

            {/* Attendance Toggle Switch */}
            <button
              onClick={toggleAttendance}
              disabled={attendanceLoading}
              title={attendance === "present" ? "You are Present — click to set Leave" : "You are On Leave — click to set Present"}
              className="flex items-center gap-2 focus:outline-none"
              aria-label="Toggle attendance"
            >
              <span className="text-xs font-medium text-gray-500 select-none">
                {attendance === "present" ? "Present" : "Leave"}
              </span>
              <span
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-300 ease-in-out",
                  attendance === "present"
                    ? "bg-green-500 border-green-500"
                    : "bg-gray-300 border-gray-300"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out",
                    attendance === "present" ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </span>
            </button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-900">
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => !n.read && markAsRead(n._id)}
                        className={`p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? "bg-blue-50/30" : ""}`}
                      >
                        <div className="flex items-start gap-3 text-sm">
                          <Info className={`w-4 h-4 mt-0.5 shrink-0 ${n.type === "assignment" ? "text-green-500" : "text-blue-500"}`} />
                          <div>
                            <p className={`text-gray-900 ${!n.read ? "font-medium" : ""}`}>{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900">
                  <User className="w-[18px] h-[18px]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name || "My Account"}</span>
                    <span className="text-[10px] text-gray-400 font-normal">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/editor/profile")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EditorLayout;
