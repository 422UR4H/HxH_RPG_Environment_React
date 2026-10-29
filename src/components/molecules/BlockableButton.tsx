import type { ComponentPropsWithoutRef } from "react";
import styled from "styled-components";
import Tooltip from "../ions/Tooltip";
import questionMark from "../../assets/icons/questionmark-sm.svg";

type BlockableButtonProps = ComponentPropsWithoutRef<"button"> & {
  /** Com motivo, a ação fica indisponível e o motivo é a explicação. Sem motivo, é um botão comum. */
  blockedReason?: string;
  /** Repassado ao Tooltip: o botão ocupa a largura do contêiner. */
  stretch?: boolean;
  /** Onde o rótulo fica no botão: "center" (padrão) ou "start" (itens de menu alinhados à esquerda). */
  labelAlign?: "center" | "start";
};

/**
 * O jeito único de explicar uma ação indisponível (decisão delegada 5 da fase 2): `aria-disabled`
 * (e não `disabled`, que não recebe foco nem toque), o "?" do designer na mesma linha, à direita
 * do rótulo, e o motivo no Tooltip ao passar o mouse, focar ou tocar.
 * O "?" fica preso à borda direita (a distância da borda é o respiro horizontal do próprio botão);
 * o rótulo não muda de lugar com ou sem ele. Estilize com `styled(BlockableButton)` e o seletor `&[aria-disabled="true"]`.
 */
export default function BlockableButton({
  blockedReason,
  stretch,
  labelAlign = "center",
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
        <Inner>
          {/* Espelho invisível do "?": reserva o mesmo espaço do lado esquerdo e mantém o rótulo no centro. */}
          {blocked && labelAlign === "center" && (
            <HelpMark $ghost src={questionMark} alt="" aria-hidden="true" />
          )}
          <Label $align={labelAlign}>{children}</Label>
          {blocked && <HelpMark src={questionMark} alt="" aria-hidden="true" />}
        </Inner>
      </button>
    </Tooltip>
  );
}

// Ocupa a largura útil do botão qualquer que seja o `display` do consumidor (flex, bloco...).
const Inner = styled.span`
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
`;

// As sobras de espaço vão para as margens automáticas: o rótulo centraliza (ou fica à esquerda)
// e o "?" cai na borda direita. `gap` herdado preserva o espaçamento ícone-texto do consumidor.
const Label = styled.span<{ $align: "center" | "start" }>`
  display: flex;
  align-items: center;
  gap: inherit;
  min-width: 0;
  ${({ $align }) => ($align === "center" ? "margin-inline: auto;" : "margin-right: auto;")}
`;

const HelpMark = styled.img<{ $ghost?: boolean }>`
  height: 1.5em;
  width: auto;
  min-height: 20px;
  flex-shrink: 0;
  box-sizing: content-box;
  padding-left: 0.4em;
  ${({ $ghost }) => ($ghost ? "visibility: hidden; padding-left: 0; padding-right: 0.4em;" : "")}
`;
