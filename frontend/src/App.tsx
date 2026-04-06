import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { TeamProvider } from "@/context/TeamContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Review from "./pages/Review";
import ContentCalendar from "./pages/ContentCalendar";
import AppLayout from "./components/AppLayout";
import TeamSpace from "./pages/TeamSpace";
import Profile from "./pages/Profile";

import UserManagement from "./pages/UserManagement";
import EditorLayout from "./components/EditorLayout";
import EditorDashboard from "./pages/EditorDashboard";
import EditorFeedback from "./pages/EditorFeedback";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TeamProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Login />} />

              {/* Admin-only routes */}
              <Route element={<ProtectedRoute role="admin" />}>
                <Route element={<AppLayout />}>

                  {/* ── Legacy global routes (no team context) ── */}
                  <Route path="/dashboard"  element={<Dashboard />} />
                  <Route path="/tasks"      element={<Tasks />} />
                  <Route path="/review"     element={<Review />} />
                  <Route path="/calendar"   element={<ContentCalendar />} />
                  <Route path="/team-space" element={<TeamSpace />} />
                  <Route path="/profile"    element={<Profile />} />
                  <Route path="/users"      element={<UserManagement />} />

                  {/* ── Team-scoped routes /team/:teamId/* ── */}
                  <Route path="/team/:teamId/dashboard"  element={<Dashboard />} />
                  <Route path="/team/:teamId/tasks"      element={<Tasks />} />
                  <Route path="/team/:teamId/review"     element={<Review />} />
                  <Route path="/team/:teamId/calendar"   element={<ContentCalendar />} />
                  <Route path="/team/:teamId/team-space" element={<TeamSpace />} />
                  <Route path="/team/:teamId/profile"    element={<Profile />} />

                </Route>
              </Route>

              {/* Editor-only routes */}
              <Route element={<ProtectedRoute role="editor" />}>
                <Route element={<EditorLayout />}>
                  <Route path="/editor/dashboard" element={<EditorDashboard />} />
                  <Route path="/editor/tasks"     element={<Tasks />} />
                  <Route path="/editor/feedback"  element={<EditorFeedback />} />
                  <Route path="/editor/calendar"  element={<ContentCalendar />} />
                  <Route path="/editor/profile"   element={<Profile />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </TeamProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
