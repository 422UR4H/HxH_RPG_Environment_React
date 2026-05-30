import styled from "styled-components";
import backgroundBookIcon from "../../assets/icons/background-book.svg";
import { colors } from "../../styles/tokens";

interface BackgroundButtonProps {
  onClick: () => void;
  ariaLabel?: string;
}

export default function BackgroundButton({
  onClick,
  ariaLabel = "Abrir background do personagem",
}: BackgroundButtonProps) {
  return (
    <ButtonContainer onClick={onClick} aria-label={ariaLabel}>
      <BackgroundText>Background</BackgroundText>
      <BookIcon src={backgroundBookIcon} alt="" />
    </ButtonContainer>
  );
}

const ButtonContainer = styled.button`
  background-color: ${colors.grayMid};
  border: 2px solid ${colors.borderGrayLight};
  border-radius: 8px;
  padding: 1.6cqi 4cqi;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${colors.grayMidStrong};
    border-color: ${colors.textPlaceholder};
  }
`;

const BookIcon = styled.img`
  /* width: 21cqi; */
  /* width: min(6cqi, 36px); */
  /* height: auto; */
`;

const BackgroundText = styled.span`
  font-family: "Roboto", sans-serif;
  font-size: min(3.4cqi, 28px);
  color: ${colors.textPrimary};
  font-weight: 600;
  line-height: 1;

  /* @media (max-width: 609px) { */
  @media (max-width: 509px) {
    font-size: 4cqi;
  }
`;
