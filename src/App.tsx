import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { AccessGuard } from "@/components/AccessGuard";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingTour } from "@/components/OnboardingTour";
import { DevPreviewBadge } from "@/components/DevPreviewBadge";
import { TollDiagnosticFloatingPanel } from "@/components/TollDiagnosticFloatingPanel";
import { SUPPORT_REQUEST_ROUTE } from "@/features/help/supportRequestOptions";
import { appPath, legacyToAppPath, nestedRoutePath } from "@/lib/routes";
import { useAuth } from "@/context/auth-context";
import LandingPage from "./pages/LandingPage";
import WaitingAccessPage from "./pages/WaitingAccessPage";
import Dashboard from "./pages/Dashboard";
import VehiclesPage from "./pages/VehiclesPage";
import NewTripPage from "./pages/NewTripPage";
import TripDetailPage from "./pages/TripDetailPage";
import ActiveTripRedirectPage from "./pages/ActiveTripRedirectPage";
import FreightAnalysisPage from "./pages/FreightAnalysisPage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import MaintenancePage from "./pages/MaintenancePage";
import PersonalExpensesPage from "./pages/PersonalExpensesPage";
import PXDigitalPage from "./pages/PXDigitalPage";
import PXInvitePage from "./pages/PXInvitePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OperationPage from "./pages/OperationPage";
import ToolsPage from "./pages/ToolsPage";
import MorePage from "./pages/MorePage";
import HelpCenterPage from "./pages/HelpCenterPage";
import HelpTopicDetailPage from "./pages/HelpTopicDetailPage";
import SupportRequestPage from "./pages/SupportRequestPage";
import SupportTicketsPage from "./pages/SupportTicketsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LEGACY_INTERNAL_ROUTES = [
  "/vehicles",
  "/new-trip",
  "/trip/*",
  "/freight-analysis",
  "/history",
  "/perfil",
  "/operation",
  "/tools",
  "/more",
  "/help/*",
  SUPPORT_REQUEST_ROUTE,
  "/menu",
  "/maintenance",
  "/personal-expenses",
  "/px/*",
];

function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to={appPath()} replace /> : <LandingPage />;
}

function LegacyAppRedirect() {
  const location = useLocation();

  return (
    <Navigate
      to={`${legacyToAppPath(location.pathname)}${location.search}${location.hash}`}
      replace
    />
  );
}

function ProtectedApp() {
  return (
    <AccessGuard>
      <AppProvider>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path={nestedRoutePath("/vehicles")} element={<VehiclesPage />} />
          <Route path={nestedRoutePath("/new-trip")} element={<NewTripPage />} />
          <Route path={nestedRoutePath("/trip/ativa")} element={<ActiveTripRedirectPage />} />
          <Route path={nestedRoutePath("/trip/:id")} element={<TripDetailPage />} />
          <Route path={nestedRoutePath("/freight-analysis")} element={<FreightAnalysisPage />} />
          <Route path={nestedRoutePath("/history")} element={<HistoryPage />} />
          <Route path={nestedRoutePath("/perfil")} element={<ProfilePage />} />
          <Route path={nestedRoutePath("/operation")} element={<OperationPage />} />
          <Route path={nestedRoutePath("/tools")} element={<ToolsPage />} />
          <Route path={nestedRoutePath("/more")} element={<MorePage />} />
          <Route path={nestedRoutePath("/help")} element={<HelpCenterPage />} />
          <Route path={nestedRoutePath("/help/topico/:topicId")} element={<HelpTopicDetailPage />} />
          <Route path={nestedRoutePath("/help/tickets")} element={<SupportTicketsPage />} />
          <Route path={nestedRoutePath(SUPPORT_REQUEST_ROUTE)} element={<SupportRequestPage />} />
          <Route path={nestedRoutePath("/menu")} element={<ProfilePage />} />
          <Route path={nestedRoutePath("/maintenance")} element={<MaintenancePage />} />
          <Route path={nestedRoutePath("/personal-expenses")} element={<PersonalExpensesPage />} />
          <Route path={nestedRoutePath("/px")} element={<PXDigitalPage />} />
          <Route path={nestedRoutePath("/px/convite/:channelId")} element={<PXInvitePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <OnboardingTour />
        <BottomNav />
        <TollDiagnosticFloatingPanel />
        <DevPreviewBadge />
      </AppProvider>
    </AccessGuard>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/inicio" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Authenticated beta access route */}
            <Route
              path="/aguardando"
              element={
                <AuthGuard>
                  <WaitingAccessPage />
                </AuthGuard>
              }
            />

            {/* Protected app routes */}
            <Route path={`${appPath()}/*`} element={<ProtectedApp />} />

            {/* Temporary legacy internal route redirects */}
            {LEGACY_INTERNAL_ROUTES.map((path) => (
              <Route key={path} path={path} element={<LegacyAppRedirect />} />
            ))}

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
