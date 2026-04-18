import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import FreightAnalysisPage from "@/pages/FreightAnalysisPage";

vi.mock("@/components/CityAutocomplete", () => ({
  CityAutocomplete: ({ placeholder, value, onChange, className }: { placeholder: string; value: string; onChange: (v: string) => void; className?: string }) => (
    <input
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/lib/routeApi", () => ({
  getRouteInfo: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/tollApi", () => ({
  calculateToll: vi.fn().mockResolvedValue(null),
}));

describe("FreightAnalysisPage", () => {
  const setup = () =>
    render(
      <MemoryRouter>
        <FreightAnalysisPage />
      </MemoryRouter>,
    );

  it("mantém comissão inicial neutra (0) sem restaurar default 17", async () => {
    setup();

    const commissionInput = screen.getByPlaceholderText("Ex: 15%") as HTMLInputElement;
    expect(commissionInput.value).toBe("");

    fireEvent.change(screen.getByPlaceholderText("Automático ou manual"), { target: { value: "100" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: R$ 4.500,00"), { target: { value: "450000" } });

    await waitFor(() => {
      expect(screen.getByText("Termômetro do Frete")).toBeInTheDocument();
      const commissionCard = screen.getByText("Comissão").closest("div");
      expect(commissionCard).toBeTruthy();
      expect(commissionCard?.textContent).toMatch(/R\$\s*0,00/);
    });
  });

  it("aplica comissão digitada no cálculo quando usuário informar percentual", async () => {
    setup();

    fireEvent.change(screen.getByPlaceholderText("Automático ou manual"), { target: { value: "100" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: R$ 4.500,00"), { target: { value: "450000" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: 15%"), { target: { value: "10" } });

    await waitFor(() => {
      expect(screen.getByText("Termômetro do Frete")).toBeInTheDocument();
      const commissionCard = screen.getByText("Comissão").closest("div");
      expect(commissionCard).toBeTruthy();
      expect(commissionCard?.textContent).toMatch(/R\$\s*450,00/);
    });
  });
});
