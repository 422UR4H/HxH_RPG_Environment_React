import type { ClockChange, PauseReason } from "./clockMessages";
import { diffSeconds, formatDateBR, formatDelta, formatTime } from "./storyTime";

const PAUSE_REASONS: Record<Exclude<PauseReason, "manual">, string> = {
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
      const verb = delta < 0 ? `voltou o tempo ${formatDelta(delta).replace("−", "")}` : `avançou o tempo ${formatDelta(delta)}`;
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
      return `O tempo real pausou (${PAUSE_REASONS[change.reason]})`;
    }
    case "start":
      return change.to ? `A partida começa às ${formatTime(change.to)} de ${formatDateBR(change.to)}` : null;
    case "scene": {
      if (!change.to || !change.from || change.from === change.to) return null;
      return `O combate terminou — ${nowAt(change.to)}`;
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
  return {
    kind: "adjust",
    from: prev.from,
    to: next.to,
    deltaSeconds: (prev.deltaSeconds ?? 0) + (next.deltaSeconds ?? 0),
  };
}
