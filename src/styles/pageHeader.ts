import styled, { css } from "styled-components";
import { colors } from "./tokens";

/**
 * Cabeçalho de campanha, partida e lobby: título à esquerda, data/selo à direita.
 *
 * O arranjo depende da largura da COLUNA CENTRAL (não da janela): as abas laterais
 * mudam quanto sobra para ela. `HeaderBox` é o contêiner; o cabeçalho em si fica dentro.
 *
 * Limite de 720px (largura do conteúdo da coluna): abaixo disso o bloco da data
 * (~280px) deixaria menos de 400px para o título, e "REENCONTRAMOS" em 42px (~380px)
 * seria partido. Com as colunas de 300px e 400px, a janela de 1280px dá 520px e
 * empilha; 1920px dá 1160px e fica em linha.
 */
export const HEADER_STACK_BELOW = 720;

export const stackedHeader = `@container (max-width: ${HEADER_STACK_BELOW - 1}px)`;

export const HeaderBox = styled.div`
  container-type: inline-size;
  margin-bottom: 20px;
`;

/** Título: 42px (notebook) no máximo, 24px no mínimo; nunca parte palavra no meio. */
export const headerTitle = css`
  font-size: clamp(24px, 5.8cqi, 42px);
  font-weight: 900;
  color: ${colors.textPrimary};
  flex: 1;
  min-width: 0;
  overflow-wrap: normal;
  hyphens: auto;
`;

/** Linha com título e bloco da data; empilha quando a coluna estreita. */
export const headerRow = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  ${stackedHeader} {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;
