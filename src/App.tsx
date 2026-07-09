import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { isComingSoonModule, ROUTE_MODULE_MAP } from "@/lib/prelaunch";
import PlanGate from "@/components/shared/PlanGate";
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
import Partners from "./pages/Partners";
import LeadDetail from "./pages/LeadDetail";
import Contacts from "./pages/Contacts";
import CardScanner from "./pages/CardScanner";
import IdeaBoard from "./pages/IdeaBoard";
import Support from "./pages/Support";
import Help from "./pages/Help";
import ComingSoon from "./pages/ComingSoon";
import SuperAdmin from "./pages/SuperAdmin";
import AffiliateSignup from "./pages/AffiliateSignup";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Wrapper that gates a route based on pre-launch status AND subscription plan
function GatedRoute({ module, children }: { module: string; children: React.ReactNode }) {
  const { user } = useAuth();
  if (isComingSoonModule(module, user?.email)) {
    return <ComingSoon />;
  }
  return <PlanGate module={module}>{children}</PlanGate>;
}

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
        <Route path="/affiliate" element={<AffiliateSignup />} />
        <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
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
      <Route path="/tasks/gantt" element={<GatedRoute module="tasks"><GanttTasks /></GatedRoute>} />
      <Route path="/crm" element={<GatedRoute module="crm"><CRM /></GatedRoute>} />
      <Route path="/crm/:id" element={<GatedRoute module="crm"><LeadDetail /></GatedRoute>} />

      <Route path="/attendance" element={<GatedRoute module="attendance"><Attendance /></GatedRoute>} />
      <Route path="/forms" element={<GatedRoute module="forms"><Forms /></GatedRoute>} />
      <Route path="/engagement" element={<GatedRoute module="engagement"><Engagement /></GatedRoute>} />
      <Route path="/analytics" element={<GatedRoute module="analytics"><Analytics /></GatedRoute>} />
      <Route path="/reports" element={<GatedRoute module="reports"><Reports /></GatedRoute>} />
      <Route path="/finance" element={<GatedRoute module="finance"><Finance /></GatedRoute>} />
      <Route path="/inventory" element={<GatedRoute module="inventory"><Inventory /></GatedRoute>} />
      <Route path="/vendors" element={<GatedRoute module="vendors"><Vendors /></GatedRoute>} />
      <Route path="/compliance" element={<GatedRoute module="compliance"><Compliance /></GatedRoute>} />
      <Route path="/assistant" element={<GatedRoute module="assistant"><Assistant /></GatedRoute>} />
      <Route path="/contacts" element={<Contacts />} />
      <Route path="/card-scanner" element={<CardScanner />} />
      <Route path="/ideas" element={<IdeaBoard />} />
      <Route path="/branches" element={<GatedRoute module="branches"><Branches /></GatedRoute>} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/support" element={<GatedRoute module="support"><Support /></GatedRoute>} />
      <Route path="/help" element={<Help />} />
      <Route path="/super-admin" element={<SuperAdmin />} />
      <Route path="/affiliate" element={<AffiliateSignup />} />
      <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
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
