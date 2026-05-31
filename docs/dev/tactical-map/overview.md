# Tactical Map — Visão pro dev

> Por onde começar. Estes 6 documentos são pra te ajudar a navegar o sistema de mapa tático. Cada um foca num conceito; este é o mapa do território.

## O que é o tactical map

Um **campo de batalha visual** dentro da partida. Tem:

- Uma **malha** (grade) — quadrada ou hexagonal — definida pelo mestre
- Uma **imagem de fundo** opcional (cenário) que o mestre sobe e ajusta
- **Peças** representando personagens (NPCs e jogadores), posicionadas em slots da malha
- No futuro: **paredes**, **decorações PNG** (árvores, casas), **itens** que podem ser pegos do chão
- No futuro distante: **múltiplos andares** (térreo, 1º andar, subsolo)

Pense em um mapa físico de RPG de mesa — mas digital, multi-jogador, e capaz de muito mais.

## Onde isto vive no produto

| Tela | Para quem | O que faz |
|---|---|---|
| `CreateMapPage` | Mestre | Cria um mapa novo numa campanha (fora de qualquer partida) |
| `EditMapPage` | Mestre | Edita um mapa salvo |
| `CampaignPage` (seção "Mapas") | Mestre | Lista, gerencia, anexa mapas |
| `GamePage` | Mestre + Jogadores | **Vê** o mapa em jogo (in-match). Mestre tem controles especiais |

A separação **edição / visualização** é fundamental no design.

## A arquitetura em uma frase

> Um **núcleo Pixi** (`TacticalMapStage`) que só desenha, envolto por **dois wrappers**: um pra mestre (`TacticalMapEditor`, adiciona toolbar e edição) e um pra jogador (`TacticalMapViewer`, adiciona tap-to-move).

Por que assim? Render escrito uma vez (paridade visual garantida entre mestre e jogador), mas cada papel tem comportamento próprio sem conflito. Mais detalhes em [pixi-stack.md](./pixi-stack.md).

## Stack — o que entra de novo no projeto

| Lib | Pra quê | Doc deste |
|---|---|---|
| **PixiJS v8** | Desenhar o mapa (GPU) | [pixi-stack.md](./pixi-stack.md) |
| **@pixi/react v8** | Escrever a cena Pixi em JSX | [pixi-stack.md](./pixi-stack.md) |
| **pixi-viewport** | Pan e pinch-zoom prontos | [pixi-stack.md](./pixi-stack.md) |
| **Zustand** | Estado local do editor | [state-management.md](./state-management.md) |
| **zundo** | Undo/redo para Zustand | [state-management.md](./state-management.md) |
| **immer** | Escrever mutável, gerar imutável | [state-management.md](./state-management.md) |

**Não substituem** nada que já existe. React Query continua dono do estado servidor; styled-components continua o CSS; container queries continuam o responsivo. Pixi & cia entram **apenas dentro do mapa**.

## Três espaços de coordenadas — e por que importa

Conceito mais difícil deste sistema. Resumo:

- **Slot**: onde a peça "está" no jogo. É `(col, row)` ou `(q, r)` em hex. **Discreto.** O que o RPG usa nas regras.
- **World**: onde a peça é desenhada na cena Pixi. É `(x, y)` em pixels do mundo. **Contínuo.** Não depende de zoom/pan.
- **Screen**: o pixel real onde o usuário tocou na tela. Vem do navegador.

A conversão Slot ↔ World é nossa (`coords.ts`). Screen ↔ World é resolvida pelo `pixi-viewport`. Você quase nunca pensa em Screen — só quando captura input.

Explicado direito em [coordinates.md](./coordinates.md).

## Sync — como mestre e jogadores ficam alinhados

**Modelo turn-based**, não streaming. Mestre **edita localmente** o tempo todo; nada vai pela rede enquanto ele só arrasta peças no rascunho. Quando o mestre **publica** uma mudança (move uma peça oficialmente, revela um NPC oculto), aí sim vai uma única mensagem WebSocket. Os jogadores aplicam o estado novo com uma animação curta.

A **representação da mudança** reaproveita as `Action` e `MasterAction` que já existem no backend Go — não inventamos protocolo de delta separado. Detalhes em [sync-and-delta.md](./sync-and-delta.md).

## Estado: três tipos, três ferramentas

Importante separar:

1. **Estado do servidor** (mapa salvo no banco) → **React Query**, como em todo o resto do projeto.
2. **Estado local do editor** (rascunho que o mestre edita, ferramenta ativa, seleção, undo/redo) → **Zustand**, novo.
3. **Estado de UI simples** (modal aberto, input focado, etc.) → `useState` ou contexto, como sempre.

Não misture. Explicado com exemplos em [state-management.md](./state-management.md).

## "Delta" e JSON Patch — um conceito novo

Quando o mestre publica uma mudança, em vez de mandar o mapa inteiro de novo (3KB por turno), mandamos só "o que mudou" — **delta**. Formato: JSON Patch (RFC 6902).

Exemplo:

```jsonc
// Mestre move a peça p1 do slot (5,5) para (6,5):
[
  { "op": "replace", "path": "/pieces/0/slot/col", "value": 6 }
]
```

40 bytes em vez de KB. Lib `immer` gera isso automaticamente quando a gente "muta" o estado normalmente. Sem precisar montar a lista de operações na mão.

Detalhado em [sync-and-delta.md](./sync-and-delta.md).

## Testar isto

PixiJS desenha com WebGL — e jsdom (o "navegador" do Vitest) não tem GPU. Conclusão: **não testamos a parte gráfica em CI**. Testamos:

- **Matemática** (coords, hex, distorção) com testes puros
- **Estado** (Zustand store) com asserts diretos
- **UI HTML** (toolbar, modais) com Testing Library
- **Integração** (drag → store → save) com msw + Stage mockado

E **validação visual** acontece no navegador, via rota `/dev/tactical-map-demo` que existe desde a Fase 0 + revisão manual.

Tudo isso em [testing.md](./testing.md).

## Fases do desenvolvimento

O sistema vem em 12 fases. Cada uma = 1 PR. A ordem importa — fases posteriores assumem as anteriores prontas. A lista completa está no spec mestre:

> `docs/superpowers/specs/2026-05-31-tactical-map-design.md` (project root)

Resumo rápido:

| # | Fase | Front | Back |
|---|---|---|---|
| 0 | Setup (walking skeleton) | ✓ | — |
| 1 | Persistência + listagem | ✓ | ✓ |
| 2 | Editor: malha | ✓ | — |
| 3 | Editor: imagem de fundo | ✓ | — |
| 4 | Editor: peças + altura Z | ✓ | — |
| 5 | Editor: polish e mobile | ✓ | — |
| 6 | Viewer in-match (GamePage) | ✓ | ✓ |
| 7 | WebSocket sync | ✓ | ✓ |
| 8 | Jogador: tap-to-move (intent) | ✓ | ✓ |
| 9 | Distorção isométrica + rotação | ✓ | — |
| 10 | Paredes / obstáculos | ✓ | — |
| 11 | PNGs decorativos | ✓ | — |
| 12 | Editar mapa durante partida (stretch) | ✓ | ✓ |

## Onde tem o quê

```
System_X_System_React/
├─ src/
│  ├─ features/tactical-map/    ← lógica/orquestração do mapa
│  │  ├─ TacticalMapEditor.tsx
│  │  ├─ TacticalMapViewer.tsx
│  │  ├─ hooks/                  ← orquestração do mapa + WS
│  │  ├─ store/                  ← Zustand
│  │  └─ utils/                  ← coords, hex, patches
│  ├─ components/
│  │  ├─ organisms/
│  │  │  ├─ TacticalMapStage.tsx ← núcleo Pixi
│  │  │  ├─ MapEditorToolbar.tsx
│  │  │  └─ CharacterRoster.tsx
│  │  └─ molecules/
│  │     ├─ GridConfigPanel.tsx
│  │     └─ BgImageAdjuster.tsx
│  ├─ pages/
│  │  ├─ CreateMapPage.tsx
│  │  ├─ EditMapPage.tsx
│  │  └─ GamePage.tsx            ← (Fase 6 — substitui placeholder)
│  └─ types/tacticalMap.ts
└─ docs/dev/tactical-map/        ← você está aqui
```

## Próximos passos pra você

1. Leia [pixi-stack.md](./pixi-stack.md) se nunca mexeu com PixiJS.
2. Leia [state-management.md](./state-management.md) pra entender Zustand antes de tocar no editor.
3. Leia [coordinates.md](./coordinates.md) antes de qualquer trabalho que envolva clicks/tap/drag.
4. Leia [sync-and-delta.md](./sync-and-delta.md) quando começar a Fase 7.
5. Leia [testing.md](./testing.md) antes de escrever testes desta feature.

E o spec mestre fica em `docs/superpowers/specs/2026-05-31-tactical-map-design.md` (project root) — é a referência completa, mais formal, pra IA ler em sessões futuras.
