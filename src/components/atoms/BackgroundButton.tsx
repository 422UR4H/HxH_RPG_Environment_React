import styled from "styled-components";

export default function BackgroundButton() {
  return (
    <ButtonContainer>
      <BackgroundText>Background</BackgroundText>
    </ButtonContainer>
  );
}

const ButtonContainer = styled.button`
  background-color: #555;
  border: 2px solid #777;
  border-radius: 8px;
  padding: 0 4cqi;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;

  &:hover {
    background-color: #666;
    border-color: #888;
  }
`;

const BackgroundText = styled.span`
  font-family: "Roboto", sans-serif;
  font-size: min(3.4cqi, 28px);
  color: white;
  font-weight: 600;

  @media (max-width: 609px) {
    font-size: 4cqi;
  }
`;
