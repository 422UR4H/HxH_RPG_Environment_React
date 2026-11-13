import { forwardRef } from "react";
import styled from "styled-components";
import questionIcon from "../../assets/icons/questionmark-sm.svg";
import Tooltip from "../../components/ions/Tooltip";
import { colors } from "../../styles/tokens";
import { RULES_PANEL_ID } from "./SheetRulesPanel";

export interface RulesHelpButtonProps {
  open: boolean;
  onToggle(): void;
  size: "desktop" | "mobile";
}

const SIZE = { desktop: 60, mobile: 52 } as const;

/** O "?" da coluna ATRIBUTOS: abre o painel de regras e, aberto, fecha. O próprio ícone é o alvo. */
const RulesHelpButton = forwardRef<HTMLButtonElement, RulesHelpButtonProps>(function RulesHelpButton(
  { open, onToggle, size },
  ref,
) {
  return (
    <Tooltip label={open ? "Fechar regras" : "Regras"}>
      <Button
        ref={ref}
        type="button"
        aria-label="Regras de atributos e perícias"
        aria-expanded={open}
        aria-controls={open ? RULES_PANEL_ID : undefined}
        onClick={onToggle}
        $size={SIZE[size]}
      >
        <img src={questionIcon} alt="" />
      </Button>
    </Tooltip>
  );
});

export default RulesHelpButton;

const Button = styled.button<{ $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  padding: 0;
  margin: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease;

  img {
    display: block;
    width: 100%;
    height: 100%;
  }

  @media (any-hover: hover) {
    &:hover {
      background: ${colors.overlayHighlight};
    }
  }
  &[aria-expanded="true"] {
    background: ${colors.overlayHighlight};
  }

  &:focus-visible {
    outline: 2px solid ${colors.actionHighlight};
    outline-offset: 3px;
  }
`;
