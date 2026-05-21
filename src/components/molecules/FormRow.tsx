import { type ReactNode } from "react";
import styled from "styled-components";

interface FormRowProps {
  children: ReactNode;
}

export default function FormRow({ children }: FormRowProps) {
  return <Row>{children}</Row>;
}

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  width: 100%;
`;
