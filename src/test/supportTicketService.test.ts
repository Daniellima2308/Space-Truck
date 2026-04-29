import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupportTicket } from "@/features/help/supportTicketService";

const supabaseMock = vi.hoisted(() => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));

  return { from, insert, select, single };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMock.from,
  },
}));

beforeEach(() => {
  supabaseMock.from.mockClear();
  supabaseMock.insert.mockClear();
  supabaseMock.select.mockClear();
  supabaseMock.single.mockReset();
});

describe("createSupportTicket", () => {
  it("inserts a trimmed support ticket and returns the created ticket reference", async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: { id: "ticket-1", ticket_number: "ST-123" }, error: null });

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

    expect(supabaseMock.from).toHaveBeenCalledWith("support_tickets");
    expect(supabaseMock.insert).toHaveBeenCalledWith(
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
    expect(supabaseMock.select).toHaveBeenCalledWith("id, ticket_number");
    expect(result).toEqual({ id: "ticket-1", ticket_number: "ST-123" });
  });

  it("normalizes a valid WhatsApp phone before inserting", async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: { id: "ticket-2", ticket_number: "ST-456" }, error: null });

    await createSupportTicket({
      userId: "user-123",
      type: "whatsapp_request",
      category: "other",
      title: "WhatsApp",
      message: "Preciso de atendimento pelo WhatsApp.",
      preferred_channel: "whatsapp",
      contact_email: "motorista@spacetruck.test",
      whatsapp_phone: "+55 (51) 99999-8888",
      whatsapp_consent: true,
    });

    expect(supabaseMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        preferred_channel: "whatsapp",
        whatsapp_phone: "5551999998888",
        whatsapp_consent: true,
      }),
    );
  });

  it("throws a safe error when Supabase returns an error", async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: { message: "RLS bloqueou" } });

    await expect(
      createSupportTicket({
        userId: "user-123",
        type: "bug",
        category: "trip",
        title: "Erro",
        message: "O app travou ao finalizar.",
        preferred_channel: "app",
      }),
    ).rejects.toThrow("Não foi possível abrir a solicitação. Tente novamente em instantes.");
  });

  it("throws a fallback error when no created ticket is returned", async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: null });

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

  it("rejects WhatsApp tickets without a phone before calling Supabase", async () => {
    await expect(
      createSupportTicket({
        userId: "user-123",
        type: "whatsapp_request",
        category: "other",
        title: "WhatsApp",
        message: "Preciso de atendimento pelo WhatsApp.",
        preferred_channel: "whatsapp",
        whatsapp_phone: "",
        whatsapp_consent: true,
      }),
    ).rejects.toThrow("Informe WhatsApp válido e autorize o contato para esse canal.");

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("rejects WhatsApp tickets with non-numeric placeholders before calling Supabase", async () => {
    await expect(
      createSupportTicket({
        userId: "user-123",
        type: "whatsapp_request",
        category: "other",
        title: "WhatsApp",
        message: "Preciso de atendimento pelo WhatsApp.",
        preferred_channel: "whatsapp",
        whatsapp_phone: "----------",
        whatsapp_consent: true,
      }),
    ).rejects.toThrow("Informe WhatsApp válido e autorize o contato para esse canal.");

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
