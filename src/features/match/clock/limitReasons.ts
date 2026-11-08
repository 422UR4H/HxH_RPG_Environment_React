import type { LimitReason } from "./clockMessages";

/** Por que o relógio não volta antes do limite, como o mestre lê (painel e Encerrar partida). */
export const LIMIT_REASON_COPY: Record<LimitReason, string> = {
  start: "início da partida",
  turn: "último turno",
  scene: "troca de cena",
  roundMode: "troca de regime",
  round: "último round",
};
