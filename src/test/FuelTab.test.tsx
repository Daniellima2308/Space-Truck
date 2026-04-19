import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FuelTab } from "@/components/trip/FuelTab";
import { Trip } from "@/types";

vi.mock("@/components/ReceiptUpload", () => ({
  ReceiptUpload: ({ onChange }: { onChange: (value?: string) => void }) => (
    <button type="button" onClick={() => onChange("https://recibo")}>mock-receipt</button>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (next: boolean) => void; id?: string }) => (
    <input
      id={id}
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

const tripBase: Trip = {
  id: "trip-1",
  vehicleId: "vehicle-1",
  status: "open",
  freights: [],
  fuelings: [],
  expenses: [],
  personalExpenses: [],
  createdAt: new Date().toISOString(),
  estimatedDistance: 0,
};

describe("FuelTab", () => {
  it("salva abastecimento novo com parsing correto dos campos", async () => {
    const addFueling = vi.fn().mockResolvedValue(undefined);
    render(
      <FuelTab
        trip={tripBase}
        isOpen
        addFueling={addFueling}
        updateFueling={vi.fn().mockResolvedValue(undefined)}
        deleteFueling={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Adicionar abastecimento/i }));
    fireEvent.change(screen.getByPlaceholderText("Nome do Posto"), { target: { value: "Posto BR" } });
    fireEvent.change(screen.getByPlaceholderText("Valor Total (R$)"), { target: { value: "123456" } });
    fireEvent.change(screen.getByPlaceholderText("Litros"), { target: { value: "505" } });
    fireEvent.change(screen.getByPlaceholderText("Odômetro Atual (KM)"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("mock-receipt"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar abastecimento" }));

    await waitFor(() => {
      expect(addFueling).toHaveBeenCalledWith(
        "trip-1",
        expect.objectContaining({
          stationName: "Posto BR",
          totalValue: 1234.56,
          liters: 505,
          kmCurrent: 12345,
          receiptUrl: "https://recibo",
        }),
      );
    });
  });

  it("limpa valor zerado no blur e bloqueia submit inválido", async () => {
    const addFueling = vi.fn().mockResolvedValue(undefined);
    render(
      <FuelTab
        trip={tripBase}
        isOpen
        addFueling={addFueling}
        updateFueling={vi.fn().mockResolvedValue(undefined)}
        deleteFueling={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Adicionar abastecimento/i }));
    const valueInput = screen.getByPlaceholderText("Valor Total (R$)") as HTMLInputElement;
    fireEvent.focus(valueInput);
    fireEvent.blur(valueInput);
    expect(valueInput.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Salvar abastecimento" }));
    await waitFor(() => {
      expect(addFueling).not.toHaveBeenCalled();
    });
  });
});
