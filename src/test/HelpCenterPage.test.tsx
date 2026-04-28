import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HelpCenterPage from "@/pages/HelpCenterPage";

const scrollIntoView = vi.fn();

const mockedNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

beforeEach(() => {
  scrollIntoView.mockClear();
  mockedNavigate.mockClear();
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
});

describe("HelpCenterPage", () => {
  it("renders the help center hero, action cards and featured quick help topics", () => {
    render(
      <MemoryRouter>
        <HelpCenterPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Como podemos te ajudar?")).toBeInTheDocument();
    expect(screen.getByText("Ajuda com Bino")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resolver problema rápido/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Falar com suporte/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Atendimento pelo WhatsApp/i })).toBeDisabled();
    expect(screen.getAllByText("Em breve")).toHaveLength(4);
    expect(screen.getByText("5 tópicos")).toBeInTheDocument();
    expect(screen.getByText("Não consigo finalizar uma viagem")).toBeInTheDocument();
    expect(screen.getByText("Meu lucro ou saldo parece errado")).toBeInTheDocument();
  });

  it("scrolls to quick help when the quick problem action is clicked", () => {
    render(
      <MemoryRouter>
        <HelpCenterPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Resolver problema rápido/i }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("opens a quick help topic detail page", () => {
    render(
      <MemoryRouter>
        <HelpCenterPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Não consigo finalizar uma viagem/i }));

    expect(mockedNavigate).toHaveBeenCalledWith("/help/topico/finish-trip");
  });
});
