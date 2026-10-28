import ErrorIcon from "../ions/ErrorIcon";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

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
      <Frame>
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
      </Frame>
      {error && (
        <ErrorText id={errorId}>
          <ErrorIcon size={18} />
          <span>{error}</span>
        </ErrorText>
      )}
    </Block>
  );
}

const Input = styled.input`
  box-sizing: border-box;
  width: 100%;
  height: 52px;
  padding: 0 16px;
  /* Mesmo traço do botão "Entrar" (BaseButton): contorno quase-preto, 4px e cantos de 14px. */
  border: 4px solid ${colors.textOnLight};
  border-radius: 14px;
  background-color: ${colors.textPrimary};
  font-size: 18px;
  font-weight: 400;
  color: ${colors.textOnLight};

  /* Campo de texto tem foco próprio: o anel global exclui input. */
  &:focus {
    outline: none;
    border-color: ${colors.actionHighlightOnLight};
  }

  &[aria-invalid="true"],
  &[aria-invalid="true"]:focus {
    border-color: ${colors.feedbackInputError};
  }

  /* O preenchimento automático pinta o fundo; devolve a cor do cartão; o sombreado interno não alcança a borda de 4px. */
  /* Regras separadas: um navegador que não conhece um dos seletores descartaria a lista inteira. */
  &:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px ${colors.textPrimary} inset;
    -webkit-text-fill-color: ${colors.textOnLight};
  }
  &:autofill {
    -webkit-box-shadow: 0 0 0 1000px ${colors.textPrimary} inset;
    -webkit-text-fill-color: ${colors.textOnLight};
  }
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

// O campo vem antes do rótulo no DOM; o rótulo é posto por cima da linha da borda e a "corta" com um fundo da cor do cartão.
const Frame = styled.div`
  position: relative;

  &:focus-within label {
    color: ${colors.actionHighlightOnLight};
  }
  &:has([aria-invalid="true"]) label {
    color: ${colors.feedbackInputError};
  }
`;

const Label = styled.label`
  position: absolute;
  pointer-events: none;
  /* Centro do rótulo (18px) alinhado ao centro da borda de 4px. */
  top: -7px;
  left: 18px;
  padding: 0 6px;
  background-color: ${colors.textPrimary};
  font-size: 14px;
  font-weight: 700;
  line-height: 18px;
  color: ${colors.textOnLight};
`;

const Block = styled.div`
  width: 429px;

  @media (max-width: 580px) {
    width: 100%;
  }
`;
