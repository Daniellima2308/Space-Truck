import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUPPORT_REQUEST_ROUTE, createSupportRequestPath } from "@/features/help/supportRequestOptions";
import { createSupportTicket } from "@/features/help/supportTicketService";
import SupportRequestPage from "@/pages/SupportRequestPage";

const mockedNavigate = vi.fn();
const mockedToast = vi.fn();
const mockedUser = { id: "user-123", email: "motorista@spacetruck.test" };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: mockedUser }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockedToast }),
}));

vi.mock("@/features/help/supportTicketService", () => ({
  createSupportTicket: vi.fn(),
}));

const mockedCreateSupportTicket = vi.mocked(createSupportTicket);

beforeEach(() => {
  mockedNavigate.mockClear();
  mockedToast.mockClear();
  mockedCreateSupportTicket.mockReset();
  mockedCreateSupportTicket.mockResolvedValue({ id: "ticket-1", ticket_number: "ST-ABC123" });
});

const renderSupportRequest = (flowId: string) =>
  render(
    <MemoryRouter initialEntries={[createSupportRequestPath(flowId as never)]}>
      <Routes>
        <Route path={SUPPORT_REQUEST_ROUTE} element={<SupportRequestPage />} />
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
    expect(screen.getByRole("button", { name: /Enviar solicitação/i })).toBeDisabled();
  });

  it("enables the submit button when the message is valid", () => {
    renderSupportRequest("problema");

    fireEvent.change(screen.getByPlaceholderText(/Descreva o problema/i), {
      target: { value: "O app travou quando tentei finalizar a viagem." },
    });

    expect(screen.getByRole("button", { name: /Enviar solicitação/i })).not.toBeDisabled();
  });

  it("submits a support request ticket", async () => {
    renderSupportRequest("problema");

    fireEvent.click(screen.getByRole("button", { name: "Viagem e frete" }));
    fireEvent.change(screen.getByPlaceholderText(/Descreva o problema/i), {
      target: { value: "O app travou quando tentei finalizar a viagem." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar solicitação/i }));

    await waitFor(() => {
      expect(mockedCreateSupportTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          type: "bug",
          category: "trip",
          preferred_channel: "app",
          contact_email: "motorista@spacetruck.test",
          message: "O app travou quando tentei finalizar a viagem.",
          title: "Reportar problema — Viagem e frete",
          metadata: { flowId: "problema" },
        }),
      );
    });
    expect(await screen.findByText(/Ticket ST-ABC123 criado/i)).toBeInTheDocument();
    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Solicitação enviada" }),
    );
  });

  it("shows an error toast when ticket creation fails", async () => {
    mockedCreateSupportTicket.mockRejectedValueOnce(new Error("Falha no Supabase"));
    renderSupportRequest("sugestao");

    fireEvent.change(screen.getByPlaceholderText(/Conte sua sugestão/i), {
      target: { value: "Seria bom ter um atalho para ajuda no painel." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar solicitação/i }));

    await waitFor(() => {
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Não deu para enviar",
          description: "Falha no Supabase",
          variant: "destructive",
        }),
      );
    });
  });

  it("requires WhatsApp number and consent in the WhatsApp flow", () => {
    renderSupportRequest("whatsapp");

    const submitButton = screen.getByRole("button", { name: /Enviar solicitação/i });
    const consentCheckbox = screen.getByRole("checkbox", {
      name: /Autorizo o Space Truck a entrar em contato pelo WhatsApp/i,
    });
    expect(screen.getByText("Contato por WhatsApp")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Ex: 51999999999"), {
      target: { value: "51999999999" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Explique o que você precisa/i), {
      target: { value: "Preciso de ajuda para entender uma viagem." },
    });

    expect(submitButton).not.toBeDisabled();

    fireEvent.click(consentCheckbox);
    expect(submitButton).toBeDisabled();

    fireEvent.click(consentCheckbox);
    expect(submitButton).not.toBeDisabled();
  });

  it("uses WhatsApp validation only when the selected channel is WhatsApp", () => {
    renderSupportRequest("whatsapp");

    fireEvent.click(screen.getByRole("button", { name: /E-mail/i }));
    fireEvent.change(screen.getByPlaceholderText(/Explique o que você precisa/i), {
      target: { value: "Prefiro receber uma resposta por e-mail." },
    });

    expect(screen.queryByText("Contato por WhatsApp")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enviar solicitação/i })).not.toBeDisabled();
  });

  it("navigates back to the help center", () => {
    renderSupportRequest("sugestao");

    fireEvent.click(screen.getByRole("button", { name: /Voltar para ajuda/i }));

    expect(mockedNavigate).toHaveBeenCalledWith("/help");
  });
});
