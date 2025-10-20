import styled from "styled-components";
import minusIcon from "../../assets/icons/minus.svg";

interface MinusButtonProps {
  onClick?: () => void;
  isDisabled?: boolean;
}

export default function MinusButton({
  onClick,
  isDisabled = false,
}: MinusButtonProps) {
  return (
    <MinusButtonContainer
      onClick={isDisabled ? undefined : onClick}
      $disabled={isDisabled}
    >
      <img src={minusIcon} alt="-" />
    </MinusButtonContainer>
  );
}

const MinusButtonContainer = styled.div<{ $disabled: boolean }>`
  width: 8cqi;
  height: 7.8cqi;
  padding: 1.7cqi 0;

  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  filter: ${({ $disabled }) => ($disabled ? "grayscale(100%)" : "none")};

  transition: transform 0.2s ease, filter 0.2s ease;

  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};

  &:hover {
    ${({ $disabled }) =>
      !$disabled &&
      `
      filter: brightness(1.1);
      transform: scale(1.3);
    `}
  }
`;
