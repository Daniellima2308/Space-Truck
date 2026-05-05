import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccessProfile, AccessStatus } from "@/features/access/accessTypes";
import { getWaitingAccessCopy } from "@/features/access/waitingAccessCopy";
import WaitingAccessPage from "@/pages/WaitingAccessPage";

const mockedNavigate = vi.fn();
const mockedSignOut = vi.fn();

const authMock = vi.hoisted(() => ({
  user: { id: "user-123", email: "driver@spacetruck.test" } as { id: string; email: string } | null,
  signOut: vi.fn(),
}));

const accessProfileMock = vi.hoisted(() => ({
  data: null as AccessProfile | null,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: authMock.user,
    session: null,
    loading: false,
    signOut: authMock.signOut,
  }),
}));

vi.mock("@/features/access/useAccessProfile", () => ({
  useAccessProfile: () => accessProfileMock,
}));

const profileWithStatus = (accessStatus: AccessStatus): AccessProfile => ({
  userId: "user-123",
  role: accessStatus === "approved" ? "admin" : "user",
  accessStatus,
  accessStatusReason: accessStatus === "waitlisted" ? "signup_waitlist" : null,
  approvedAt: accessStatus === "approved" ? "2026-05-04T00:00:00Z" : null,
  approvedBy: accessStatus === "approved" ? "user-123" : null,
});

function renderWaitingAccessPage() {
  return render(
    <MemoryRouter>
      <WaitingAccessPage />
    </MemoryRouter>,
  );
}

describe("getWaitingAccessCopy", () => {
  it.each([
    ["approved", "Acesso liberado", "Seu acesso já está aprovado."],
    ["waitlisted", "Pré-registro confirmado", "Você está na fila de acesso do Space Truck."],
    ["suspended", "Acesso pausado", "Seu acesso está pausado no momento."],
    ["blocked", "Acesso não liberado", "Seu acesso não está liberado."],
    ["deactivated", "Conta inativa", "Essa conta não está ativa para uso do Space Truck."],
  ] as const)("returns status-aware copy for %s", (status, badge, heading) => {
    expect(getWaitingAccessCopy(status)).toEqual(expect.objectContaining({ badge, heading }));
  });

  it("returns preparation copy when there is no access status yet", () => {
    expect(getWaitingAccessCopy(undefined)).toEqual(
      expect.objectContaining({
        badge: "Perfil em preparação",
        heading: "Seu perfil ainda está sendo preparado.",
      }),
    );
  });
});

describe("WaitingAccessPage", () => {
  beforeEach(() => {
    authMock.user = { id: "user-123", email: "driver@spacetruck.test" };
    authMock.signOut = mockedSignOut;
    mockedNavigate.mockClear();
    mockedSignOut.mockClear();
    accessProfileMock.data = profileWithStatus("waitlisted");
  });

  it("renders the waitlisted access state", () => {
    renderWaitingAccessPage();

    expect(screen.getByText("Pré-registro confirmado")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Você está na fila de acesso do Space Truck." })).toBeInTheDocument();
    expect(screen.getByText(/Seu pré-registro está confirmado/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Bino dando boas-vindas/i)).toBeInTheDocument();
  });

  it("renders a blocked access state without waitlist copy", () => {
    accessProfileMock.data = profileWithStatus("blocked");

    renderWaitingAccessPage();

    expect(screen.getByText("Acesso não liberado")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seu acesso não está liberado." })).toBeInTheDocument();
    expect(screen.queryByText("Pré-registro confirmado")).not.toBeInTheDocument();
  });

  it("renders the suspended access state", () => {
    accessProfileMock.data = profileWithStatus("suspended");

    renderWaitingAccessPage();

    expect(screen.getByText("Acesso pausado")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seu acesso está pausado no momento." })).toBeInTheDocument();
  });

  it("renders the deactivated access state", () => {
    accessProfileMock.data = profileWithStatus("deactivated");

    renderWaitingAccessPage();

    expect(screen.getByText("Conta inativa")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Essa conta não está ativa para uso do Space Truck." })).toBeInTheDocument();
  });

  it("renders a missing-profile preparation state", () => {
    accessProfileMock.data = null;

    renderWaitingAccessPage();

    expect(screen.getByText("Perfil em preparação")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seu perfil ainda está sendo preparado." })).toBeInTheDocument();
  });

  it("redirects approved users back to the internal app", async () => {
    accessProfileMock.data = profileWithStatus("approved");

    renderWaitingAccessPage();

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("signs out from the waiting page", () => {
    renderWaitingAccessPage();

    fireEvent.click(screen.getByRole("button", { name: /Sair/i }));

    expect(mockedSignOut).toHaveBeenCalledTimes(1);
  });
});
