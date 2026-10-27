import styled from "styled-components";
import plusIcon from "../../assets/icons/plus.svg";

interface PlusButtonProps {
  onClick?: () => void;
  isDisabled?: boolean;
}

export default function PlusButton({
  onClick,
  isDisabled = false,
}: PlusButtonProps) {
  return (
    <PlusButtonContainer
      onClick={isDisabled ? undefined : onClick}
      $disabled={isDisabled}
    >
      <img src={plusIcon} alt="+" />
    </PlusButtonContainer>
  );
}

const PlusButtonContainer = styled.div<{ $disabled: boolean }>`
  /* round(): tamanho em pixel inteiro nas densidades fracionárias. */
  width: round(8cqi, 1px);
  height: round(7.98cqi, 1px);

  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  filter: ${({ $disabled }) => ($disabled ? "grayscale(100%)" : "none")};

  transition: transform 0.2s ease, filter 0.2s ease;

  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};

  &:hover {
    ${({ $disabled }) =>
      !$disabled &&
      `
      filter: brightness(1.1);
      transform: scale(1.2);
    `}
  }
`;
