import styled from "styled-components";
import PlusIcon from "../ions/PlusIcon";

interface CreateButtonProps {
  variant: "green" | "orange";
  label: string;
  onClick: () => void;
}

export default function CreateButton({ variant, label, onClick }: CreateButtonProps) {
  return (
    <StyledButton type="button" $variant={variant} onClick={onClick}>
      <PlusIcon />
      <span>{label}</span>
    </StyledButton>
  );
}

const StyledButton = styled.button<{ $variant: "green" | "orange" }>`
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: 600;
  ${({ $variant }) =>
    $variant === "green"
      ? "background-color: #107135; color: white;"
      : "background: linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%); color: black;"}
  height: 100px;
  width: 80vw;
  max-width: 940px;
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    border: 4px solid ${({ $variant }) => ($variant === "green" ? "white" : "black")};
  }
  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 500px) {
    font-size: 22px;
    width: 100%;
    border-radius: 0px;

    &:hover {
      border-width: 4px 0px 4px 0px;
    }
    &:active {
      transform: scale(1);
    }
  }
`;
