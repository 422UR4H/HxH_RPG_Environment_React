import styled, { css } from "styled-components";
import { colors } from "./tokens";

/**
 * Cabeçalho de campanha, partida e lobby: título e bloco da data/selo.
 *
 * Empilhado por padrão (título em cima, bloco embaixo, tudo à esquerda); lado a lado, com o
 * bloco à direita, só quando a COLUNA CENTRAL tem 900px ou mais. `HeaderBox` é o contêiner,
 * então o `@container` mede a coluna, não a janela. Sem `flex-wrap`: ele deixava o título
 * virar uma coluna estreita ao lado da data.
 */
export const HeaderBox = styled.div`
  container-type: inline-size;
  margin-bottom: 20px;
`;

/** Título: de 20px a 42px; só quebra palavra maior que a coluna inteira. */
export const headerTitle = css`
  font-size: clamp(20px, 6cqi, 42px);
  line-height: 1.1;
  font-weight: 900;
  color: ${colors.textPrimary};
  max-width: 100%;
  min-width: 0;
  overflow-wrap: break-word;

  @container (min-width: 900px) {
    flex: 1 1 auto;
  }
`;

/** Linha com título e bloco da data: empilhada, e lado a lado a partir de 900px. */
export const headerRow = css`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;

  @container (min-width: 900px) {
    flex-direction: row;
    justify-content: space-between;
    gap: 32px;
  }
`;

/** Bloco da data/selo: à esquerda empilhado, à direita (selo acima da data) lado a lado. */
export const headerAside = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  text-align: left;
  max-width: 100%;

  @container (min-width: 900px) {
    flex: 0 0 auto;
    align-items: flex-end;
    text-align: right;
  }
`;

/** Valor da data: não parte no meio; o rótulo antes dele é que quebra se faltar espaço. */
export const headerDateValue = css`
  white-space: nowrap;
`;
