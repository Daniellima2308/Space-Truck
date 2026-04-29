import type { SupportTicketStatus } from "@/features/help/supportTicketModel";

export const supportTicketStatusLabels = {
  open: "Aberto",
  in_review: "Em análise",
  waiting_contact: "Aguardando contato",
  answered: "Respondido",
  closed: "Fechado",
} satisfies Record<SupportTicketStatus, string>;

export const supportTicketStatusTone = {
  open: "bg-primary/10 text-primary border-primary/20",
  in_review: "bg-info/10 text-info border-info/20",
  waiting_contact: "bg-warning/15 text-warning-foreground border-warning/20",
  answered: "bg-profit/10 text-profit border-profit/20",
  closed: "bg-muted text-muted-foreground border-border",
} satisfies Record<SupportTicketStatus, string>;

const ticketDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function isKnownSupportTicketStatus(status: string): status is SupportTicketStatus {
  return status in supportTicketStatusLabels;
}

export function getSupportTicketStatusLabel(status: string) {
  return isKnownSupportTicketStatus(status) ? supportTicketStatusLabels[status] : status;
}

export function getSupportTicketStatusTone(status: string) {
  return isKnownSupportTicketStatus(status) ? supportTicketStatusTone[status] : supportTicketStatusTone.open;
}

export function formatSupportTicketDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return ticketDateFormatter.format(date);
}
