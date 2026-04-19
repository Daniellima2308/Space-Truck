import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExpenseTab } from "@/components/trip/ExpenseTab";
import { Trip } from "@/types";

vi.mock("@/components/ReceiptUpload", () => ({
  ReceiptUpload: ({ onChange }: { onChange: (value?: string) => void }) => (
    <button type="button" onClick={() => onChange("https://recibo-despesa")}>mock-receipt-expense</button>
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

describe("ExpenseTab", () => {
  it("salva despesa nova com fallback de descrição da categoria", async () => {
    const addExpense = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpenseTab
        trip={tripBase}
        isOpen
        showForm
        setShowForm={vi.fn()}
        addExpense={addExpense}
        updateExpense={vi.fn().mockResolvedValue(undefined)}
        deleteExpense={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Valor (R$)"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("mock-receipt-expense"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar despesa" }));

    await waitFor(() => {
      expect(addExpense).toHaveBeenCalledWith(
        "trip-1",
        expect.objectContaining({
          category: "pedagio",
          description: "Pedágio",
          value: 123.45,
          receiptUrl: "https://recibo-despesa",
        }),
      );
    });
  });

  it("limpa valor zerado no blur e não envia despesa inválida", async () => {
    const addExpense = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpenseTab
        trip={tripBase}
        isOpen
        showForm
        setShowForm={vi.fn()}
        addExpense={addExpense}
        updateExpense={vi.fn().mockResolvedValue(undefined)}
        deleteExpense={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const valueInput = screen.getByPlaceholderText("Valor (R$)") as HTMLInputElement;
    fireEvent.focus(valueInput);
    fireEvent.blur(valueInput);
    expect(valueInput.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Salvar despesa" }));

    await waitFor(() => {
      expect(addExpense).not.toHaveBeenCalled();
    });
  });
});
