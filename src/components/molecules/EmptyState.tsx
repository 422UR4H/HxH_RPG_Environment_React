import { type ReactNode } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

interface EmptyStateProps {
  children: ReactNode;
}

export default function EmptyState({ children }: EmptyStateProps) {
  return (
    <Container>
      <Message>{children}</Message>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
`;

const Message = styled.p`
  font-family: ${fonts.sans};
  font-weight: 600;
  color: ${colors.textPrimary};
  font-size: 28px;
  margin-bottom: 20px;
`;
