import { useNavigate } from "react-router-dom";
import styled from "styled-components";

interface BackButtonProps {
  to: string;
}

export default function BackButton({ to }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <StyledBackButton onClick={() => navigate(to)}>&larr;</StyledBackButton>
  );
}

const StyledBackButton = styled.button`
  position: fixed;
  z-index: 10;
  left: 16px;
  top: 16px;

  background-color: #444;
  border: none;
  /* border: 3px black solid; */
  border-radius: 12px;
  padding: 0 10px 12px 10px;

  color: white;
  font-size: 40px;
  cursor: pointer;

  &:hover {
    background-color: #555;
  }
`;
