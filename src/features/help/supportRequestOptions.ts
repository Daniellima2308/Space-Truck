export type SupportRequestFlowId = "suporte" | "whatsapp" | "problema" | "sugestao";

export type SupportRequestChannel = "app" | "email" | "whatsapp";

export type SupportRequestCategory =
  | "account"
  | "trip"
  | "freight"
  | "fueling"
  | "expenses"
  | "maintenance"
  | "finance"
  | "route"
  | "bug"
  | "suggestion"
  | "other";

export type SupportRequestFlow = {
  id: SupportRequestFlowId;
  title: string;
  badge: string;
  description: string;
  messagePlaceholder: string;
  defaultCategory: SupportRequestCategory;
  defaultChannel: SupportRequestChannel;
  requiresWhatsApp: boolean;
};

export type SupportRequestCategoryOption = {
  id: SupportRequestCategory;
  label: string;
};

export type SupportRequestChannelOption = {
  id: SupportRequestChannel;
  label: string;
  description: string;
};

export const supportRequestFlows: SupportRequestFlow[] = [
  {
    id: "suporte",
    title: "Falar com suporte",
    badge: "Atendimento",
    description: "Conte o que aconteceu para nossa equipe analisar e orientar o próximo passo.",
    messagePlaceholder: "Descreva sua dúvida ou dificuldade com o máximo de contexto possível...",
    defaultCategory: "other",
    defaultChannel: "app",
    requiresWhatsApp: false,
  },
  {
    id: "whatsapp",
    title: "Atendimento pelo WhatsApp",
    badge: "Retorno manual",
    description: "Informe o motivo e o WhatsApp para o suporte Space Truck chamar você manualmente.",
    messagePlaceholder: "Explique o que você precisa resolver pelo WhatsApp...",
    defaultCategory: "other",
    defaultChannel: "whatsapp",
    requiresWhatsApp: true,
  },
  {
    id: "problema",
    title: "Reportar problema",
    badge: "Erro no app",
    description: "Avise sobre erro, travamento, cálculo estranho ou algo que não funcionou como deveria.",
    messagePlaceholder: "Descreva o problema, onde aconteceu e o que você estava tentando fazer...",
    defaultCategory: "bug",
    defaultChannel: "app",
    requiresWhatsApp: false,
  },
  {
    id: "sugestao",
    title: "Enviar sugestão",
    badge: "Ideia de melhoria",
    description: "Compartilhe uma ideia para melhorar o Space Truck na rotina da estrada.",
    messagePlaceholder: "Conte sua sugestão e por que ela ajudaria na sua operação...",
    defaultCategory: "suggestion",
    defaultChannel: "app",
    requiresWhatsApp: false,
  },
];

export const supportRequestCategories: SupportRequestCategoryOption[] = [
  { id: "account", label: "Conta e login" },
  { id: "trip", label: "Viagem e frete" },
  { id: "fueling", label: "Abastecimento" },
  { id: "expenses", label: "Despesas" },
  { id: "maintenance", label: "Manutenção e veículos" },
  { id: "finance", label: "Financeiro" },
  { id: "route", label: "Rotas, distância ou pedágio" },
  { id: "bug", label: "Erro no app" },
  { id: "suggestion", label: "Sugestão" },
  { id: "other", label: "Outro assunto" },
];

export const supportRequestChannels: SupportRequestChannelOption[] = [
  {
    id: "app",
    label: "Dentro do app",
    description: "Resposta pelo histórico da solicitação quando o chat estiver ativo.",
  },
  {
    id: "email",
    label: "E-mail",
    description: "Resposta no e-mail cadastrado na conta.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Pedido para o suporte chamar você manualmente.",
  },
];

export const findSupportRequestFlow = (flowId?: string) =>
  supportRequestFlows.find((flow) => flow.id === flowId) ?? supportRequestFlows[0];
