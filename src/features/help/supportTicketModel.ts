export const supportTicketTypes = ["support", "suggestion", "bug", "whatsapp_request"] as const;
export const supportTicketCategories = [
  "account",
  "trip",
  "freight",
  "fueling",
  "expenses",
  "maintenance",
  "finance",
  "route",
  "other",
] as const;
export const supportTicketChannels = ["app", "email", "whatsapp"] as const;
export const supportTicketStatuses = ["open", "in_review", "waiting_contact", "answered", "closed"] as const;
export const supportTicketPriorities = ["low", "normal", "high", "urgent"] as const;

export const SUPPORT_TICKET_MESSAGE_MIN_LENGTH = 10;
export const SUPPORT_TICKET_MESSAGE_MAX_LENGTH = 2000;
export const SUPPORT_TICKET_TITLE_MAX_LENGTH = 120;
export const SUPPORT_TICKET_APP_VERSION_MAX_LENGTH = 40;
export const SUPPORT_TICKET_SOURCE_MAX_LENGTH = 80;

export type SupportTicketType = (typeof supportTicketTypes)[number];
export type SupportTicketCategory = (typeof supportTicketCategories)[number];
export type SupportTicketChannel = (typeof supportTicketChannels)[number];
export type SupportTicketStatus = (typeof supportTicketStatuses)[number];
export type SupportTicketPriority = (typeof supportTicketPriorities)[number];

type SupportTicketDraftBase = {
  type: SupportTicketType;
  category: SupportTicketCategory;
  title: string;
  message: string;
  contact_email?: string | null;
  app_version?: string | null;
  device_info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type SupportTicketDraftStandard = SupportTicketDraftBase & {
  preferred_channel: Exclude<SupportTicketChannel, "whatsapp">;
  whatsapp_phone?: string | null;
  whatsapp_consent?: boolean;
};

type SupportTicketDraftWhatsApp = SupportTicketDraftBase & {
  preferred_channel: "whatsapp";
  whatsapp_phone: string;
  whatsapp_consent: true;
};

export type SupportTicketDraft = SupportTicketDraftStandard | SupportTicketDraftWhatsApp;
