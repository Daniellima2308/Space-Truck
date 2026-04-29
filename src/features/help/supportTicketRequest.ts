import type {
  SupportRequestCategory,
  SupportRequestChannel,
  SupportRequestFlow,
} from "@/features/help/supportRequestOptions";
import {
  SUPPORT_TICKET_MESSAGE_MAX_LENGTH,
  SUPPORT_TICKET_MESSAGE_MIN_LENGTH,
  type SupportTicketDraft,
} from "@/features/help/supportTicketModel";

export type SupportTicketRequestState = {
  userId?: string | null;
  userEmail?: string | null;
  flow: SupportRequestFlow;
  category: SupportRequestCategory;
  categoryLabel: string;
  channel: SupportRequestChannel;
  message: string;
  whatsApp: string;
  allowsWhatsAppContact: boolean;
};

export const createSupportTicketTitle = (flowTitle: string, categoryLabel: string) =>
  `${flowTitle} — ${categoryLabel}`;

export const requiresWhatsAppContact = (flow: SupportRequestFlow, channel: SupportRequestChannel) =>
  flow.requiresWhatsApp || channel === "whatsapp";

export const getEffectiveSupportTicketChannel = (
  flow: SupportRequestFlow,
  channel: SupportRequestChannel,
): SupportRequestChannel => (flow.requiresWhatsApp ? "whatsapp" : channel);

export const getSupportTicketMessageLength = (message: string) => message.trim().length;

export const canSubmitSupportTicketRequest = ({
  userId,
  flow,
  channel,
  message,
  whatsApp,
  allowsWhatsAppContact,
}: SupportTicketRequestState) => {
  const messageLength = getSupportTicketMessageLength(message);
  const needsWhatsApp = requiresWhatsAppContact(flow, channel);

  return (
    Boolean(userId) &&
    messageLength >= SUPPORT_TICKET_MESSAGE_MIN_LENGTH &&
    messageLength <= SUPPORT_TICKET_MESSAGE_MAX_LENGTH &&
    (!needsWhatsApp || (whatsApp.trim().length >= 10 && allowsWhatsAppContact))
  );
};

export const buildSupportTicketDraft = (state: SupportTicketRequestState): SupportTicketDraft => {
  const preferredChannel = getEffectiveSupportTicketChannel(state.flow, state.channel);
  const base = {
    type: state.flow.ticketType,
    category: state.category,
    title: createSupportTicketTitle(state.flow.title, state.categoryLabel),
    message: state.message.trim(),
    contact_email: state.userEmail ?? null,
    metadata: { flowId: state.flow.id },
  };

  if (preferredChannel === "whatsapp") {
    return {
      ...base,
      preferred_channel: "whatsapp",
      whatsapp_phone: state.whatsApp.trim(),
      whatsapp_consent: state.allowsWhatsAppContact,
    };
  }

  return {
    ...base,
    preferred_channel: preferredChannel,
    whatsapp_phone: null,
    whatsapp_consent: false,
  };
};

export const getSupportTicketSubmitErrorMessage = (error: unknown) => {
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "Parece que houve um problema de conexão. Verifique sua internet e tente novamente.";
  }

  return "Não foi possível enviar sua solicitação. Tente novamente em instantes.";
};
