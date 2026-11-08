import type { ClockChange, PauseReason } from "./clockMessages";
import { diffSeconds, formatDateBR, formatDelta, formatTime } from "./storyTime";

const PAUSE_REASONS: Partial<Record<PauseReason, string>> = {
  roundMode: "troca de regime",
  scene: "troca de cena",
  masterLeft: "o mestre saiu",
  end: "fim da partida",
  restart: "reinício do servidor",
};

const nowAt = (to: string) => `agora ${formatDateBR(to)} ${formatTime(to)}`;

/** Texto do aviso/linha de histórico para uma mudança do relógio; `null` quando é silenciosa. */
export function noticeText(change: ClockChange): string | null {
  switch (change.kind) {
    case "adjust":
    case "set": {
      if (!change.to) return null;
      const delta = change.deltaSeconds ?? (change.from ? diffSeconds(change.to, change.from) : 0);
      if (delta === 0) return null; // ajustes que se anularam: nada a avisar
      // O verbo já diz a direção: sem sinal no tamanho do salto (copy do spec).
      const size = formatDelta(Math.abs(delta)).slice(1);
      const verb = delta < 0 ? `voltou o tempo ${size}` : `avançou o tempo ${size}`;
      return `O mestre ${verb} — ${nowAt(change.to)}`;
    }
    case "play":
      return "O mestre ligou o tempo real";
    case "pause": {
      if (change.reason === "manual" || !change.reason) {
        // O tempo decorrido vem do servidor; `to − from` não serve (ajustes durante o play).
        const elapsed = change.elapsedSeconds !== undefined ? ` (${formatDelta(change.elapsedSeconds)})` : "";
        return `O mestre pausou o tempo real${elapsed}`;
      }
      const motive = PAUSE_REASONS[change.reason];
      return motive ? `O tempo real pausou (${motive})` : "O tempo real pausou";
    }
    case "start":
      return change.to ? `A partida começa às ${formatTime(change.to)} de ${formatDateBR(change.to)}` : null;
    case "scene": {
      if (!change.to || !change.from || change.from === change.to) return null;
      // Neutro: também acontece quando uma cena de roleplay fecha um round de corrida contado.
      return `Nova cena — ${nowAt(change.to)}`;
    }
    default:
      // round, limit e end: silenciosos aqui (o fim da partida é da tela de encerramento).
      return null;
  }
}

/** Junta ajustes seguidos num só aviso; qualquer outra combinação substitui. */
export function coalesce(prev: ClockChange, next: ClockChange): ClockChange {
  const mergeable = (k: ClockChange["kind"]) => k === "adjust" || k === "set";
  if (!mergeable(prev.kind) || !mergeable(next.kind)) return next;
  // `set` pode vir sem `deltaSeconds`: aí o total sai da distância entre as horas.
  const deltaSeconds =
    prev.deltaSeconds !== undefined && next.deltaSeconds !== undefined
      ? prev.deltaSeconds + next.deltaSeconds
      : prev.from && next.to
        ? diffSeconds(next.to, prev.from)
        : (prev.deltaSeconds ?? 0) + (next.deltaSeconds ?? 0);
  return { kind: "adjust", from: prev.from, to: next.to, deltaSeconds };
}
