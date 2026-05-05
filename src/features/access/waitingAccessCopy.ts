import type { IconDefinition } from "@/lib/icons";
import type { AccessStatus } from "./accessTypes";
import { iconAlertTriangle, iconCheckCircle } from "@/lib/icons";

export type WaitingAccessCopy = {
  badge: string;
  heading: string;
  message: string;
  badgeTone: string;
  iconTone: string;
  icon: IconDefinition;
};

export function getWaitingAccessCopy(status: AccessStatus | undefined): WaitingAccessCopy {
  switch (status) {
    case "approved":
      return {
        badge: "Acesso liberado",
        heading: "Seu acesso já está aprovado.",
        message: "Você já pode entrar no Space Truck. Vamos te levar para a área interna do app.",
        badgeTone: "border-profit/25 bg-profit/10 text-profit",
        iconTone: "text-profit",
        icon: iconCheckCircle,
      };
    case "suspended":
      return {
        badge: "Acesso pausado",
        heading: "Seu acesso está pausado no momento.",
        message: "Quando houver atualização, você será avisado pelos canais cadastrados.",
        badgeTone: "border-warning/25 bg-warning/10 text-warning",
        iconTone: "text-warning",
        icon: iconAlertTriangle,
      };
    case "blocked":
      return {
        badge: "Acesso não liberado",
        heading: "Seu acesso não está liberado.",
        message: "Entre em contato com o suporte se achar que isso foi um engano.",
        badgeTone: "border-destructive/25 bg-destructive/10 text-destructive",
        iconTone: "text-destructive",
        icon: iconAlertTriangle,
      };
    case "deactivated":
      return {
        badge: "Conta inativa",
        heading: "Essa conta não está ativa para uso do Space Truck.",
        message: "Se precisar voltar a usar o app, entre em contato com o suporte quando disponível.",
        badgeTone: "border-muted-foreground/25 bg-secondary/60 text-muted-foreground",
        iconTone: "text-muted-foreground",
        icon: iconAlertTriangle,
      };
    case "waitlisted":
      return {
        badge: "Pré-registro confirmado",
        heading: "Você está na fila de acesso do Space Truck.",
        message: "Seu pré-registro está confirmado. O Space Truck ainda está em acesso controlado e você será avisado quando sua liberação chegar.",
        badgeTone: "border-profit/25 bg-profit/10 text-profit",
        iconTone: "text-profit",
        icon: iconCheckCircle,
      };
    case undefined:
      return {
        badge: "Perfil em preparação",
        heading: "Seu perfil ainda está sendo preparado.",
        message: "Não encontramos o status de acesso dessa conta ainda. Tente novamente em instantes ou saia e entre de novo.",
        badgeTone: "border-warning/25 bg-warning/10 text-warning",
        iconTone: "text-warning",
        icon: iconAlertTriangle,
      };
    default: {
      const exhaustiveStatus: never = status;
      return exhaustiveStatus;
    }
  }
}
