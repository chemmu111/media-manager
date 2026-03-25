import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Review from "./pages/Review";
import ContentCalendar from "./pages/ContentCalendar";
import AppLayout from "./components/AppLayout";

import EditorLayout from "./components/EditorLayout";
import EditorDashboard from "./pages/EditorDashboard";
import EditorFeedback from "./pages/EditorFeedback";


import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Login />} />

            {/* Admin-only routes */}
            <Route element={<ProtectedRoute role="admin" />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/review" element={<Review />} />
                <Route path="/calendar" element={<ContentCalendar />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Editor-only routes */}
            <Route element={<ProtectedRoute role="editor" />}>
              <Route element={<EditorLayout />}>
                <Route path="/editor/dashboard" element={<EditorDashboard />} />
                <Route path="/editor/tasks" element={<Tasks />} />
                <Route path="/editor/feedback" element={<EditorFeedback />} />
                <Route path="/editor/calendar" element={<ContentCalendar />} />
                <Route path="/editor/profile" element={<Profile />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
