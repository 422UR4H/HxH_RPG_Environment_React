import { useNavigate } from "react-router-dom";
// import CardButton from "../../styles/CardButton";
import styled from "styled-components";

interface ButtonSubmitProps {
  disabled?: boolean;
  children?: React.ReactNode;
  to: string;
  onClick?: () => void;
}

export default function CardButtonNavigation({
  disabled = false,
  children,
  to,
  onClick,
}: ButtonSubmitProps) {
  const navigate = useNavigate();

  function handleClick() {
    if (onClick) onClick();
    navigate(to);
  }

  return (
    <CardButton type="button" disabled={disabled} onClick={handleClick}>
      {children}
    </CardButton>
  );
}

const CardButton = styled.button`
  font-family: "Oswald", "sans-serif";
  font-size: 27px;
  font-weight: 700;
  line-height: 40px;
  color: white;

  background-color: #1877f2;
  width: 500px;
  max-width: calc(100vw - 100px);
  height: 500px;
  border-radius: 12px;
  border: none;
  cursor: pointer;

  &:focus {
    outline: none;
  }
  &:hover {
    background-color: #0052cc;
  }
  &:disabled {
    background-color: #83b4ef;

    display: flex;
    justify-content: center;
    align-items: center;
  }

  @media (orientation: portrait) {
    border-radius: 16px;
  }
`;
