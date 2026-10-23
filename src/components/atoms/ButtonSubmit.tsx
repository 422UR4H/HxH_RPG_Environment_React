import { styled, keyframes } from "styled-components";
import BaseButton from "../ions/BaseButton";
import { colors } from "../../styles/tokens";

interface ButtonSubmitProps {
  disabled?: boolean;
  children?: React.ReactNode;
}

export default function ButtonSubmit({
  disabled = false,
  children,
}: ButtonSubmitProps) {
  return (
    <BaseButton type="submit" disabled={disabled}>
      {disabled ? (
        <LoadingDots role="status" aria-label="Carregando">
          <Dot />
          <Dot />
          <Dot />
        </LoadingDots>
      ) : (
        children
      )}
    </BaseButton>
  );
}

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

const LoadingDots = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

// A animação fica nas bolinhas; no container ela encolheria as três juntas.
const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${colors.textOnLight};
  animation: ${bounce} 1.4s infinite ease-in-out both;

  &:nth-child(1) {
    animation-delay: -0.32s;
  }
  &:nth-child(2) {
    animation-delay: -0.16s;
  }
  &:nth-child(3) {
    animation-delay: 0s;
  }
`;
