import styled from "styled-components";

interface FloatingActionButtonProps {
  label: string;
  position: "sidebar" | "main";
  onClick: () => void;
}

export default function FloatingActionButton({
  label,
  position,
  onClick,
}: FloatingActionButtonProps) {
  return (
    <StyledButton $position={position} onClick={onClick}>
      <span>+</span>
      <span>{label}</span>
    </StyledButton>
  );
}

const StyledButton = styled.button<{
  $position: "sidebar" | "main";
}>`
  position: fixed;
  bottom: 20px;
  left: ${({ $position }) => ($position === "sidebar" ? "20px" : "340px")};
  background-color: #ffa216;
  color: white;
  border: none;
  border-radius: 50px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  z-index: 10;
  transition: background-color 0.2s;

  span:first-child {
    font-size: 24px;
    font-weight: bold;
  }

  &:hover {
    background-color: #ff8c00;
  }

  @media (max-width: 768px) {
    left: ${({ $position }) => ($position === "sidebar" ? "20px" : "20px")};
    bottom: ${({ $position }) => ($position === "sidebar" ? "20px" : "80px")};
  }
`;
