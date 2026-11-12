# Diagramas com a luz — `features/diagrams/`

O losango físico, o mental e os princípios Nen aparecem na ficha e no painel de regras. A luz é uma
só peça (`GlowDiagram`) para os dois lugares parecerem o mesmo desenho e para a pintura de progresso
(feature futura) ter onde entrar. Regras completas e referência visual: spec §8,
`System_X_System/docs/superpowers/specs/2026-11-11-sheet-rules-panel-design.md`.

## Peças

- `geometry.ts`: coordenadas transcritas dos assets (nós, trechos, arcos/setas do Nen).
- `paint.ts`: `parsePaintSpec` (texto do fence do Markdown) e `resolvePaint` (puro, testado).
- `glowLayers.ts`: as quatro camadas e os tempos da animação. Os números vieram da referência
  aprovada; mexer neles é mudar o visual aprovado.
- `GlowDiagram.tsx`: o SVG.

## Regras curtas

- **Uma luz por camada:** cada camada é um grupo borrado com todas as peças, com a opacidade no grupo
  (nunca por peça), senão aparecem emendas.
- **Pintado = cor, o resto = branco** (aceso, não apagado). A cor vai por cima, um pouco mais larga.
- **Vazamento de 32% é o padrão do módulo** (`BLEED_FRACTION`): quando o progresso chega numa bolinha,
  a cor avança 32% pelas linhas vizinhas não pintadas. Não é um ajuste de um diagrama só.
- **Cores só pelos aliases `diagram*`** de `tokens.ts` (8, todos apontando para a palette existente).
  Nada de hex aqui nem cor nova na palette.
- **`paint` precisa ser referência estável:** o componente é memoizado por referência; um objeto novo
  a cada render (literal inline no JSX) recalcula a pintura e redesenha o SVG à toa.
- `prefers-reduced-motion`: estado final, sem animação (`data-motion="off"`). Diagrama fora da tela
  pausa a animação.
