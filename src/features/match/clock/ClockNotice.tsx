import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import type { ClockChange } from "./clockMessages";
import { coalesce, noticeText } from "./clockNotice";

const SHOW_MS = 6000;

/**
 * Aviso de palco para toda mudança de tempo feita pelo mestre — nada passa em silêncio.
 * Mudanças em sequência dentro da janela se fundem; cada uma reinicia os 6 s.
 */
export default function ClockNotice({ change, changeSeq }: { change: ClockChange | null; changeSeq: number }) {
  const [shown, setShown] = useState<ClockChange | null>(null);
  // A mudança que já estava no estado ao montar é velha: só avisa o que chega depois.
  const seen = useRef(changeSeq);

  useEffect(() => {
    if (changeSeq === seen.current || !change) return;
    seen.current = changeSeq;
    setShown((prev) => (prev ? coalesce(prev, change) : change));
    const t = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [change, changeSeq]);

  const text = shown ? noticeText(shown) : null;
  if (!text) return null;
  return <Notice role="status" aria-live="polite">{text}</Notice>;
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
