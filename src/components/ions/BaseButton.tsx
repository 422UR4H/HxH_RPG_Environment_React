import styled from "styled-components";
import { colors, gradients } from "../../styles/tokens";

interface BaseButtonProps {
  disabled?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

// TODO: improve componentization to make base button more reusable
export default function BaseButton({ children, ...props }: BaseButtonProps) {
  return <StyledButton {...props}>{children}</StyledButton>;
}

const StyledButton = styled.button`
  font-family: "Roboto", "sans-serif";
  font-size: min(27px, 6vw);
  font-weight: 700;
  line-height: 40px;
  color: ${colors.textPrimary};

  border: 4px solid ${colors.textOnLight};
  background: ${gradients.orange};
  color: ${colors.textOnLight};

  width: 429px;
  height: 48px;
  border-radius: 14px;
  cursor: pointer;

  /* &:focus {
    outline: none;
  } */
  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    background-color: ${colors.disabledBlue};

    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* @media (max-width: 767px) { */
  @media (max-width: 580px) {
    width: 100%;
  }

  @media (max-width: 480px) {
    border-radius: 0;
  }

  @media (max-width: 360px) {
    height: 55px;
  }
`;
