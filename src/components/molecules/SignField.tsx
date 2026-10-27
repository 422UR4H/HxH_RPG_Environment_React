import ErrorIcon from "../ions/ErrorIcon";
import styled from "styled-components";
import { colors, alpha } from "../../styles/tokens";

interface SignFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  maxLength?: number;
  error?: string | null;
}

// Campo das telas de entrada (login e cadastro): rótulo fixo sobre a borda, foco azul e erro por campo.
export default function SignField({
  name,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  maxLength,
  error,
}: SignFieldProps) {
  const id = `sign-${name}`;
  const errorId = `${id}-error`;
  return (
    <Block>
      <Box>
        <Input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <Label htmlFor={id}>{label}</Label>
      </Box>
      {error && (
        <ErrorText id={errorId}>
          <ErrorIcon size={18} />
          <span>{error}</span>
        </ErrorText>
      )}
    </Block>
  );
}

const Label = styled.label`
  position: absolute;
  top: -10px;
  left: 12px;
  padding: 0 6px;
  /* Cor do cartão: corta a linha da borda atrás do rótulo. */
  background-color: ${colors.textPrimary};
  font-size: 14px;
  font-weight: 600;
  line-height: 18px;
  color: ${colors.textHint};
  pointer-events: none;
`;

const Input = styled.input`
  box-sizing: border-box;
  width: 100%;
  height: 52px;
  padding: 0 16px;
  border: 2px solid ${colors.borderInputOnLight};
  border-radius: 8px;
  background-color: ${colors.textPrimary};
  font-size: 18px;
  font-weight: 400;
  color: ${colors.textOnLight};

  /* Campo de texto tem foco próprio: o anel global exclui input. */
  &:focus {
    outline: none;
    border-color: ${colors.actionHighlightOnLight};
    box-shadow: 0 0 0 3px ${alpha(colors.actionHighlightOnLight, 0.35)};
  }
  &:focus + ${Label} {
    color: ${colors.actionHighlightOnLight};
  }

  &[aria-invalid="true"] {
    border-color: ${colors.feedbackInputError};
  }
  &[aria-invalid="true"] + ${Label} {
    color: ${colors.feedbackInputError};
  }
  &[aria-invalid="true"]:focus {
    box-shadow: 0 0 0 3px ${alpha(colors.feedbackInputError, 0.35)};
  }

  /* O preenchimento automático pinta o fundo; devolve a cor do cartão sem perder o anel de foco. */
  /* Regras separadas: um navegador que não conhece um dos seletores descartaria a lista inteira. */
  &:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px ${colors.textPrimary} inset;
    -webkit-text-fill-color: ${colors.textOnLight};
  }
  &:autofill {
    -webkit-box-shadow: 0 0 0 1000px ${colors.textPrimary} inset;
    -webkit-text-fill-color: ${colors.textOnLight};
  }
  &:-webkit-autofill:focus {
    -webkit-box-shadow:
      0 0 0 1000px ${colors.textPrimary} inset,
      0 0 0 3px ${alpha(colors.actionHighlightOnLight, 0.35)};
  }
  &:autofill:focus {
    -webkit-box-shadow:
      0 0 0 1000px ${colors.textPrimary} inset,
      0 0 0 3px ${alpha(colors.actionHighlightOnLight, 0.35)};
  }
  &[aria-invalid="true"]:-webkit-autofill:focus {
    -webkit-box-shadow:
      0 0 0 1000px ${colors.textPrimary} inset,
      0 0 0 3px ${alpha(colors.feedbackInputError, 0.35)};
  }
  &[aria-invalid="true"]:autofill:focus {
    -webkit-box-shadow:
      0 0 0 1000px ${colors.textPrimary} inset,
      0 0 0 3px ${alpha(colors.feedbackInputError, 0.35)};
  }
`;

const Box = styled.div`
  position: relative;
`;

const ErrorText = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 6px 0 0;
  padding-left: 4px;
  font-size: 15px;
  font-weight: 500;
  line-height: 20px;
  color: ${colors.feedbackInputError};

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const Block = styled.div`
  width: 429px;

  @media (max-width: 580px) {
    width: 100%;
  }
`;
