import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import HelpTopicDetailPage from "@/pages/HelpTopicDetailPage";

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
    renderWithTopic("finish-trip");

    expect(screen.getByText("Não consigo finalizar uma viagem")).toBeInTheDocument();
    expect(screen.getByText("Passo a passo")).toBeInTheDocument();
    expect(screen.getByText(/Abra a viagem ativa/i)).toBeInTheDocument();
    expect(screen.getByText(/Confira se o veículo selecionado/i)).toBeInTheDocument();
    expect(screen.getByText("Isso resolveu?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sim, resolveu/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Não resolveu, falar com suporte/i })).toBeDisabled();
  });

  it("shows a friendly fallback when the topic does not exist", () => {
    renderWithTopic("nao-existe");

    expect(screen.getByText("Tópico não encontrado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abrir Central de Ajuda/i })).toBeInTheDocument();
  });
});
