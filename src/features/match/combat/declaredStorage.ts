import type { DeclaredAction } from "./combatReducer";

// As ações que este navegador declarou sobrevivem a um refresh — senão o fantasma do
// movimento pedido some e o jogador não sabe mais o que mandou. Por partida + USUÁRIO: duas
// abas logadas como papéis diferentes na mesma partida não podem ver as ações uma da outra.
// Só as já confirmadas (`queued`/`open`) vão para o disco: um envio sem ack não tem como ser
// re-casado depois do refresh.

const key = (matchUuid: string, userUuid: string) => `match-declared:v1:${matchUuid}:${userUuid}`;

export function loadDeclared(matchUuid: string, userUuid: string): DeclaredAction[] {
  try {
    const raw = localStorage.getItem(key(matchUuid, userUuid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DeclaredAction[]).filter((d) => d.status !== "sending") : [];
  } catch {
    return [];
  }
}

export function saveDeclared(matchUuid: string, userUuid: string, declared: DeclaredAction[]): void {
  try {
    const confirmed = declared.filter((d) => d.status !== "sending");
    if (confirmed.length === 0) {
      localStorage.removeItem(key(matchUuid, userUuid));
      return;
    }
    localStorage.setItem(key(matchUuid, userUuid), JSON.stringify(confirmed));
  } catch {
    /* sem persistência; a lista ainda vive em memória */
  }
}
