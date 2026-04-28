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

const renderHelpCenter = () =>
  render(
    <MemoryRouter>
      <HelpCenterPage />
    </MemoryRouter>,
  );

const getButtonByText = (text: string) => {
  const button = screen.getByText(text).closest("button");
  expect(button).not.toBeNull();
  return button as HTMLButtonElement;
};

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
    renderHelpCenter();

    expect(screen.getByText("Como podemos te ajudar?")).toBeInTheDocument();
    expect(screen.getByText("Ajuda com Bino")).toBeInTheDocument();
    expect(getButtonByText("Resolver problema rápido")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Falar com suporte/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Atendimento pelo WhatsApp/i })).toBeDisabled();
    expect(screen.getAllByText("Em breve")).toHaveLength(4);
    expect(screen.getByText(`${featuredTopics.length} tópicos`)).toBeInTheDocument();
    expect(screen.getByText(featuredTopics[0].title)).toBeInTheDocument();
    expect(screen.getByText(featuredTopics[1].title)).toBeInTheDocument();
  });

  it("navigates back to settings", () => {
    renderHelpCenter();

    fireEvent.click(screen.getByRole("button", { name: /^Voltar$/i }));

    expect(mockedNavigate).toHaveBeenCalledWith("/more");
  });

  it("scrolls to quick help when the quick problem action is clicked", () => {
    renderHelpCenter();

    fireEvent.click(getButtonByText("Resolver problema rápido"));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("opens quick help topic detail pages for featured topics", () => {
    renderHelpCenter();

    featuredTopics.forEach((topic) => {
      fireEvent.click(getButtonByText(topic.title));

      expect(mockedNavigate).toHaveBeenCalledWith(`/help/topico/${topic.id}`);
      mockedNavigate.mockClear();
    });
  });
});
