// Entrada da página da partida no histórico do navegador. Ao encerrar a partida, a mesa volta
// até essa entrada (em vez de empurrar uma página da partida nova): lobby e /game viram entradas
// "à frente", e "Voltar" a partir dali segue para a campanha sem alternar campanha/partida.
//
// O React Router guarda a posição de cada entrada em `history.state.idx`. Tudo em
// sessionStorage (por aba); falha de storage (modo privado, bloqueio) não quebra nada — só cai
// no caminho antigo de substituir a /game.

const entryKey = (matchId: string) => `matchPageIdx:${matchId}`;
const noticeKey = (matchId: string) => `matchEndedNotice:${matchId}`;

function currentIdx(): number | null {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" ? idx : null;
}

/** Guarda a entrada atual como a da página da partida; cada visita atualiza. */
export function rememberMatchPageEntry(matchId: string): void {
  const idx = currentIdx();
  if (idx === null) return;
  try {
    sessionStorage.setItem(entryKey(matchId), String(idx));
  } catch {
    // sem storage: o fim da partida usa o caminho de substituição
  }
}

/** Passos (negativos) até a página da partida guardada, ou `null` se ela não está atrás. */
export function backStepsToMatchPage(matchId: string): number | null {
  const idx = currentIdx();
  if (idx === null) return null;
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(entryKey(matchId));
  } catch {
    return null;
  }
  if (raw === null) return null;
  const stored = Number(raw);
  if (!Number.isInteger(stored) || stored >= idx) return null;
  return stored - idx;
}

/** Marca que a partida acabou de ser encerrada: voltar no histórico não leva estado de rota. */
export function flagEndedNotice(matchId: string): void {
  try {
    sessionStorage.setItem(noticeKey(matchId), "1");
  } catch {
    // sem storage: o jogador só não vê o aviso
  }
}

/** Lê e apaga o aviso de partida encerrada (mostra uma vez só). */
export function consumeEndedNotice(matchId: string): boolean {
  try {
    const flagged = sessionStorage.getItem(noticeKey(matchId)) !== null;
    if (flagged) sessionStorage.removeItem(noticeKey(matchId));
    return flagged;
  } catch {
    return false;
  }
}
