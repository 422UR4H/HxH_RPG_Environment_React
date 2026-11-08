// Hora inicial da partida: obrigatória para o mestre enquanto o relógio da história não tem
// hora. Sem cancelar, sem Esc, sem fechar por clique fora — ela some sozinha quando o servidor
// manda um estado com `storyAt` (nada de flag local escondendo: após recarregar, volta).
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import { combatErrorText } from "../combat/combatErrorMessages";
import type { WsError } from "../combat/combatErrorMessages";
import { AccentConfirmButton, Buttons, Dialog, DialogHint, DialogTitle, Overlay } from "../combat/dialogStyles";
import { TimeFields } from "./ClockEditor";
import type { TimeValue } from "./ClockEditor";
import { formatDateBR } from "./storyTime";

const pad2 = (n: number) => String(n).padStart(2, "0");

type Props = {
  /** Data fixa da história (a do início da partida); só o dia importa. */
  storyStartAt?: string;
  onStart: (time: string) => void;
  error: WsError | null;
};

export default function StartTimeDialog({ storyStartAt, onStart, error }: Props) {
  const [time, setTime] = useState<TimeValue>({ h: 0, mi: 0, s: 0 });
  const [showSeconds, setShowSeconds] = useState(false);
  // Duplo clique: o 2º envio chegaria depois de a hora já estar definida. Fica "começando" até
  // o servidor responder com erro (a resposta de sucesso desmonta o diálogo).
  const [pending, setPending] = useState(false);
  const [seenError, setSeenError] = useState<WsError | null>(null);
  if (error !== seenError) {
    setSeenError(error);
    if (error) setPending(false);
  }
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLInputElement>('input[aria-label="Horas"]')?.focus();
  }, []);

  const date = storyStartAt ? formatDateBR(`${storyStartAt.slice(0, 10)}T00:00:00`) : null;
  const submit = () => {
    if (pending) return;
    setPending(true);
    onStart(`${pad2(time.h)}:${pad2(time.mi)}:${showSeconds ? pad2(time.s) : "00"}`);
  };

  // aria-modal sem saída: Tab/Shift+Tab giram dentro do diálogo.
  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>("input, button"));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <Overlay>
      <Dialog ref={ref} role="dialog" aria-modal="true" aria-labelledby="start-time-title" onKeyDown={trapTab}>
        <DialogTitle id="start-time-title">Que horas são no início da partida?</DialogTitle>
        {date && <DialogHint>{date}</DialogHint>}
        <TimeFields value={time} onChange={setTime} showSeconds={showSeconds} />
        {!showSeconds && (
          <SecondsToggle type="button" onClick={() => setShowSeconds(true)}>
            + segundos
          </SecondsToggle>
        )}
        {error && <ErrorText role="alert">{combatErrorText(error.code, error.message, error.sentType)}</ErrorText>}
        <Buttons>
          <AccentConfirmButton type="button" aria-disabled={pending} onClick={submit}>
            {pending ? "Começando…" : "Começar"}
          </AccentConfirmButton>
        </Buttons>
      </Dialog>
    </Overlay>
  );
}

const SecondsToggle = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  color: ${colors.textPrimary};
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
`;

const ErrorText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.feedbackDanger};
`;
