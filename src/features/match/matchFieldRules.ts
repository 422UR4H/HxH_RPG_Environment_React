import { MATCH_LIMITS, SESSION_MAX_MONTHS } from "../../constants/fieldLimits";
import { todayLocalISODate } from "../../utils/date";

export const SESSION_IN_PAST = "Escolha um horário a partir de agora.";
export const SESSION_PASSED_NOTICE = "A data desta sessão já passou. Escolha uma nova data para reagendar.";
export const SESSION_TOO_FAR = `A sessão deve ser nos próximos ${SESSION_MAX_MONTHS} meses.`;
export const MATCH_TITLE_TOO_SHORT = `O título deve ter pelo menos ${MATCH_LIMITS.title.min} caracteres.`;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Erro da sessão (`AAAA-MM-DDTHH:mm`, horário local) comparada como instante, nunca pelos dígitos. */
export function sessionTimeError(local: string, now: Date = new Date()): string | null {
  const at = new Date(local);
  if (Number.isNaN(at.getTime())) return null;
  if (at < now) return SESSION_IN_PAST;
  if (at > addMonths(now, SESSION_MAX_MONTHS)) return SESSION_TOO_FAR;
  return null;
}

/** A sessão carregada (`AAAA-MM-DDTHH:mm`, horário local) já passou? */
export function sessionHasPassed(local: string, now: Date = new Date()): boolean {
  const at = new Date(local);
  return !Number.isNaN(at.getTime()) && at < now;
}

/** `min`/`max` (dia) para o calendário da sessão: de hoje até daqui a 12 meses. */
export function sessionDayBounds(now: Date = new Date()): { min: string; max: string } {
  return { min: todayLocalISODate(now), max: todayLocalISODate(addMonths(now, SESSION_MAX_MONTHS)) };
}

/** Data da história fora do intervalo da campanha (validação do front, com texto próprio). */
export function storyStartError(
  storyStartAt: string,
  campaign: { storyStartAt?: string; storyEndAt?: string | null },
): string | null {
  if (campaign.storyStartAt && storyStartAt < campaign.storyStartAt)
    return "A data de início na história deve ser igual ou posterior ao início da campanha.";
  if (campaign.storyEndAt && storyStartAt > campaign.storyEndAt)
    return "A data de início na história deve ser anterior ao fim da campanha.";
  return null;
}
