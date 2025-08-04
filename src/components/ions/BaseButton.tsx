import styled from "styled-components";

interface BaseButtonProps {
  disabled?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

export default function BaseButton({ children, ...props }: BaseButtonProps) {
  return <StyledButton {...props}>{children}</StyledButton>;
}

const StyledButton = styled.button`
  font-family: "Roboto", "sans-serif";
  font-size: min(27px, 6vw);
  font-weight: 700;
  line-height: 40px;
  color: white;

  background-color: #107135;
  width: 429px;
  height: 65px;
  border-radius: 6px;
  border: none;
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
    background-color: #83b4ef;

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
