import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

const authMock = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  loading: false,
}));

vi.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: authMock.user,
    loading: authMock.loading,
    session: authMock.user ? { user: authMock.user } : null,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/context/AppContext", () => ({
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/AccessGuard", () => ({
  AccessGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/BottomNav", () => ({
  BottomNav: () => <div>Bottom navigation</div>,
}));

vi.mock("@/components/OnboardingTour", () => ({
  OnboardingTour: () => <div>Onboarding tour</div>,
}));

vi.mock("@/components/DevPreviewBadge", () => ({
  DevPreviewBadge: () => <div>Dev preview badge</div>,
}));

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/pages/LandingPage", () => ({ default: () => <div>Landing page</div> }));
vi.mock("@/pages/WaitingAccessPage", () => ({ default: () => <div>Waiting access page</div> }));
vi.mock("@/pages/Dashboard", () => ({ default: () => <div>Dashboard page</div> }));
vi.mock("@/pages/VehiclesPage", () => ({ default: () => <div>Vehicles page</div> }));
vi.mock("@/pages/NewTripPage", () => ({ default: () => <div>New trip page</div> }));
vi.mock("@/pages/TripDetailPage", () => ({ default: () => <div>Trip detail page</div> }));
vi.mock("@/pages/ActiveTripRedirectPage", () => ({ default: () => <div>Active trip redirect page</div> }));
vi.mock("@/pages/FreightAnalysisPage", () => ({ default: () => <div>Freight analysis page</div> }));
vi.mock("@/pages/HistoryPage", () => ({ default: () => <div>History page</div> }));
vi.mock("@/pages/ProfilePage", () => ({ default: () => <div>Profile page</div> }));
vi.mock("@/pages/MaintenancePage", () => ({ default: () => <div>Maintenance page</div> }));
vi.mock("@/pages/PersonalExpensesPage", () => ({ default: () => <div>Personal expenses page</div> }));
vi.mock("@/pages/PXDigitalPage", () => ({ default: () => <div>PX digital page</div> }));
vi.mock("@/pages/PXInvitePage", () => ({ default: () => <div>PX invite page</div> }));
vi.mock("@/pages/LoginPage", () => ({ default: () => <div>Login page</div> }));
vi.mock("@/pages/RegisterPage", () => ({ default: () => <div>Register page</div> }));
vi.mock("@/pages/ForgotPasswordPage", () => ({ default: () => <div>Forgot password page</div> }));
vi.mock("@/pages/ResetPasswordPage", () => ({ default: () => <div>Reset password page</div> }));
vi.mock("@/pages/OperationPage", () => ({ default: () => <div>Operation page</div> }));
vi.mock("@/pages/ToolsPage", () => ({ default: () => <div>Tools page</div> }));
vi.mock("@/pages/MorePage", () => ({ default: () => <div>More page</div> }));
vi.mock("@/pages/HelpCenterPage", () => ({ default: () => <div>Help center page</div> }));
vi.mock("@/pages/HelpTopicDetailPage", () => ({ default: () => <div>Help topic detail page</div> }));
vi.mock("@/pages/SupportRequestPage", () => ({ default: () => <div>Support request page</div> }));
vi.mock("@/pages/SupportTicketsPage", () => ({ default: () => <div>Support tickets page</div> }));
vi.mock("@/pages/NotFound", () => ({ default: () => <div>Not found page</div> }));

function setRoute(path: string) {
  window.history.pushState({}, "", path);
}

describe("App route namespace wiring", () => {
  beforeEach(() => {
    authMock.user = null;
    authMock.loading = false;
    setRoute("/");
  });

  it("renders the public landing at root for anonymous users", () => {
    render(<App />);

    expect(screen.getByText("Landing page")).toBeInTheDocument();
  });

  it("shows root auth loading state before deciding between landing and app", () => {
    authMock.loading = true;

    const { container } = render(<App />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Landing page")).not.toBeInTheDocument();
  });

  it("redirects authenticated root access to the app dashboard", async () => {
    authMock.user = { id: "user-123", email: "driver@spacetruck.test" };

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard page")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/app");
  });

  it("redirects /inicio to the public root", async () => {
    setRoute("/inicio");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Landing page")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/");
  });

  it("renders public auth routes outside the app namespace", () => {
    setRoute("/login");

    render(<App />);

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Bottom navigation")).not.toBeInTheDocument();
  });

  it("renders the waiting access route behind auth guard wiring", () => {
    setRoute("/aguardando");

    render(<App />);

    expect(screen.getByText("Waiting access page")).toBeInTheDocument();
  });

  it("renders internal app routes under /app", () => {
    setRoute("/app/tools");

    render(<App />);

    expect(screen.getByText("Tools page")).toBeInTheDocument();
    expect(screen.getByText("Bottom navigation")).toBeInTheDocument();
  });

  it("redirects legacy internal routes to the app namespace preserving search and hash", async () => {
    setRoute("/history?period=month#summary");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("History page")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/app/history");
    expect(window.location.search).toBe("?period=month");
    expect(window.location.hash).toBe("#summary");
  });

  it("redirects legacy wildcard routes to matching app namespace routes", async () => {
    setRoute("/trip/abc123");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Trip detail page")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/app/trip/abc123");
  });

  it("renders the top-level not found page for unknown public routes", () => {
    setRoute("/unknown-public-route");

    render(<App />);

    expect(screen.getByText("Not found page")).toBeInTheDocument();
  });
});
