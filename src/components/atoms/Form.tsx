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
  gap: 13px;
  width: 100%;
`;
