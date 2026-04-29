import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SupportTicketsPage from "@/pages/SupportTicketsPage";
import { listSupportTickets } from "@/features/help/supportTicketService";

const mockedNavigate = vi.fn();
const mockedToast = vi.fn();
const authMock = vi.hoisted(() => ({
  user: { id: "user-123", email: "motorista@spacetruck.test" } as { id: string; email: string } | null,
  session: null,
  loading: false,
  signOut: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockedNavigate,
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: authMock.user,
    session: authMock.session,
    loading: authMock.loading,
    signOut: authMock.signOut,
  }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockedToast }),
}));

vi.mock("@/features/help/supportTicketService", () => ({
  listSupportTickets: vi.fn(),
}));

const mockedListSupportTickets = vi.mocked(listSupportTickets);

const ticket = {
  id: "ticket-1",
  ticket_number: "ST-123",
  title: "Ajuda com viagem",
  message: "Preciso entender uma solicitação aberta.",
  status: "open",
  priority: "normal",
  preferred_channel: "app",
  created_at: "2026-04-29T10:00:00Z",
  updated_at: "2026-04-29T10:00:00Z",
};

beforeEach(() => {
  authMock.user = { id: "user-123", email: "motorista@spacetruck.test" };
  authMock.session = null;
  authMock.loading = false;
  authMock.signOut.mockReset();
  mockedNavigate.mockClear();
  mockedToast.mockClear();
  mockedListSupportTickets.mockReset();
  mockedListSupportTickets.mockResolvedValue([ticket]);
});

describe("SupportTicketsPage", () => {
  it("shows loading state and then renders ticket history", async () => {
    render(<SupportTicketsPage />);

    expect(screen.getByText("Carregando suas solicitações...")).toBeInTheDocument();

    expect(await screen.findByText("ST-123")).toBeInTheDocument();
    expect(screen.getByText("Ajuda com viagem")).toBeInTheDocument();
    expect(screen.getByText("Aberto")).toBeInTheDocument();
    expect(mockedListSupportTickets).toHaveBeenCalledWith("user-123");
  });

  it("shows an empty state when the user has no tickets", async () => {
    mockedListSupportTickets.mockResolvedValueOnce([]);

    render(<SupportTicketsPage />);

    expect(await screen.findByText("Nenhum ticket ainda")).toBeInTheDocument();
    expect(screen.getByText("Quando você abrir uma solicitação, ela vai aparecer aqui.")).toBeInTheDocument();
  });

  it("refreshes the ticket list when the user taps update", async () => {
    mockedListSupportTickets.mockResolvedValueOnce([]).mockResolvedValueOnce([ticket]);

    render(<SupportTicketsPage />);

    expect(await screen.findByText("Nenhum ticket ainda")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Atualizar/i }));

    await waitFor(() => {
      expect(mockedListSupportTickets).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("ST-123")).toBeInTheDocument();
  });

  it("shows a safe toast when loading fails", async () => {
    mockedListSupportTickets.mockRejectedValueOnce(new Error("Falha ao carregar"));

    render(<SupportTicketsPage />);

    await waitFor(() => {
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Não deu para carregar",
          description: "Falha ao carregar",
          variant: "destructive",
        }),
      );
    });
  });

  it("does not fetch tickets without an authenticated user", async () => {
    authMock.user = null;

    render(<SupportTicketsPage />);

    expect(await screen.findByText("Nenhum ticket ainda")).toBeInTheDocument();
    expect(mockedListSupportTickets).not.toHaveBeenCalled();
  });

  it("navigates back to help center", () => {
    render(<SupportTicketsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Voltar para ajuda/i }));

    expect(mockedNavigate).toHaveBeenCalledWith("/help");
  });
});
