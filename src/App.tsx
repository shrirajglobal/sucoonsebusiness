import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { isComingSoonModule } from "@/lib/prelaunch";
import PlanGate from "@/components/shared/PlanGate";
import { Loader2 } from "lucide-react";

// Auth-critical pages are eager so first paint after login/landing has no flash.
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Everything else is code-split so the initial JS bundle stays small.
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const CRM = lazy(() => import("./pages/CRM"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Forms = lazy(() => import("./pages/Forms"));
const Engagement = lazy(() => import("./pages/Engagement"));
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const GanttTasks = lazy(() => import("./pages/GanttTasks"));
const Finance = lazy(() => import("./pages/Finance"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Vendors = lazy(() => import("./pages/Vendors"));
const Compliance = lazy(() => import("./pages/Compliance"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Branches = lazy(() => import("./pages/Branches"));
const Partners = lazy(() => import("./pages/Partners"));
const FeePlans = lazy(() => import("./pages/FeePlans"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const Contacts = lazy(() => import("./pages/Contacts"));
const CardScanner = lazy(() => import("./pages/CardScanner"));
const IdeaBoard = lazy(() => import("./pages/IdeaBoard"));
const Support = lazy(() => import("./pages/Support"));
const Help = lazy(() => import("./pages/Help"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const AffiliateSignup = lazy(() => import("./pages/AffiliateSignup"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Refund = lazy(() => import("./pages/legal/Refund"));
const Shipping = lazy(() => import("./pages/legal/Shipping"));
const ContactUs = lazy(() => import("./pages/legal/ContactUs"));
const PricingPage = lazy(() => import("./pages/legal/Pricing"));

// Sensible React Query defaults. Every mutation in the app already calls
// invalidateQueries explicitly, so freshness after writes is preserved —
// we're only killing the "refetch on every tab-switch" storm.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/affiliate" element={<AffiliateSignup />} />
          <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (!businessId) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/partners" element={<GatedRoute module="partner_network"><Partners /></GatedRoute>} />
        <Route path="/fee-plans" element={<GatedRoute module="fee_schedule"><FeePlans /></GatedRoute>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/support" element={<GatedRoute module="support"><Support /></GatedRoute>} />
        <Route path="/help" element={<Help />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/affiliate" element={<AffiliateSignup />} />
        <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/shipping" element={<Shipping />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
