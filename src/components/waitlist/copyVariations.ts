/**
 * Variações de copy para teste rápido na landing page.
 * Cada opção tem um id curto (A/B/C) e o texto completo.
 */

export type HeadlineId = "A" | "B" | "C";
export type SubtitleId = "1" | "2";
export type CtaId = "1" | "2" | "3";

export const HEADLINES: Record<HeadlineId, string> = {
  A: "Pare de perder dinheiro na estrada. O controle total do seu caminhão chegou.",
  B: "Esqueça o caderno de anotações. A gestão da sua frota e dos seus fretes, direto no celular.",
  C: "O futuro do transporte rodoviário está carregando. Seja o primeiro a embarcar.",
};

export const SUBTITLES: Record<SubtitleId, string> = {
  "1":
    "O Space Truck está em fase final de desenvolvimento. Cadastre-se na lista de espera exclusiva e garanta acesso antecipado gratuito.",
  "2":
    "Feito para quem vive na estrada. Entre para a lista VIP de pioneiros e ajude a moldar o melhor app de gestão para caminhoneiros.",
};

export const CTAS: Record<CtaId, string> = {
  "1": "Quero meu Acesso Antecipado",
  "2": "Entrar para a Lista VIP",
  "3": "Garantir minha vaga no Beta",
};

export interface CopyVariation {
  headline: HeadlineId;
  subtitle: SubtitleId;
  cta: CtaId;
}

export const DEFAULT_VARIATION: CopyVariation = {
  headline: "A",
  subtitle: "1",
  cta: "1",
};

export const HEADLINE_OPTIONS = (Object.keys(HEADLINES) as HeadlineId[]).map((id) => ({
  id,
  preview: HEADLINES[id],
}));

export const SUBTITLE_OPTIONS = (Object.keys(SUBTITLES) as SubtitleId[]).map((id) => ({
  id,
  preview: SUBTITLES[id],
}));

export const CTA_OPTIONS = (Object.keys(CTAS) as CtaId[]).map((id) => ({
  id,
  preview: CTAS[id],
}));
