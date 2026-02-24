import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TeamSpace from "./pages/TeamSpace";
import Tasks from "./pages/Tasks";
import Review from "./pages/Review";
import Targets from "./pages/Targets";
import Reports from "./pages/Reports";
import ContentCalendar from "./pages/ContentCalendar";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/team-space" element={<TeamSpace />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/review" element={<Review />} />
            <Route path="/targets" element={<Targets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/calendar" element={<ContentCalendar />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
