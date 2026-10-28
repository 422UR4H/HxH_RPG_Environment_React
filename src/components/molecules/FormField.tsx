import { type ReactNode } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";
import { narrowForm, NARROW_LABEL_SIZE } from "../../styles/formScale";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  helpText?: string;
  /** Marca "(opcional)" no rótulo. Só nos opcionais: marcar os obrigatórios poluiria o formulário. */
  optional?: boolean;
  children: ReactNode;
}

export default function FormField({ label, htmlFor, helpText, optional, children }: FormFieldProps) {
  return (
    <Group>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <Optional> (opcional)</Optional>}
      </Label>
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

  ${narrowForm} {
    font-size: ${NARROW_LABEL_SIZE}px;
  }
`;

const Optional = styled.span`
  font-weight: 400;
  font-size: 0.7em;
  color: ${colors.textPlaceholderStrong};
`;

const HelpText = styled.p`
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  margin-top: 4px;
`;
