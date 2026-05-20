import styled from "styled-components";
import backgroundBookIcon from "../../assets/icons/background-book.svg";

export default function BackgroundButton() {
  return (
    <ButtonContainer>
      <BackgroundText>Background</BackgroundText>
      <BookIcon src={backgroundBookIcon} alt="" />
    </ButtonContainer>
  );
}

const ButtonContainer = styled.button`
  background-color: #555;
  border: 2px solid #777;
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
    background-color: #666;
    border-color: #888;
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
  color: white;
  font-weight: 600;
  line-height: 1;

  /* @media (max-width: 609px) { */
  @media (max-width: 509px) {
    font-size: 4cqi;
  }
`;
