import styled, { css } from "styled-components";
import { colors } from "./tokens";

/**
 * Cabeçalho de campanha, partida e lobby: título à esquerda, data/selo à direita.
 *
 * O arranjo só muda onde precisa: a linha quebra (flex-wrap) quando o título, que nunca
 * parte palavra (`min-width: min-content`), não cabe ao lado do bloco da data. O bloco cai
 * sozinho na linha de baixo, já no início (esquerda). Em notebook o arranjo antigo fica.
 * `HeaderBox` é o contêiner (largura da COLUNA CENTRAL, não da janela); o `@container`
 * só trata a coluna muito estreita, onde o conteúdo interno do bloco também alinha à esquerda.
 */
export const HEADER_NARROW_BELOW = 400;

export const narrowHeader = `@container (max-width: ${HEADER_NARROW_BELOW - 1}px)`;

export const HeaderBox = styled.div`
  container-type: inline-size;
  margin-bottom: 20px;
`;

/** Título: 42px (notebook) no máximo, 24px no mínimo; nunca parte palavra no meio. */
export const headerTitle = css`
  font-size: clamp(24px, 5.8cqi, 42px);
  font-weight: 900;
  color: ${colors.textPrimary};
  flex: 1 1 0;
  min-width: min-content;
  overflow-wrap: normal;
  hyphens: auto;
`;

/** Linha com título e bloco da data; quebra só quando o título não cabe ao lado. */
export const headerRow = css`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px 16px;
`;

/** Bloco da data/selo: largura natural, nunca encolhe; cai para a linha de baixo se faltar espaço. */
export const headerAside = css`
  flex: 0 0 auto;
`;
