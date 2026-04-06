import { useState, useEffect } from "react";
import { Outlet, useSearchParams, useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { Bell, User, List, Filter, Settings, LogOut, Info, Grid3X3, UserCheck, UserX } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { io as ioClient, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL.replace("/api", "");
const API_BASE = import.meta.env.VITE_API_BASE_URL;

const AppLayout = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser, logout: authLogout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attendance, setAttendance] = useState<"present" | "leave">("present");
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const view = searchParams.get("view") || localStorage.getItem("preferredView") || "kanban";

  useEffect(() => {
    if (!searchParams.get("view")) {
      setSearchParams({ ...Object.fromEntries(searchParams), view });
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const socket: Socket = ioClient(SOCKET_URL, { withCredentials: true });
    socket.on("newNotification", (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.attendance) setAttendance(data.attendance);
        if (data.preferredView && !searchParams.get("view")) {
          setSearchParams({ ...Object.fromEntries(searchParams), view: data.preferredView });
        }
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
    } catch (err) {
      console.error("Fetch notifications failed", err);
    }
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
      await authLogout();
      toast.success("Logged out successfully");
      navigate("/");
    } catch {
      toast.error("Logout failed");
    }
  };

  const toggleView = async () => {
    const newView = view === "kanban" ? "list" : "kanban";
    setSearchParams({ ...Object.fromEntries(searchParams), view: newView });
    localStorage.setItem("preferredView", newView);
    if (authUser) {
      try {
        await fetch(`${API_BASE}/auth/preferred-view`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ preferredView: newView }),
        });
      } catch {}
    }
  };

  const handleFilter = (key: string, value: string) => {
    const newParams = Object.fromEntries(searchParams);
    if (newParams[key] === value) delete newParams[key];
    else newParams[key] = value;
    setSearchParams(newParams);
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b flex items-center justify-end px-6 gap-2 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-1">

            {/* Attendance Toggle */}
            <button
              onClick={toggleAttendance}
              disabled={attendanceLoading}
              title={attendance === "present" ? "You are Present — click to set Leave" : "You are On Leave — click to set Present"}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                attendance === "present"
                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
              )}
            >
              {attendance === "present"
                ? <><UserCheck className="w-3.5 h-3.5" /> Present</>
                : <><UserX className="w-3.5 h-3.5" /> Leave</>
              }
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-900 transition-colors"
              onClick={toggleView}
              title={`Switch to ${view === 'kanban' ? 'List' : 'Kanban'} view`}
            >
              {view === "kanban" ? <List className="w-[18px] h-[18px]" /> : <Grid3X3 className="w-[18px] h-[18px]" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 transition-colors">
                  <Filter className="w-[18px] h-[18px]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter Tasks</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => handleFilter("priority", "high")}>
                  Priority: High {searchParams.get("priority") === "high" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => handleFilter("priority", "medium")}>
                  Priority: Medium {searchParams.get("priority") === "medium" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => handleFilter("priority", "low")}>
                  Priority: Low {searchParams.get("priority") === "low" && "✓"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 transition-colors relative">
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                  <span>Notifications</span>
                  {unreadCount > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{unreadCount} new</span>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/30' : ''}`}
                        onClick={() => !n.read && markAsRead(n._id)}
                      >
                        <div className="flex items-start gap-3 text-sm">
                          <Info className={`w-4 h-4 mt-0.5 shrink-0 ${n.type === 'assignment' ? 'text-green-500' : 'text-blue-500'}`} />
                          <div>
                            <p className={`text-gray-900 ${!n.read ? 'font-medium' : ''}`}>{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-xs justify-center text-blue-600 font-medium">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 transition-colors">
                  <User className="w-[18px] h-[18px]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{authUser?.name || "My Account"}</span>
                    <span className="text-[10px] text-gray-400 font-normal">{authUser?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
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

export default AppLayout;
