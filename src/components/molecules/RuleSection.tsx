import { type ReactNode } from "react";
import styled from "styled-components";

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
  background-color: #493823;
  border-radius: 8px;
  padding: 15px;
`;

const SectionTitle = styled.h3`
  font-family: "Roboto", sans-serif;
  font-weight: 600;
  font-size: 24px;
  margin-bottom: 10px;
  color: white;
`;

const SectionBody = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-size: 20px;
  color: white;
  line-height: 1.4;
`;
