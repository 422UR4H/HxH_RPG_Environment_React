import { type ReactNode } from "react";
import styled from "styled-components";

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
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 26px;
  color: white;
`;

const HelpText = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: white;
  margin-top: 4px;
`;
