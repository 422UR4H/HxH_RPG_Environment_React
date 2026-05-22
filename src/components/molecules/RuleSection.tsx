import { type ReactNode } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

interface RuleSectionProps {
  title: string;
  children: ReactNode;
}

export default function RuleSection({ title, children }: RuleSectionProps) {
  return (
    <Section>
      <SectionTitle>{title}</SectionTitle>
      <SectionBody>{children}</SectionBody>
    </Section>
  );
}

const Section = styled.div`
  background-color: ${colors.surfaceInput};
  border-radius: 8px;
  padding: 15px;
`;

const SectionTitle = styled.h3`
  font-family: ${fonts.sans};
  font-weight: 600;
  font-size: 24px;
  margin-bottom: 10px;
  color: ${colors.textPrimary};
`;

// div (não p): children é ReactNode — pode receber conteúdo em bloco
// quando o sistema de regras real existir (listas, etc.).
const SectionBody = styled.div`
  font-family: ${fonts.sans};
  font-weight: 300;
  font-size: 20px;
  color: ${colors.textPrimary};
  line-height: 1.4;
`;
