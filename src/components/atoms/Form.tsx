import { styled } from "styled-components";
import { type ReactNode } from "react";

interface FormProps {
  children: ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export default function Form({ children, onSubmit }: FormProps) {
  return <StyledForm onSubmit={onSubmit}>{children}</StyledForm>;
}

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px; /* Vão único entre campos e botão; o rótulo sobre a borda já cabe aqui. */
  width: 100%;
`;
