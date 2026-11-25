import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { expect, it, vi } from "vitest";
import App from "@/App";
import type { Trip } from "@/types";

vi.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: PropsWithChildren) => children,
}));
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: { id: "motorista-1" }, loading: false }),
}));
vi.mock("@/features/access/useAccessProfile", () => ({
  useAccessProfile: () => ({ data: { role: "user", accessStatus: "approved" } }),
}));
vi.mock("@/components/OnboardingTour", () => ({ OnboardingTour: () => null }));
vi.mock("@/context/AppContext", () => ({
  AppProvider: ({ children }: PropsWithChildren) => children,
}));
vi.mock("@/context/app-context", () => {
  const trip: Trip = {
    id: "123",
    vehicleId: "veiculo-1",
    status: "open",
    estimatedDistance: 300,
    createdAt: "2026-11-17T12:00:00Z",
    freights: [],
    fuelings: [],
    expenses: [],
    personalExpenses: [],
  };
  return { useApp: () => ({ data: { trips: [trip], vehicles: [], maintenanceServices: [] } }) };
});

it("abre a viagem pelo ID no link direto de um motorista com acesso aprovado", async () => {
  window.history.replaceState(null, "", "/app/trip/123");
  try {
    render(<App />);
    expect(await screen.findByText("Viagem em andamento")).toBeVisible();
  } finally {
    window.history.replaceState(null, "", "/");
  }
});
