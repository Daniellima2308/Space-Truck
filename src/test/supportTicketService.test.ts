import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupportTicket } from "@/features/help/supportTicketService";
import { supabase } from "@/integrations/supabase/client";

const singleMock = vi.fn();
const selectMock = vi.fn(() => ({ single: singleMock }));
const insertMock = vi.fn(() => ({ select: selectMock }));
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
  },
}));

beforeEach(() => {
  fromMock.mockClear();
  insertMock.mockClear();
  selectMock.mockClear();
  singleMock.mockReset();
});

describe("createSupportTicket", () => {
  it("inserts a trimmed support ticket and returns the created ticket reference", async () => {
    singleMock.mockResolvedValueOnce({ data: { id: "ticket-1", ticket_number: "ST-123" }, error: null });

    const result = await createSupportTicket({
      userId: "user-123",
      type: "support",
      category: "other",
      title: "  Ajuda  ",
      message: "  Preciso de suporte no app.  ",
      preferred_channel: "email",
      contact_email: "  motorista@spacetruck.test  ",
      whatsapp_phone: null,
      whatsapp_consent: false,
      app_version: "  1.0.0  ",
      device_info: { platform: "android" },
      metadata: { flowId: "suporte" },
    });

    expect(supabase.from).toHaveBeenCalledWith("support_tickets");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        title: "Ajuda",
        message: "Preciso de suporte no app.",
        contact_email: "motorista@spacetruck.test",
        app_version: "1.0.0",
        device_info: { platform: "android" },
        metadata: { flowId: "suporte" },
      }),
    );
    expect(selectMock).toHaveBeenCalledWith("id, ticket_number");
    expect(result).toEqual({ id: "ticket-1", ticket_number: "ST-123" });
  });

  it("throws a readable error when Supabase returns an error", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: "RLS bloqueou" } });

    await expect(
      createSupportTicket({
        userId: "user-123",
        type: "bug",
        category: "trip",
        title: "Erro",
        message: "O app travou ao finalizar.",
        preferred_channel: "app",
      }),
    ).rejects.toThrow("RLS bloqueou");
  });

  it("throws a fallback error when no created ticket is returned", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      createSupportTicket({
        userId: "user-123",
        type: "suggestion",
        category: "other",
        title: "Sugestão",
        message: "Adicionar histórico de atendimento.",
        preferred_channel: "app",
      }),
    ).rejects.toThrow("Não foi possível confirmar a solicitação.");
  });
});
