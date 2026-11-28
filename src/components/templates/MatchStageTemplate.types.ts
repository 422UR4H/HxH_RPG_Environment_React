/**
 * Os modos do Histórico. Encaixado é a coluna (200 ou 280). Os ampliados só existem onde o
 * Histórico é estreito (200): `expanded` abre direto do fechado, com a célula sem largura (o mapa
 * não muda) e 280 por cima; `expandedOverDocked` mantém a coluna de 200 e a superfície de 280
 * transborda 80 px para a esquerda.
 */
export type AsideMode = "closed" | "docked" | "expanded" | "expandedOverDocked";
