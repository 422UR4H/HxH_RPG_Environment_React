import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import type { ClockChange } from "./clockMessages";
import { coalesce, noticeText } from "./clockNotice";

const SHOW_MS = 6000;

type Props =
  | { change: ClockChange | null; changeSeq: number; text?: never; noticeKey?: never }
  /** Modo texto livre (ex.: alerta de tempo real do mestre): reaparece a cada `noticeKey` novo. */
  | { text: string | null; noticeKey: number; change?: never; changeSeq?: never };

/**
 * Aviso de palco para toda mudança de tempo feita pelo mestre — nada passa em silêncio.
 * Mudanças em sequência dentro da janela se fundem; cada uma reinicia os 6 s.
 */
export default function ClockNotice(props: Props) {
  const { change = null, changeSeq, text = null, noticeKey } = props;
  const key = changeSeq ?? noticeKey ?? 0;
  const [shown, setShown] = useState<ClockChange | null>(null);
  const [shownText, setShownText] = useState<string | null>(null);
  // O que já estava no estado ao montar é velho: só avisa o que chega depois.
  const seen = useRef(key);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Texto/mudança lidos por ref: só uma chave NOVA aceita um aviso e (re)inicia o relógio;
  // uma troca de identidade com a mesma chave não pode cancelar o timer em curso.
  const latest = useRef({ change, text });
  useEffect(() => {
    latest.current = { change, text };
  });

  useEffect(() => {
    if (key === seen.current) return;
    seen.current = key;
    const { change: c, text: t } = latest.current;
    if (noticeKey !== undefined) {
      if (!t) return;
      setShownText(t);
    } else {
      if (!c) return;
      setShown((prev) => (prev ? coalesce(prev, c) : c));
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setShown(null);
      setShownText(null);
    }, SHOW_MS);
  }, [key, noticeKey]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const out = noticeKey !== undefined ? shownText : shown ? noticeText(shown) : null;
  if (!out) return null;
  return <Notice role="status" aria-live="polite">{out}</Notice>;
}

const Notice = styled.div`
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid ${colors.feedbackWarningBorder};
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-size: 13px;
`;
