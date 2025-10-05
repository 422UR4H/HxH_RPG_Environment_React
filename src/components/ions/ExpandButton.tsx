import styled from "styled-components";
import expandIcon from "../../assets/icons/arrowheadDown.svg";

interface ExpandButtonProps {
  isExpanded: boolean;
  setIsExpanded?: (value: boolean) => void;
}

export default function ExpandButton({
  isExpanded,
  setIsExpanded,
}: ExpandButtonProps) {
  return (
    <ExpandIcon
      src={expandIcon}
      alt="Expandir/Retrair"
      $isExpanded={isExpanded}
      onClick={() => setIsExpanded && setIsExpanded(!isExpanded)}
    />
  );
}

const ExpandIcon = styled.img<{ $isExpanded: boolean }>`
  cursor: pointer;
  transition: transform 0.16s ease;
  transform: ${({ $isExpanded }) =>
    $isExpanded ? "rotate(180deg)" : "rotate(0deg)"};

  -webkit-user-select: none;
`;
