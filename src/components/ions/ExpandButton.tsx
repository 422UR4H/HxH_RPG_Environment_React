import styled from "styled-components";
import { iconFxTransition } from "../../styles/iconButtonFx";
import expandIcon from "../../assets/icons/arrowheadDown.svg";

interface ExpandButtonProps {
  isExpanded: boolean;
  setIsExpanded?: (value: boolean) => void;
}

export default function ExpandButton({
  isExpanded,
  setIsExpanded,
}: ExpandButtonProps) {
  // Sem setIsExpanded quem alterna é o botão em volta: a seta vira só decoração.
  return (
    <ExpandIcon
      src={expandIcon}
      alt={setIsExpanded ? "Expandir/Retrair" : ""}
      $isExpanded={isExpanded}
      onClick={setIsExpanded ? () => setIsExpanded(!isExpanded) : undefined}
    />
  );
}

const ExpandIcon = styled.img<{ $isExpanded: boolean }>`
  cursor: pointer;
  transition: transform 0.16s ease, ${iconFxTransition};
  transform: ${({ $isExpanded }) =>
    $isExpanded ? "rotate(180deg)" : "rotate(0deg)"};

  -webkit-user-select: none;
`;
