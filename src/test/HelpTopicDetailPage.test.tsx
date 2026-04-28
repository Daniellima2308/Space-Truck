import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { helpTopics } from "@/features/help/helpTopics";
import HelpTopicDetailPage from "@/pages/HelpTopicDetailPage";

const mockedNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

beforeEach(() => {
  mockedNavigate.mockClear();
});

const renderWithTopic = (topicId: string) =>
  render(
    <MemoryRouter initialEntries={[`/help/topico/${topicId}`]}>
      <Routes>
        <Route path="/help/topico/:topicId" element={<HelpTopicDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("HelpTopicDetailPage", () => {
  it("renders the selected quick help topic with all steps", () => {
    const topic = helpTopics.find((item) => item.id === "finish-trip");
    expect(topic).toBeDefined();

    renderWithTopic("finish-trip");

    expect(screen.getByText("Não consigo finalizar uma viagem")).toBeInTheDocument();
    expect(screen.getByText("Passo a passo")).toBeInTheDocument();
    expect(screen.getByText(/Abra a viagem ativa/i)).toBeInTheDocument();
    expect(screen.getByText(/Confira se o veículo selecionado/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("help-topic-step")).toHaveLength(topic!.steps.length);
    expect(screen.getByText("Isso resolveu?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sim, resolveu/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Não resolveu, falar com suporte/i })).toBeDisabled();
  });

  it("navigates back to the help center from a valid topic", () => {
    renderWithTopic("finish-trip");

    fireEvent.click(screen.getByRole("button", { name: /Voltar para ajuda/i }));

    expect(mockedNavigate).toHaveBeenCalledWith("/help");
  });

  it("shows a friendly fallback when the topic does not exist", () => {
    renderWithTopic("nao-existe");

    expect(screen.getByText("Tópico não encontrado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abrir Central de Ajuda/i })).toBeInTheDocument();
  });

  it("navigates back to the help center from the missing topic fallback", () => {
    renderWithTopic("nao-existe");

    fireEvent.click(screen.getByRole("button", { name: /Abrir Central de Ajuda/i }));

    expect(mockedNavigate).toHaveBeenCalledWith("/help");
  });
});
