import styled from "styled-components";

export default function PlusIcon({ className }: { className?: string }) {
  // Decorativo: o rótulo do botão já diz "Criar…".
  return <StyledPlusIcon className={className} aria-hidden="true">+</StyledPlusIcon>;
}

const StyledPlusIcon = styled.span`
  font-weight: bold;
  font-size: 36px;
`;
