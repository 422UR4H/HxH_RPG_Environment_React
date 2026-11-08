// Edição direta do relógio da história (nível 3 do painel do mestre, §8.2/§8.3 do spec).
// O mesmo componente serve o painel, o Encerrar combate e o Encerrar partida, cada um com
// seu mínimo e seu valor inicial. Nada de calendário (dono): a data anda de dia em dia e a
// hora é digitada ou empurrada pelas setas. Toda conta passa por storyTime (tempo ingênuo).
import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, PointerEvent } from "react";
import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import { AccentConfirmButton, Buttons, CancelButton } from "../combat/dialogStyles";
import LongSkipConfirm from "./LongSkipConfirm";
import {
  addSeconds, compareStory, diffSeconds, formatDateBR, formatDelta, formatStory, formatTime, parseStory,
} from "./storyTime";

/** Acima disto (2 dias) para frente, o mestre confirma antes: custa dias de treino. */
export const LONG_SKIP_SECONDS = 172_800;

const DAY = 86_400;
const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 120;

export type TimeValue = { h: number; mi: number; s: number };
type Field = keyof TimeValue;

const FIELDS: { key: Field; label: string; max: number; unit: number }[] = [
  { key: "h", label: "Horas", max: 23, unit: 3600 },
  { key: "mi", label: "Minutos", max: 59, unit: 60 },
  { key: "s", label: "Segundos", max: 59, unit: 1 },
];

const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp = (n: number, max: number) => Math.min(max, Math.max(0, n));

/**
 * Os campos HH : MM : SS. Setas ±1 e PageUp/PageDown ±10 com vai-um para a unidade de cima;
 * passar da meia-noite volta a 00 e avisa `carryDays` (±1) para quem tem data saber.
 * Dois dígitos digitados pulam para o campo seguinte; o número é travado no intervalo.
 */
export function TimeFields({
  value,
  onChange,
  showSeconds,
}: {
  value: TimeValue;
  onChange: (next: TimeValue, carryDays?: number) => void;
  showSeconds: boolean;
}) {
  const fields = showSeconds ? FIELDS : FIELDS.slice(0, 2);
  const refs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});
  // O que está sendo digitado (um dígito só ainda não ganha o zero à esquerda).
  const [draft, setDraft] = useState<{ key: Field; text: string } | null>(null);

  const step = (unit: number, n: number) => {
    const total = value.h * 3600 + value.mi * 60 + value.s + unit * n;
    const carry = Math.floor(total / DAY);
    const rest = total - carry * DAY;
    setDraft(null);
    onChange({ h: Math.floor(rest / 3600), mi: Math.floor((rest % 3600) / 60), s: rest % 60 }, carry);
  };

  // Digitar sobrescreve o campo como num relógio digital: o 1º dígito começa de novo, o 2º
  // completa e pula para o próximo campo. Não depende da seleção (o Chrome a desfaz no mouseup).
  const commit = (i: number, text: string) => {
    const f = fields[i];
    onChange({ ...value, [f.key]: clamp(text === "" ? 0 : Number(text), f.max) }, 0);
    if (text.length < 2) {
      setDraft({ key: f.key, text });
      return;
    }
    setDraft(null);
    const next = fields[i + 1];
    if (next) refs.current[next.key]?.focus();
  };
  const typeDigit = (i: number, d: string) => {
    const f = fields[i];
    commit(i, draft?.key === f.key && draft.text.length === 1 ? draft.text + d : d);
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      typeDigit(i, e.key);
      return;
    }
    const n = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (n === undefined) return;
    e.preventDefault();
    step(fields[i].unit, n);
  };

  // Teclado virtual (Android manda keydown sem tecla) e colar: o que chegar pelo input.
  const onInput = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const data = (e.nativeEvent as InputEvent).data;
    if (data && /^\d$/.test(data)) {
      typeDigit(i, data);
      return;
    }
    commit(i, e.currentTarget.value.replace(/\D/g, "").slice(-2));
  };

  return (
    <TimeRow>
      {fields.map((f, i) => (
        <TimeCell key={f.key}>
          {i > 0 && <Colon aria-hidden="true">:</Colon>}
          <TimeInput
            ref={(el) => { refs.current[f.key] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={f.label}
            value={draft?.key === f.key ? draft.text : pad2(value[f.key])}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => setDraft(null)}
            onKeyDown={onKeyDown(i)}
            onChange={onInput(i)}
          />
        </TimeCell>
      ))}
    </TimeRow>
  );
}

/** Tocar dá um passo; segurar repete (depois de 400 ms, a cada 120 ms). Teclado = um passo por Enter/Espaço. */
function useHoldRepeat(action: () => void) {
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; });
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({});
  // O clique que vem depois do ponteiro já foi contado no pointerdown.
  const fromPointer = useRef(false);

  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
    timers.current = {};
  };
  useEffect(() => stop, []);

  return {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      fromPointer.current = true;
      stop();
      actionRef.current();
      timers.current.delay = setTimeout(() => {
        actionRef.current();
        timers.current.repeat = setInterval(() => actionRef.current(), HOLD_REPEAT_MS);
      }, HOLD_DELAY_MS);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    // Segurar o dedo no Android abriria o menu de contexto.
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    onClick: () => {
      if (fromPointer.current) {
        fromPointer.current = false;
        return;
      }
      actionRef.current();
    },
  };
}

export default function ClockEditor({
  base,
  minimum,
  minimumReason,
  initial,
  showSeconds = true,
  allowUnchanged = false,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
}: {
  /** A hora atual da história: a prévia mede a diferença a partir dela. */
  base: string;
  /** Antes disto não se volta (o último turno, o início do combate). */
  minimum: string | null;
  minimumReason?: string;
  initial?: string;
  showSeconds?: boolean;
  /** Enviar sem mexer vale (o fim do combate pode ser exatamente o mínimo). */
  allowUnchanged?: boolean;
  submitLabel: string;
  cancelLabel?: string;
  onSubmit: (storyAt: string, confirmLongSkip: boolean) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initial ?? base);
  const [confirming, setConfirming] = useState(false);
  const reasonId = useId();

  const prevDay = useHoldRepeat(() => setValue((v) => addSeconds(v, -DAY)));
  const nextDay = useHoldRepeat(() => setValue((v) => addSeconds(v, DAY)));

  // Esc fecha a confirmação de salto longo (o ConfirmDialog não trata teclado).
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setConfirming(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  const parts = parseStory(value);
  const delta = diffSeconds(value, base);
  const belowMinimum = minimum !== null && compareStory(value, minimum) < 0;
  const unchanged = delta === 0;
  const blocked = belowMinimum || (unchanged && !allowUnchanged);

  const onTime = (t: TimeValue, carryDays = 0) => {
    setValue(addSeconds(formatStory({ ...parts, ...t }), carryDays * DAY));
  };

  const submit = () => {
    if (blocked) return;
    if (delta > LONG_SKIP_SECONDS) setConfirming(true);
    else onSubmit(value, false);
  };

  const minimumText =
    minimum === null
      ? ""
      : // Mínimo em outro dia: a hora sozinha enganaria.
        `${formatDateBR(minimum) === formatDateBR(value) ? "" : `${formatDateBR(minimum)} `}${formatTime(minimum)}`;

  return (
    <Editor>
      <DateRow>
        <StepButton type="button" aria-label="Dia anterior" {...prevDay}>
          −
        </StepButton>
        <DateText>{formatDateBR(value)}</DateText>
        <StepButton type="button" aria-label="Próximo dia" {...nextDay}>
          +
        </StepButton>
      </DateRow>

      <TimeFields value={{ h: parts.h, mi: parts.mi, s: parts.s }} onChange={onTime} showSeconds={showSeconds} />

      <Preview aria-live="polite">
        {unchanged ? (
          <Muted>sem mudança</Muted>
        ) : (
          <>
            <span>{`→ ${showSeconds ? formatTime(value) : formatTime(value).slice(0, 5)}`}</span>
            <Muted aria-hidden="true">·</Muted>
            <Delta $forward={delta > 0}>{formatDelta(delta)}</Delta>
          </>
        )}
      </Preview>

      {belowMinimum && (
        <Reason id={reasonId}>
          {`Não volta antes de ${minimumText}${minimumReason ? ` — ${minimumReason}` : ""}`}
        </Reason>
      )}

      <Buttons>
        {onCancel && (
          <CancelEditButton type="button" onClick={onCancel}>
            {cancelLabel ?? "Cancelar"}
          </CancelEditButton>
        )}
        {/* aria-disabled (e não disabled): segue focável e o motivo, sempre visível, fica ligado a ele. */}
        <SubmitButton
          type="button"
          aria-disabled={blocked || undefined}
          aria-describedby={belowMinimum ? reasonId : undefined}
          onClick={submit}
        >
          {submitLabel}
        </SubmitButton>
      </Buttons>

      {/* Marcada para o painel do relógio: com ela aberta, Esc fecha só a confirmação. */}
      {confirming && (
        <span data-clock-confirm="" style={{ display: "contents" }}>
          <LongSkipConfirm
            deltaSeconds={delta}
            onConfirm={() => {
              setConfirming(false);
              onSubmit(value, true);
            }}
            onCancel={() => setConfirming(false)}
          />
        </span>
      )}
    </Editor>
  );
}

const Editor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-variant-numeric: tabular-nums;
`;

const DateRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const DateText = styled.span`
  min-width: 10ch;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textMuted};
  letter-spacing: 0.02em;
`;

const StepButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  -webkit-touch-callout: none;

  &:hover {
    background: ${colors.surfaceInputHover};
  }
  &:active {
    border-color: ${colors.brandAccent};
  }
`;

const TimeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TimeCell = styled.span`
  display: inline-flex;
  align-items: center;
`;

const Colon = styled.span`
  padding: 0 4px;
  font-size: 30px;
  font-weight: 600;
  color: ${colors.textPlaceholderStrong};
  user-select: none;
`;

const TimeInput = styled.input`
  width: calc(2ch + 20px);
  height: 56px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  font-size: 36px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
  caret-color: ${colors.brandAccent};
  outline: none;

  /* Campo de texto fica fora do anel global: o foco é a borda verde, como nos formulários. */
  &:focus {
    border-color: ${colors.brandAccent};
    box-shadow: inset 0 0 0 1px ${colors.brandAccent};
  }
  &::selection {
    background: ${colors.brandAccent};
  }
`;

const Preview = styled.p`
  margin: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  color: ${colors.textPrimary};
`;

const Muted = styled.span`
  color: ${colors.textPlaceholderStrong};
`;

// Para frente = o verde de aceitar; para trás = o dourado de aviso (voltar no tempo pede atenção).
const Delta = styled.span<{ $forward: boolean }>`
  font-weight: 600;
  color: ${({ $forward }) => ($forward ? colors.actionConfirm : colors.feedbackWarning)};
`;

const Reason = styled.p`
  margin: 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.4;
  color: ${colors.feedbackDangerText};
`;

// Alvo de toque de 40 px (os botões do diálogo têm ~37).
const SubmitButton = styled(AccentConfirmButton)`
  min-height: 40px;

  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelEditButton = styled(CancelButton)`
  min-height: 40px;
`;
