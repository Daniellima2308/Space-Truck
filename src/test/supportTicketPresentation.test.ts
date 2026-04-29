import { describe, expect, it } from "vitest";
import {
  formatSupportTicketDate,
  getSupportTicketStatusLabel,
  getSupportTicketStatusTone,
  supportTicketStatusTone,
} from "@/features/help/supportTicketPresentation";

describe("support ticket presentation helpers", () => {
  it("returns translated labels for known statuses", () => {
    expect(getSupportTicketStatusLabel("open")).toBe("Aberto");
    expect(getSupportTicketStatusLabel("in_review")).toBe("Em análise");
    expect(getSupportTicketStatusLabel("waiting_contact")).toBe("Aguardando contato");
    expect(getSupportTicketStatusLabel("answered")).toBe("Respondido");
    expect(getSupportTicketStatusLabel("closed")).toBe("Fechado");
  });

  it("returns the raw status label for unknown statuses", () => {
    expect(getSupportTicketStatusLabel("custom_status")).toBe("custom_status");
  });

  it("returns a status tone for known and unknown statuses", () => {
    expect(getSupportTicketStatusTone("answered")).toBe(supportTicketStatusTone.answered);
    expect(getSupportTicketStatusTone("custom_status")).toBe(supportTicketStatusTone.open);
  });

  it("formats valid dates and protects against invalid dates", () => {
    expect(formatSupportTicketDate("invalid-date")).toBe("-");
    expect(formatSupportTicketDate("2026-04-29T10:00:00Z")).not.toBe("-");
  });
});
