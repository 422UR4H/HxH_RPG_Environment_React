import { useEffect, useState } from "react";
import type { CombatState } from "../combat/combatReducer";
import type { LimitReason } from "./clockMessages";
import { addSeconds } from "./storyTime";

export type ClockPhase = "idle" | "running" | "pulse" | "strongPulse" | "alert";

export type StoryClockView = {
  now: string | null;
  running: boolean;
  limitAt: string | null;
  limitReason: LimitReason | "";
  realElapsedSeconds: number;
  phase: ClockPhase;
  /** Sobe a cada pulso (múltiplo de 10 s); serve de `key` para reiniciar a animação. */
  pulseKey: number;
  /** Sobe a cada múltiplo de 5 min; o aviso de 5 min se prende nele. */
  alertKey: number;
};

const PULSE_EVERY = 10;
const STRONG_EVERY = 60;
const ALERT_AT = 300;

type Baseline = { startedAt: number | null; receivedAt: number; changeSeq: number };

/**
 * Valor vivo do relógio da história (dono: servidor) e, para o mestre (`escalate`), as fases
 * de atenção enquanto o tempo real corre. Hora da história é ingênua: só passa por storyTime.ts.
 */
export function useStoryClock(
  clock: CombatState["clock"],
  opts: { escalate: boolean },
): StoryClockView {
  const { value, receivedAt, lastChange, changeSeq } = clock;
  const running = !!value?.running && value.storyAt !== null;

  // Base do tempo real: reinicia só ao pausar (zera) ou num `play`; um estado cheio ou
  // clock_changed que chega com o relógio já correndo (reconexão) mantém a fase.
  const [baseline, setBaseline] = useState<Baseline>({
    startedAt: running ? receivedAt : null,
    receivedAt,
    changeSeq,
  });
  if (baseline.receivedAt !== receivedAt || baseline.changeSeq !== changeSeq) {
    let startedAt = baseline.startedAt;
    if (!running) startedAt = null;
    else if (startedAt === null || (lastChange?.kind === "play" && changeSeq !== baseline.changeSeq)) {
      startedAt = receivedAt;
    }
    setBaseline({ startedAt, receivedAt, changeSeq });
  }

  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    // Cada tick reagenda o próximo para o segundo inteiro seguinte de `receivedAt`
    // (sem deriva em partidas longas).
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const offset = (Date.now() - receivedAt) % 1000;
      const delay = offset <= 0 ? 1000 + offset : 1000 - offset;
      timeout = setTimeout(() => {
        setTick(Date.now());
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [running, receivedAt]);

  const clockNow = Math.max(tick, receivedAt);
  const now =
    value?.storyAt == null
      ? null
      : running
        ? addSeconds(value.storyAt, Math.floor((clockNow - receivedAt) / 1000))
        : value.storyAt;

  const realElapsedSeconds =
    running && baseline.startedAt !== null
      ? Math.max(0, Math.floor((clockNow - baseline.startedAt) / 1000))
      : 0;

  let phase: ClockPhase = running ? "running" : "idle";
  let pulseKey = 0;
  let alertKey = 0;
  if (running && opts.escalate) {
    const e = realElapsedSeconds;
    pulseKey = Math.floor(e / PULSE_EVERY);
    alertKey = Math.floor(e / ALERT_AT);
    if (e > 0 && e % STRONG_EVERY === 0) phase = "strongPulse";
    else if (e > 0 && e % PULSE_EVERY === 0) phase = "pulse";
    else if (e >= ALERT_AT) phase = "alert";
  }

  return {
    now,
    running,
    limitAt: value?.limitAt ?? null,
    limitReason: value?.limitReason ?? "",
    realElapsedSeconds,
    phase,
    pulseKey,
    alertKey,
  };
}
