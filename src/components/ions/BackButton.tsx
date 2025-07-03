import { useNavigate } from "react-router-dom";
import styled from "styled-components";

interface BackButtonProps {
  to: string;
}

export default function BackButton({ to }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <StyledBackButton onClick={() => navigate(to)}>
      &larr; Voltar
    </StyledBackButton>
  );
}

const StyledBackButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  text-align: left;
  padding: 0;
  margin-bottom: 10px;
  width: fit-content;

  &:hover {
    text-decoration: underline;
  }
`;
