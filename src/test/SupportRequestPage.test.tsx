import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SupportRequestPage from "@/pages/SupportRequestPage";

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

const renderSupportRequest = (flowId: string) =>
  render(
    <MemoryRouter initialEntries={[`/help/solicitacao/${flowId}`]}>
      <Routes>
        <Route path="/help/solicitacao/:flowId" element={<SupportRequestPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("SupportRequestPage", () => {
  it("renders the support request flow with categories, channels and disabled submit by default", () => {
    renderSupportRequest("suporte");

    expect(screen.getByText("Falar com suporte")).toBeInTheDocument();
    expect(screen.getByText("Atendimento")).toBeInTheDocument();
    expect(screen.getByText("Conta e login")).toBeInTheDocument();
    expect(screen.getByText("Dentro do app")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Descreva sua dúvida/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preparar solicitação/i })).toBeDisabled();
  });

  it("enables the submit button when the message is valid", () => {
    renderSupportRequest("problema");

    fireEvent.change(screen.getByPlaceholderText(/Descreva o problema/i), {
      target: { value: "O app travou quando tentei finalizar a viagem." },
    });

    expect(screen.getByRole("button", { name: /Preparar solicitação/i })).not.toBeDisabled();
  });

  it("requires WhatsApp number and consent in the WhatsApp flow", () => {
    renderSupportRequest("whatsapp");

    const submitButton = screen.getByRole("button", { name: /Preparar solicitação/i });
    expect(screen.getByText("Contato por WhatsApp")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Ex: 51999999999"), {
      target: { value: "51999999999" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Explique o que você precisa/i), {
      target: { value: "Preciso de ajuda para entender uma viagem." },
    });

    expect(submitButton).not.toBeDisabled();
  });

  it("navigates back to the help center", () => {
    renderSupportRequest("sugestao");

    fireEvent.click(screen.getByRole("button", { name: /Voltar para ajuda/i }));

    expect(mockedNavigate).toHaveBeenCalledWith("/help");
  });
});
