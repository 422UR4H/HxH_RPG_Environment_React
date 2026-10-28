import type { ReactNode } from "react";
import styled, { css } from "styled-components";
import { colors } from "../../styles/tokens";

type BorderLabelTone = "light" | "dark";

interface BorderLabelFieldProps {
  label: string;
  tone: BorderLabelTone;
  /** id do campo. Sem ele, o quadro vira um grupo (`fieldset` + `legend`) para vários campos sob um rótulo só. */
  htmlFor?: string;
  /** Tom escuro: cor de dentro do campo, que pinta a metade de baixo do recorte. */
  fieldColor?: string;
  /** Campo em pílula (cantos bem redondos): o rótulo entra mais, para não pintar fora da curva. */
  pill?: boolean;
  className?: string;
  children: ReactNode;
}

// Rótulo fixo sobre a borda do campo (login, cadastro, perfil da ficha). O campo vem antes do rótulo
// no DOM; o rótulo é posto por cima da linha da borda e a "corta" com um fundo da cor do que está atrás.
export default function BorderLabelField({
  label,
  tone,
  htmlFor,
  fieldColor,
  pill = false,
  className,
  children,
}: BorderLabelFieldProps) {
  const isGroup = htmlFor === undefined;
  return (
    <Frame as={isGroup ? "fieldset" : "div"} $tone={tone} className={className}>
      {/* A legend precisa ser o primeiro filho para nomear o grupo. */}
      {isGroup && (
        <Label as="legend" $tone={tone} $fieldColor={fieldColor} $pill={pill}>
          {label}
        </Label>
      )}
      {children}
      {!isGroup && (
        <Label htmlFor={htmlFor} $tone={tone} $fieldColor={fieldColor} $pill={pill}>
          {label}
        </Label>
      )}
    </Frame>
  );
}

const Label = styled.label<{ $tone: BorderLabelTone; $fieldColor?: string; $pill: boolean }>`
  position: absolute;
  pointer-events: none;

  ${({ $tone, $fieldColor, $pill }) =>
    $tone === "light"
      ? css`
          /* Centro do rótulo (18px) alinhado ao centro da borda de 3px. */
          top: -8px;
          left: 18px;
          padding: 0 6px;
          /* Cor do cartão: corta a linha da borda atrás do rótulo. */
          background-color: ${colors.textPrimary};
          font-size: 14px;
          font-weight: 700;
          line-height: 18px;
          color: ${colors.textOnLight};
        `
      : css`
          /* Fonte em cqi, como o resto da ficha: o centro do rótulo vai para a quina de cima do campo. */
          top: 0;
          transform: translateY(-50%);
          left: ${$pill ? "22px" : "10px"};
          padding: 0 4px;
          /* Metade de cima com a cor do painel do perfil, metade de baixo com a cor de dentro do campo:
             a borda some atrás do rótulo sem manchar o campo. */
          background: linear-gradient(
            to bottom,
            ${colors.surfaceControl} 50%,
            ${$fieldColor ?? colors.surfaceNeutral} 50%
          );
          font-size: min(2.8cqi, 18px);
          font-weight: 700;
          line-height: 1.25;
          color: ${colors.textMuted};
          white-space: nowrap;

          @media (max-width: 609px) {
            font-size: 4cqi;
          }
        `}
`;

const Frame = styled.div<{ $tone: BorderLabelTone }>`
  position: relative;

  /* fieldset sem a moldura e o recuo do navegador: quem desenha a borda são os campos. */
  &:is(fieldset) {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }

  ${({ $tone }) =>
    $tone === "light"
      ? css`
          &:focus-within ${Label} {
            color: ${colors.actionHighlightOnLight};
          }
          &:has([aria-invalid="true"]) ${Label} {
            color: ${colors.feedbackInputError};
          }
        `
      : css`
          &:focus-within ${Label} {
            color: ${colors.textPrimary};
          }
          /* O BaseSelect clareia no hover; o recorte do rótulo clareia junto, senão sobra um retângulo escuro. */
          &:has(select:hover) ${Label} {
            filter: brightness(1.1);
          }
        `}
`;
