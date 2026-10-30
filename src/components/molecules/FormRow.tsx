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
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 30px;
  width: 100%;

  /* Campos da mesma linha compartilham as faixas de rótulo, controle e ajuda:
     rótulo de duas linhas num campo não desce o do vizinho. Sem subgrid, fica empilhado como antes. */
  @supports (grid-template-rows: subgrid) {
    > * {
      display: grid;
      grid-row: span 3;
      grid-template-rows: subgrid;
      row-gap: 6px; /* o gap do pai (30px) fica só entre as linhas do FormRow */
    }

    /* rótulo encostado embaixo da faixa, colado ao controle */
    > * > label {
      align-self: end;
    }

    /* sem ajuda a 3ª faixa fica vazia: tira o gap de 6px que sobraria */
    > *:not(:has(> :nth-child(3))) {
      margin-bottom: -6px;
    }
  }
`;
