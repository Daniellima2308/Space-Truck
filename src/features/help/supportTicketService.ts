import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { SupportTicketDraft } from "@/features/help/supportTicketModel";

export type CreateSupportTicketInput = SupportTicketDraft & {
  userId: string;
};

export type CreateSupportTicketResult = {
  id: string;
  ticket_number: string;
};

export type SupportTicketListItem = Pick<
  Tables<"support_tickets">,
  | "id"
  | "ticket_number"
  | "title"
  | "message"
  | "status"
  | "priority"
  | "preferred_channel"
  | "created_at"
  | "updated_at"
>;

const SUPPORT_TICKET_CREATE_ERROR = "Não foi possível abrir a solicitação. Tente novamente em instantes.";
const SUPPORT_TICKET_LIST_ERROR = "Não foi possível carregar suas solicitações. Tente novamente em instantes.";
const WHATSAPP_PHONE_MIN_DIGITS = 10;
const WHATSAPP_PHONE_MAX_DIGITS = 15;
const SUPPORT_TICKET_LIST_LIMIT = 20;

const normalizeWhatsAppPhone = (value?: string | null) => value?.replace(/\D/g, "") ?? "";

const isValidWhatsAppPhone = (value: string) =>
  value.length >= WHATSAPP_PHONE_MIN_DIGITS && value.length <= WHATSAPP_PHONE_MAX_DIGITS;

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<CreateSupportTicketResult> {
  const normalizedWhatsappPhone = normalizeWhatsAppPhone(input.whatsapp_phone);
  const hasValidWhatsAppPhone = isValidWhatsAppPhone(normalizedWhatsappPhone);

  if (input.preferred_channel === "whatsapp" && (!hasValidWhatsAppPhone || !input.whatsapp_consent)) {
    throw new Error("Informe WhatsApp válido e autorize o contato para esse canal.");
  }

  const payload: TablesInsert<"support_tickets"> = {
    user_id: input.userId,
    type: input.type,
    category: input.category,
    title: input.title.trim(),
    message: input.message.trim(),
    preferred_channel: input.preferred_channel,
    contact_email: input.contact_email?.trim() || null,
    whatsapp_phone: hasValidWhatsAppPhone ? normalizedWhatsappPhone : null,
    whatsapp_consent: input.whatsapp_consent ?? false,
    app_version: input.app_version?.trim() || null,
    device_info: input.device_info ?? {},
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("support_tickets")
    .insert(payload)
    .select("id, ticket_number")
    .single();

  if (error) {
    throw new Error(SUPPORT_TICKET_CREATE_ERROR);
  }

  if (!data) {
    throw new Error("Não foi possível confirmar a solicitação.");
  }

  return data;
}

export async function listSupportTickets(userId: string): Promise<SupportTicketListItem[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, ticket_number, title, message, status, priority, preferred_channel, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(SUPPORT_TICKET_LIST_LIMIT);

  if (error) {
    throw new Error(SUPPORT_TICKET_LIST_ERROR);
  }

  return data ?? [];
}
