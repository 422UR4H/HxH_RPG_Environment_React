import type { ComponentPropsWithoutRef } from "react";
import styled from "styled-components";
import Tooltip from "../ions/Tooltip";
import questionMark from "../../assets/icons/questionmark-sm.svg";

type BlockableButtonProps = ComponentPropsWithoutRef<"button"> & {
  /** Com motivo, a ação fica indisponível e o motivo é a explicação. Sem motivo, é um botão comum. */
  blockedReason?: string;
  /** Repassado ao Tooltip: o botão ocupa a largura do contêiner. */
  stretch?: boolean;
};

/**
 * O jeito único de explicar uma ação indisponível (decisão delegada 5 da fase 2): `aria-disabled`
 * (e não `disabled`, que não recebe foco nem toque), o "?" do designer na mesma linha, à direita
 * do rótulo, e o motivo no Tooltip ao passar o mouse, focar ou tocar.
 * Estilize com `styled(BlockableButton)` e o seletor `&[aria-disabled="true"]`.
 */
export default function BlockableButton({
  blockedReason,
  stretch,
  onClick,
  children,
  type = "button",
  ...rest
}: BlockableButtonProps) {
  const blocked = !!blockedReason;
  return (
    <Tooltip label={blockedReason ?? ""} enabled={blocked} stretch={stretch}>
      <button
        {...rest}
        type={type}
        aria-disabled={blocked || undefined}
        // Bloqueado não age nem envia formulário; o clique segue até o Tooltip, que mostra o motivo.
        onClick={blocked ? (e) => e.preventDefault() : onClick}
      >
        {children}
        {blocked && <HelpMark src={questionMark} alt="" aria-hidden="true" />}
      </button>
    </Tooltip>
  );
}

const HelpMark = styled.img`
  height: 1.5em;
  width: auto;
  min-height: 20px;
  flex-shrink: 0;
  margin-left: 0.4em;
`;
