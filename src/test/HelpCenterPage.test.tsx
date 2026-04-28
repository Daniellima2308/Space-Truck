import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { helpTopics } from "@/features/help/helpTopics";
import HelpCenterPage from "@/pages/HelpCenterPage";

const scrollIntoView = vi.fn();
const mockedNavigate = vi.fn();
const featuredTopics = helpTopics.slice(0, 5);

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
    expect(screen.getByRole("button", { name: /Resolver problema rapido/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Falar com suporte/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Atendimento pelo WhatsApp/i })).toBeDisabled();
    expect(screen.getAllByText("Em breve")).toHaveLength(4);
    expect(screen.getByText(`${featuredTopics.length} tópicos`)).toBeInTheDocument();
    expect(screen.getByText("Não consigo finalizar uma viagem")).toBeInTheDocument();
    expect(screen.getByText("Meu lucro ou saldo parece errado")).toBeInTheDocument();
  });

  it("scrolls to quick help when the quick problem action is clicked", () => {
    render(
      <MemoryRouter>
        <HelpCenterPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Resolver problema rapido/i }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("opens quick help topic detail pages for featured topics", () => {
    render(
      <MemoryRouter>
        <HelpCenterPage />
      </MemoryRouter>,
    );

    featuredTopics.forEach((topic) => {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(topic.title, "i") }));

      expect(mockedNavigate).toHaveBeenCalledWith(`/help/topico/${topic.id}`);
      mockedNavigate.mockClear();
    });
  });
});
