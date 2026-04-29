import { describe, expect, it } from "vitest";
import { supportRequestFlows } from "@/features/help/supportRequestOptions";
import {
  buildSupportTicketDraft,
  canSubmitSupportTicketRequest,
  getEffectiveSupportTicketChannel,
  getSupportTicketSubmitErrorMessage,
  requiresWhatsAppContact,
  type SupportTicketRequestState,
} from "@/features/help/supportTicketRequest";

const supportFlow = supportRequestFlows.find((flow) => flow.id === "suporte")!;
const whatsappFlow = supportRequestFlows.find((flow) => flow.id === "whatsapp")!;

const baseState: SupportTicketRequestState = {
  userId: "user-123",
  userEmail: "motorista@spacetruck.test",
  flow: supportFlow,
  category: "other",
  categoryLabel: "Outro assunto",
  channel: "app",
  message: "Preciso de ajuda com o app.",
  whatsApp: "",
  allowsWhatsAppContact: false,
};

describe("supportTicketRequest rules", () => {
  it("allows a standard app support request when the message and user are valid", () => {
    expect(canSubmitSupportTicketRequest(baseState)).toBe(true);
  });

  it("blocks submission without an authenticated user", () => {
    expect(canSubmitSupportTicketRequest({ ...baseState, userId: null })).toBe(false);
  });

  it("requires WhatsApp phone and consent when the selected channel is WhatsApp", () => {
    const state = { ...baseState, channel: "whatsapp" as const, whatsApp: "51999999999" };

    expect(requiresWhatsAppContact(state.flow, state.channel)).toBe(true);
    expect(canSubmitSupportTicketRequest({ ...state, allowsWhatsAppContact: false })).toBe(false);
    expect(canSubmitSupportTicketRequest({ ...state, allowsWhatsAppContact: true })).toBe(true);
  });

  it("forces WhatsApp as the effective channel for the WhatsApp request flow", () => {
    expect(getEffectiveSupportTicketChannel(whatsappFlow, "email")).toBe("whatsapp");
    expect(requiresWhatsAppContact(whatsappFlow, "email")).toBe(true);
  });

  it("builds a normalized standard ticket draft", () => {
    expect(buildSupportTicketDraft({ ...baseState, message: "  Mensagem com espaço.  " })).toEqual({
      type: "support",
      category: "other",
      title: "Falar com suporte — Outro assunto",
      message: "Mensagem com espaço.",
      preferred_channel: "app",
      contact_email: "motorista@spacetruck.test",
      whatsapp_phone: null,
      whatsapp_consent: false,
      metadata: { flowId: "suporte" },
    });
  });

  it("builds a WhatsApp draft with phone and consent from the request state", () => {
    expect(
      buildSupportTicketDraft({
        ...baseState,
        flow: whatsappFlow,
        channel: "email",
        whatsApp: " 51999999999 ",
        allowsWhatsAppContact: true,
      }),
    ).toEqual(
      expect.objectContaining({
        type: "whatsapp_request",
        preferred_channel: "whatsapp",
        whatsapp_phone: "51999999999",
        whatsapp_consent: true,
        metadata: { flowId: "whatsapp" },
      }),
    );
  });

  it("only treats network-like TypeErrors as connection problems", () => {
    expect(getSupportTicketSubmitErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "Parece que houve um problema de conexão. Verifique sua internet e tente novamente.",
    );
    expect(getSupportTicketSubmitErrorMessage(new TypeError("Cannot read properties of null"))).toBe(
      "Não foi possível enviar sua solicitação. Tente novamente em instantes.",
    );
  });
});
