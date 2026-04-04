import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeHero } from "@/components/dashboard/HomeHero";

describe("HomeHero", () => {
  describe("scenario selection — correct title rendered per scenario", () => {
    it("onboarding: renders welcome title and 'Cadastrar Veículo' CTA", () => {
      render(<HomeHero scenario="onboarding" onCta={vi.fn()} />);
      expect(screen.getByText("Bem-vindo ao Space Truck")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cadastrar Veículo/i })).toBeInTheDocument();
    });

    it("active: renders 'Você está na estrada' and 'Continuar Operação' CTA", () => {
      render(<HomeHero scenario="active" onCta={vi.fn()} />);
      expect(screen.getByText("Você está na estrada")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Continuar Operação/i })).toBeInTheDocument();
    });

    it("ready-first: renders 'Tudo pronto para começar' and 'Nova Viagem' CTA", () => {
      render(<HomeHero scenario="ready-first" onCta={vi.fn()} />);
      expect(screen.getByText("Tudo pronto para começar")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Nova Viagem/i })).toBeInTheDocument();
    });

    it("ready-return: renders 'Pronto para nova viagem' and 'Nova Viagem' CTA", () => {
      render(<HomeHero scenario="ready-return" onCta={vi.fn()} />);
      expect(screen.getByText("Pronto para nova viagem")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Nova Viagem/i })).toBeInTheDocument();
    });
  });

  describe("active trip badge", () => {
    it("shows badge with count when scenario is active and activeTripsCount > 0", () => {
      render(<HomeHero scenario="active" activeTripsCount={2} onCta={vi.fn()} />);
      expect(screen.getByText("2 viagens ativas")).toBeInTheDocument();
    });

    it("shows singular 'viagem ativa' when count is 1", () => {
      render(<HomeHero scenario="active" activeTripsCount={1} onCta={vi.fn()} />);
      expect(screen.getByText("1 viagem ativa")).toBeInTheDocument();
    });

    it("does not show badge when scenario is not active", () => {
      render(<HomeHero scenario="ready-return" activeTripsCount={1} onCta={vi.fn()} />);
      expect(screen.queryByText(/viagem ativa/i)).not.toBeInTheDocument();
    });
  });

  describe("CTA handler", () => {
    it("calls onCta when the CTA button is clicked", () => {
      const onCta = vi.fn();
      render(<HomeHero scenario="ready-first" onCta={onCta} />);
      fireEvent.click(screen.getByRole("button", { name: /Nova Viagem/i }));
      expect(onCta).toHaveBeenCalledTimes(1);
    });
  });
});
