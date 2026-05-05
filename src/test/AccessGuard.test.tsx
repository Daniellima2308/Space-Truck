import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessGuard } from "@/components/AccessGuard";
import type { AccessProfile } from "@/features/access/accessTypes";

const authMock = vi.hoisted(() => ({
  user: { id: "user-123", email: "driver@spacetruck.test" } as { id: string; email: string } | null,
  loading: false,
}));

const accessProfileMock = vi.hoisted(() => ({
  data: null as AccessProfile | null,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: authMock.user,
    session: null,
    loading: authMock.loading,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/features/access/useAccessProfile", () => ({
  useAccessProfile: () => accessProfileMock,
}));

vi.mock("@/lib/devPreview", () => ({
  isDevPreviewActive: () => false,
}));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <AccessGuard>
              <div>Área interna liberada</div>
            </AccessGuard>
          }
        />
        <Route path="/login" element={<div>Tela de login</div>} />
        <Route path="/aguardando" element={<div>Fila de espera</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AccessGuard", () => {
  beforeEach(() => {
    authMock.user = { id: "user-123", email: "driver@spacetruck.test" };
    authMock.loading = false;
    accessProfileMock.data = null;
    accessProfileMock.isLoading = false;
    accessProfileMock.isFetching = false;
    accessProfileMock.isError = false;
    accessProfileMock.refetch.mockReset();
  });

  it("renders protected content for approved users", () => {
    accessProfileMock.data = {
      userId: "user-123",
      role: "admin",
      accessStatus: "approved",
      accessStatusReason: null,
      approvedAt: "2026-05-04T00:00:00Z",
      approvedBy: "user-123",
    };

    renderGuard();

    expect(screen.getByText("Área interna liberada")).toBeInTheDocument();
  });

  it("keeps approved cached users inside the app during a background refetch error", () => {
    accessProfileMock.isError = true;
    accessProfileMock.isFetching = true;
    accessProfileMock.data = {
      userId: "user-123",
      role: "admin",
      accessStatus: "approved",
      accessStatusReason: null,
      approvedAt: "2026-05-04T00:00:00Z",
      approvedBy: "user-123",
    };

    renderGuard();

    expect(screen.getByText("Área interna liberada")).toBeInTheDocument();
  });

  it("redirects waitlisted users to the waiting page", () => {
    accessProfileMock.data = {
      userId: "user-123",
      role: "user",
      accessStatus: "waitlisted",
      accessStatusReason: "signup_waitlist",
      approvedAt: null,
      approvedBy: null,
    };

    renderGuard();

    expect(screen.getByText("Fila de espera")).toBeInTheDocument();
  });

  it("shows a retryable error when the access profile query fails without cached approved data", () => {
    accessProfileMock.isError = true;

    renderGuard();

    expect(screen.getByText("Não foi possível verificar seu acesso.")).toBeInTheDocument();
    expect(screen.queryByText("Fila de espera")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    expect(accessProfileMock.refetch).toHaveBeenCalledTimes(1);
  });

  it("redirects unauthenticated users to login", () => {
    authMock.user = null;

    renderGuard();

    expect(screen.getByText("Tela de login")).toBeInTheDocument();
  });

  it("shows loading while access profile is loading", () => {
    accessProfileMock.isLoading = true;

    const { container } = renderGuard();

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
