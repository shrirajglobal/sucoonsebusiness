import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import CRM from "./pages/CRM";
import Attendance from "./pages/Attendance";
import Forms from "./pages/Forms";
import Engagement from "./pages/Engagement";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import GanttTasks from "./pages/GanttTasks";
import Finance from "./pages/Finance";
import Inventory from "./pages/Inventory";
import Vendors from "./pages/Vendors";
import Compliance from "./pages/Compliance";
import Assistant from "./pages/Assistant";
import Branches from "./pages/Branches";
import LeadDetail from "./pages/LeadDetail";
import Contacts from "./pages/Contacts";
import CardScanner from "./pages/CardScanner";
import IdeaBoard from "./pages/IdeaBoard";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, businessId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (!businessId) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/tasks/gantt" element={<GanttTasks />} />
      <Route path="/crm" element={<CRM />} />
      <Route path="/crm/:id" element={<LeadDetail />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/forms" element={<Forms />} />
      <Route path="/engagement" element={<Engagement />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/finance" element={<Finance />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/vendors" element={<Vendors />} />
      <Route path="/compliance" element={<Compliance />} />
      <Route path="/assistant" element={<Assistant />} />
      <Route path="/contacts" element={<Contacts />} />
      <Route path="/card-scanner" element={<CardScanner />} />
      <Route path="/ideas" element={<IdeaBoard />} />
      <Route path="/branches" element={<Branches />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
