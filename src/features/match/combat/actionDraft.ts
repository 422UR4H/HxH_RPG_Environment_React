import type { MoveCategory } from "./combatMessages";
import type { Ghost } from "./combatReducer";

export type ActionDraft = {
  targets: string[];
  weapon?: string;
  move?: { category: MoveCategory; to: [number, number, number] };
};

export const emptyDraft = (): ActionDraft => ({ targets: [] });

const draftKey = (matchUuid: string, actorId: string) => `match-draft:${matchUuid}:${actorId}`;

// localStorage lança em aba privada e pode vir vazio: toda leitura/escrita é best-effort, e
// o estado inicial precisa ser válido sem ele.
export function loadDraft(matchUuid: string, actorId: string): ActionDraft {
  try {
    const raw = localStorage.getItem(draftKey(matchUuid, actorId));
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as ActionDraft;
    return { ...emptyDraft(), ...parsed, targets: parsed.targets ?? [] };
  } catch {
    return emptyDraft();
  }
}

export function saveDraft(matchUuid: string, actorId: string, draft: ActionDraft): void {
  try {
    localStorage.setItem(draftKey(matchUuid, actorId), JSON.stringify(draft));
  } catch {
    /* sem persistência; o rascunho ainda vive em memória */
  }
}

export function clearDraft(matchUuid: string, actorId: string): void {
  try {
    localStorage.removeItem(draftKey(matchUuid, actorId));
  } catch {
    /* idem */
  }
}

/** Trocar de alvo MIGRA o rascunho: arma e movimento ficam, só a lista de alvos muda. */
export function migrateTargets(draft: ActionDraft, targets: string[]): ActionDraft {
  return { ...draft, targets };
}

// ─── Fantasmas confirmados sobrevivem ao refresh (R3, spec §8) ─────────────
//
// Chave separada da do rascunho de propósito: o rascunho é por ator (o mestre tem um por
// NPC), o fantasma é por partida (chaveado por actionId depois do ack).

const ghostsKey = (matchUuid: string) => `match-ghosts:${matchUuid}`;

export function loadGhosts(matchUuid: string): Record<string, Ghost> {
  try {
    const raw = localStorage.getItem(ghostsKey(matchUuid));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Ghost>;
  } catch {
    return {};
  }
}

/**
 * Persiste só fantasmas confirmados (chave sem prefixo `local-`): um fantasma ainda sem
 * `actionId` não tem como ser re-casado depois de um refresh, então guardá-lo seria lixo
 * morto na próxima leitura. Some a chave inteira quando não sobra nenhum confirmado.
 */
export function saveGhosts(matchUuid: string, ghosts: Record<string, Ghost>): void {
  try {
    const confirmed = Object.fromEntries(
      Object.entries(ghosts).filter(([id]) => !id.startsWith("local-")),
    );
    if (Object.keys(confirmed).length === 0) {
      localStorage.removeItem(ghostsKey(matchUuid));
      return;
    }
    localStorage.setItem(ghostsKey(matchUuid), JSON.stringify(confirmed));
  } catch {
    /* sem persistência; os fantasmas ainda vivem em memória */
  }
}
