import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import styled from "styled-components";
import FieldHelpText from "../atoms/FieldHelpText";
import { colors } from "../../styles/tokens";
import { errorBox } from "../../styles/errorBox";
import { narrowForm, NARROW_LABEL_SIZE } from "../../styles/formScale";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  helpText?: string;
  /** Marca "(opcional)" no rótulo. Só nos opcionais: marcar os obrigatórios poluiria o formulário. */
  optional?: boolean;
  /** Erro de validação, em vermelho abaixo do campo (role="alert"). */
  error?: string | null;
  /** Nota neutra abaixo do campo, ex.: "Limite de 32 caracteres atingido." (role="status"). */
  notice?: string | null;
  children: ReactNode;
}

export default function FormField({
  label,
  htmlFor,
  helpText,
  optional,
  error,
  notice,
  children,
}: FormFieldProps) {
  // O campo (um único elemento) ganha aria-invalid/aria-describedby sem a página repassá-los;
  // os ids que ele já tinha em aria-describedby são mantidos.
  let field = children;
  if (isValidElement(children) && (error || notice)) {
    const child = children as ReactElement<{ "aria-describedby"?: string }>;
    const describedBy =
      [child.props["aria-describedby"], error && `${htmlFor}-error`, notice && `${htmlFor}-notice`]
        .filter(Boolean)
        .join(" ") || undefined;
    field = cloneElement(child as ReactElement<Record<string, unknown>>, {
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy,
    });
  }

  return (
    <Group>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <Optional> (opcional)</Optional>}
      </Label>
      {field}
      {error && (
        <ErrorText id={`${htmlFor}-error`} role="alert">
          {error}
        </ErrorText>
      )}
      {notice && (
        <NoticeText id={`${htmlFor}-notice`} role="status">
          {notice}
        </NoticeText>
      )}
      {helpText && <FieldHelpText>{helpText}</FieldHelpText>}
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
  color: ${colors.textPrimary}; /* mesma cor do texto de ajuda: a hierarquia vem do peso e do tamanho */
`;

const ErrorText = styled.p`
  ${errorBox}
  font-size: 18px;
`;

const NoticeText = styled.p`
  font-weight: 400;
  font-size: 16px;
  line-height: 1.35;
  color: ${colors.textMuted};
`;
