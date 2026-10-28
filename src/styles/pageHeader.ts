import styled, { css } from "styled-components";
import { colors } from "./tokens";

/**
 * Cabeçalho de campanha, partida e lobby: título, selo e data.
 *
 * `HeaderBox` é o contêiner, então o `@container` mede a COLUNA CENTRAL, não a janela.
 */
export const HeaderBox = styled.div`
  container-type: inline-size;
  margin-bottom: 20px;
`;

/**
 * Título: de 26px a 42px (22px abaixo de 340px). Ao lado do selo flutuante não quebra palavra:
 * ela desce para a linha de baixo; só abaixo de 340px, sem selo ao lado, pode quebrar.
 */
export const headerTitle = css`
  grid-area: title;
  font-size: clamp(26px, 5.5cqi, 42px);
  line-height: 1.1;
  font-weight: 900;
  color: ${colors.textPrimary};
  max-width: 100%;
  min-width: 0;
  overflow-wrap: normal;

  @container (max-width: 339px) {
    font-size: 22px;
    overflow-wrap: break-word;
  }
`;

/**
 * Linha do cabeçalho. Filhos diretos, nesta ordem: selo (opcional), título, data (opcional);
 * o selo vem antes porque, na faixa média, ele flutua à direita do título.
 * Coluna >= 560px: grade com o título à esquerda e selo/data à direita.
 * 340-559px: fluxo normal, selo flutuando no canto superior direito. < 340px: empilhado.
 */
export const headerRow = css`
  display: grid;
  grid-template-columns: minmax(min-content, 1fr) auto;
  grid-template-areas:
    "title badge"
    "title date";
  column-gap: 32px;
  row-gap: 0;
  align-items: start;

  @container (max-width: 559px) {
    display: flow-root;
  }

  @container (max-width: 339px) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
`;

/** Selo no canto superior direito; a margem de baixo o separa da data. */
export const headerBadge = css`
  grid-area: badge;
  justify-self: end;
  margin-bottom: 8px;

  @container (max-width: 559px) {
    float: right;
    margin: 4px 0 4px 16px;
  }

  @container (max-width: 339px) {
    float: none;
    margin: 0;
    order: 1;
  }
`;

/** Rótulo da data, abaixo do selo e alinhado à direita; sob o título (à esquerda) nas telas estreitas. */
export const headerDate = css`
  grid-area: date;
  justify-self: end;
  text-align: right;
  /* O reset global zera a entrelinha; a data quebra em duas linhas nas colunas estreitas. */
  line-height: 1.35;

  @container (max-width: 559px) {
    clear: both;
    padding-top: 10px;
    text-align: left;
    justify-self: start;
  }

  @container (max-width: 339px) {
    order: 2;
    padding-top: 0;
    justify-self: start;
    text-align: left;
  }
`;

/** Valor da data: não parte no meio; o rótulo antes dele é que quebra se faltar espaço. */
export const headerDateValue = css`
  white-space: nowrap;
`;

/**
 * Contêiner do subtítulo: o subtítulo não fica dentro do `HeaderBox`, então precisa medir a
 * própria coluna para usar o mesmo limiar do título. A margem de baixo mora aqui.
 */
export const SubtitleBox = styled.div`
  container-type: inline-size;
  margin-bottom: 20px;
`;

/**
 * Subtítulo em itálico (descrição breve) logo abaixo do cabeçalho: 26px. Quando a coluna é
 * estreita (< 560px, onde o título cai para menos de 31px) desce para 18px e o título volta a ser
 * o maior texto. Precisa estar dentro de um `SubtitleBox`.
 */
export const headerSubtitle = css`
  margin: 0;
  font-weight: 400;
  font-size: 26px;
  line-height: 1.5;
  color: ${colors.textPrimary};
  font-style: italic;

  @container (max-width: 559px) {
    font-size: 18px;
  }
`;
