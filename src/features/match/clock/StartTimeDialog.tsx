// Hora inicial da partida: obrigatória para o mestre enquanto o relógio da história não tem
// hora. Sem cancelar, sem Esc, sem fechar por clique fora — ela some sozinha quando o servidor
// manda um estado com `storyAt` (nada de flag local escondendo: após recarregar, volta).
import { useEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLInputElement>('input[aria-label="Horas"]')?.focus();
  }, []);

  const date = storyStartAt ? formatDateBR(`${storyStartAt.slice(0, 10)}T00:00:00`) : null;
  const submit = () => onStart(`${pad2(time.h)}:${pad2(time.mi)}:${showSeconds ? pad2(time.s) : "00"}`);

  return (
    <Overlay>
      <Dialog ref={ref} role="dialog" aria-modal="true" aria-labelledby="start-time-title">
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
          <AccentConfirmButton type="button" onClick={submit}>
            Começar
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
