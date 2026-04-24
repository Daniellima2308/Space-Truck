import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DashboardHistoryPreview } from "@/components/dashboard/DashboardHistoryPreview";

describe("DashboardHistoryPreview", () => {
  it("renderiza o estado vazio sem depender de viagens", () => {
    render(
      <MemoryRouter>
        <DashboardHistoryPreview trips={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Nenhuma viagem finalizada ainda")).toBeInTheDocument();
    expect(
      screen.getByText("Ao finalizar sua primeira viagem ela aparecerá aqui."),
    ).toBeInTheDocument();
  });

  it("usa fallback seguro quando trips não é informado", () => {
    render(
      <MemoryRouter>
        <DashboardHistoryPreview />
      </MemoryRouter>,
    );

    expect(screen.getByText("Nenhuma viagem finalizada ainda")).toBeInTheDocument();
  });
});
