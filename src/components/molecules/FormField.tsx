import { type ReactNode } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  helpText?: string;
  children: ReactNode;
}

export default function FormField({ label, htmlFor, helpText, children }: FormFieldProps) {
  return (
    <Group>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {helpText && <HelpText>{helpText}</HelpText>}
    </Group>
  );
}

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-weight: 700;
  font-size: 26px;
  color: ${colors.textPrimary};
`;

const HelpText = styled.p`
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  margin-top: 4px;
`;
