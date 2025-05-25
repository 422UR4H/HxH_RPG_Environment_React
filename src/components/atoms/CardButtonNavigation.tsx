import { useNavigate } from "react-router-dom";
import CardButton from "../../styles/CardButton";

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
