# Refactor do mapa tático — Fase 4: relocar e quebrar a pilha Pixi

> **Para quem implementa:** execute tarefa por tarefa, na ordem. Esta é a fase de maior
> risco do refactor. Leia a seção "Regras de sobrevivência" inteira antes de tocar em
> qualquer arquivo.

**Spec de referência (leia a §4 inteira — os 13 invariantes — antes de começar):**
`docs/superpowers/specs/2026-08-06-tactical-map-refactor-design.md`

**Pré-requisitos:** Fases 1, 2 e 3 concluídas e mergeadas.

**Branch:** `refactor/tactical-map-fase-4-quebrar-stage`

---

## Objetivo

Duas coisas, nesta ordem, em **commits separados**:

1. **Realocar** a pilha Pixi de `src/components/organisms/` para
   `src/features/tactical-map/` — puro `git mv` + conserto de import, zero mudança de
   lógica.
2. **Quebrar** `TacticalMapStage.tsx` (1253 linhas, 6 componentes) em arquivos, e
   deduplicar `MapHandlesLayer.tsx` (543 linhas, `BgHandles`/`GridHandles` duplicados).

Separar em dois commits não é preciosismo: se algo quebrar na verificação visual, o
commit 1 é trivialmente verificável (só imports) e isso localiza o problema no commit 2
imediatamente.

---

## Por que realocar (Task 1)

`src/components/CLAUDE.md` define a regra do projeto:

| Onde | O quê |
|---|---|
| `src/components/` | UI usada por **2+** features/páginas |
| `src/features/<feature>/` | UI usada por **uma única** feature |

Levantamento feito em 2026-08-07 — quem importa cada um:

| Arquivo | Consumidores |
|---|---|
| `organisms/TacticalMapStage.tsx` | só `TacticalMapEditor`, `TacticalMapPlacer`, `TacticalMapViewer` (todos em `features/tactical-map/`) |
| `organisms/MapHandlesLayer.tsx` | só `TacticalMapStage` |
| `organisms/WallsLayer.tsx` | só `TacticalMapStage` |
| `organisms/FogLayer.tsx` | só `TacticalMapStage` |
| `organisms/LosSplit.tsx` | só `WallsLayer` |
| `organisms/MapEditorToolbar.tsx` | só `TacticalMapEditor` (+ seu próprio teste) |

Seis dos nove `organisms/` pertencem a uma única feature. `components/` é o UI Kit
compartilhado; hoje ele está com seis internos do mapa dentro. Os outros três
(`CharactersSidebar`, `RulesSidebar`, `PageTabNav`) são genuinamente compartilhados
entre páginas e **ficam onde estão**.

---

## Regras de sobrevivência — leia antes de mover qualquer linha

Esta fase move ~1800 linhas de código de interação Pixi que **não tem cobertura de
teste nenhuma** (spec §1.2). O compilador pega import quebrado; não pega nada do que
está abaixo.

### 1. Comentário viaja junto com o código

Cada um dos 13 invariantes da §4 do spec está documentado num comentário na origem, e
cada um resolve um bug real. Ao mover uma função, o bloco de comentário acima dela vai
junto, **intacto**. Se depois de mover um comentário virou mentira (ex.: ele fala de
"o effect abaixo" e o effect ficou noutro arquivo), **reescreva o comentário para
continuar verdadeiro** — não o apague.

### 2. Não "melhore" nada enquanto move

Esta fase move e deduplica. Ela **não**:
- troca `useEffect` por `useLayoutEffect` ou vice-versa;
- adiciona/remove dependência de effect;
- troca ref por state ou state por ref;
- transforma função em `useCallback` ou memoiza componente;
- reordena elementos JSX dentro de um container Pixi (a ordem **é** a ordem de
  renderização — trocar duas linhas troca o que fica por cima).

Se algo parecer errado, anote no corpo do PR e siga.

### 3. Ordem das camadas no `<pixiViewport>` é contrato visual

Dentro do `ViewportInner`, a sequência é: `BgLayer` → `GridLayer` →
`decorations-layer` → hover de posicionamento → `PiecesLayer` → `FogLayer` →
`WallsLayer` → `overlay-layer` (`MapHandlesLayer`). **Preserve exatamente.** O fog vem
depois das peças e antes das paredes de propósito — é o que faz parede lembrada
aparecer por cima do fog (spec da 10-E).

### 4. Os blocos `OCULTO POR ORA` de `MapHandlesLayer` ficam

São 4 blocos comentados (linhas ~322, ~378, ~399, ~459 hoje), decisão do dono do
produto. Mover junto, intactos. **Não** apagar, não converter em flag, não
"desabilitar de forma mais limpa". Ao deduplicar `BgHandles`/`GridHandles`, tome
cuidado para não engolir os blocos comentados do `GridHandles` na unificação.

### 5. Um `default export` por arquivo movido

Não aproveite para trocar default por named export nem vice-versa. Os consumidores
importam como está hoje.

---

## Task 1 — Realocar (commit próprio, zero lógica)

### 1.1 Mover

Use `git mv` para o histórico seguir o arquivo:

```
git mv src/components/organisms/TacticalMapStage.tsx  src/features/tactical-map/
git mv src/components/organisms/MapHandlesLayer.tsx   src/features/tactical-map/
git mv src/components/organisms/WallsLayer.tsx        src/features/tactical-map/
git mv src/components/organisms/FogLayer.tsx          src/features/tactical-map/
git mv src/components/organisms/LosSplit.tsx          src/features/tactical-map/
git mv src/components/organisms/MapEditorToolbar.tsx  src/features/tactical-map/
git mv src/components/organisms/__tests__/MapEditorToolbar.test.tsx src/features/tactical-map/__tests__/
```

Crie `src/features/tactical-map/__tests__/` se não existir.

### 1.2 Consertar os imports

Rode `npx tsc -b` e conserte tudo que ele apontar. Os caminhos relativos mudam de
`../../features/tactical-map/...` para `./...` (ou `./utils/...`), e de `../../styles/tokens`
para `../../styles/tokens` (esse não muda — mesma profundidade).

**Não confie na memória: deixe o `tsc` dirigir.** Repita até zero erro.

Depois, confirme que não sobrou referência velha:

```
grep -rn "organisms/TacticalMapStage\|organisms/MapHandlesLayer\|organisms/WallsLayer\|organisms/FogLayer\|organisms/LosSplit\|organisms/MapEditorToolbar" src/
```

Saída vazia.

### 1.3 Atualizar a documentação que cita os caminhos

Estes arquivos citam os caminhos antigos e ficariam mentindo:

- `src/components/CLAUDE.md` — na seção `organisms/`, o exemplo hoje pode citar os
  componentes de mapa. Ajuste para citar só os três que ficaram
  (`CharactersSidebar`, `RulesSidebar`, `PageTabNav`), e acrescente uma linha:
  > A pilha Pixi do mapa tático vive em `src/features/tactical-map/` — é usada por uma
  > única feature (regra da tabela acima).
- `CLAUDE.md` (raiz do repo) — a nota de cobertura adicionada na Fase 1 cita
  `MapHandlesLayer`, `WallsLayer`, `PieceSprite`. Os nomes seguem válidos; só confira
  se algum caminho explícito ficou errado.
- `docs/dev/tactical-map/*.md` — rode
  `grep -rn "components/organisms" docs/dev/tactical-map/` e corrija o que aparecer.

### 1.4 Verificar e commitar

1. `npx tsc -b` — limpo.
2. `npm test` — verde, **mesmo número** da main (esta task não muda comportamento nem
   adiciona teste).
3. `npm run lint` — zero erro na superfície do mapa (ver §Verificação).

**Commit:** `refactor(tactical-map): mover pilha Pixi de organisms para features/tactical-map`

Não siga para a Task 2 antes deste commit estar feito.

---

## Task 2 — Quebrar `TacticalMapStage.tsx`

Estrutura atual (1253 linhas), com as linhas aproximadas pós-Fase 2:

| Bloco | Linhas | Destino |
|---|---|---|
| `avatarBlobUrlCache` + `getAvatarBlobUrl` | 23–44 | `utils/avatarTexture.ts` |
| `insetShadowCache` + `getAvatarInsetShadowTexture` | 46–94 | `utils/avatarTexture.ts` |
| `declare module "react"` (JSX do `pixiViewport`) | 96–115 | `stage/pixiViewportTypes.ts` |
| `type Props` | 117–173 | `stage/stageProps.ts` |
| `TacticalMapStage` (Application + overlay) | 175–304 | fica em `TacticalMapStage.tsx` |
| `type BgDragState` + `ViewportInner` | 306–645 | `stage/ViewportInner.tsx` |
| `BgLayer` | 647–722 | `stage/BgLayer.tsx` |
| `GridLayer` | 724–771 | `stage/GridLayer.tsx` |
| `PieceLocalDragState` + `PiecesLayer` | 773–1030 | `stage/PiecesLayer.tsx` |
| `PieceSpriteProps` + `PieceSprite` | 1032–1220 | `stage/PieceSprite.tsx` |
| styled-components do overlay | 1222–1253 | fica em `TacticalMapStage.tsx` |

Resultado: `src/features/tactical-map/stage/` com 6 arquivos, e um
`TacticalMapStage.tsx` de ~180 linhas.

**Confira os números de linha antes de cortar** — eles são de 2026-08-07 e a Fase 3
pode ter deslocado algo. Use os nomes das funções como âncora, nunca as linhas.

### 2.1 `utils/avatarTexture.ts` — e ganhe teste de graça

Mova as duas funções de cache **sem alterar o corpo**, com todos os comentários (o do
`?pixi=1` é o invariante §4.10 do spec — se sumir, avatares de NPC voltam a falhar em
WebGL por CORS, e só em produção).

`getAvatarBlobUrl` é a única coisa desta fase que dá para testar em jsdom, e vale a
pena — ela tem um cache de deduplicação que ninguém verifica hoje.

**Crie** `src/features/tactical-map/utils/__tests__/avatarTexture.test.ts`:

1. Duas chamadas com a **mesma** URL fazem **um** `fetch` só (espione com
   `vi.stubGlobal("fetch", vi.fn())`) — é o ponto do cache.
2. A URL requisitada leva o sufixo: sem query vira `?pixi=1`; com query existente vira
   `&pixi=1`.
3. `fetch` que resolve com `res.ok === false` → a promise resolve `null` (não rejeita).
4. `fetch` que rejeita → resolve `null` (não propaga a exceção).

Você vai precisar mockar `URL.createObjectURL` (jsdom não implementa):
`vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:fake" })` ou
`Object.defineProperty`. E limpar o cache entre testes — como ele é `const` de módulo,
use `vi.resetModules()` + `await import(...)` dinâmico em cada teste, ou exporte uma
função `__clearAvatarCacheForTests()` marcada como tal. **Prefira o `resetModules`**;
não adicione API de produção só para teste.

`getAvatarInsetShadowTexture` usa `document.createElement("canvas")` + `getContext("2d")`,
que jsdom não implementa de verdade — **não teste essa**. Só mova.

### 2.2 `stage/pixiViewportTypes.ts`

O bloco `declare module "react" { namespace JSX { ... } }` com o
`eslint-disable-next-line` que a Fase 1 adicionou.

**Atenção:** augmentação de módulo global só vale se o arquivo for **incluído** pelo
projeto TS. Um arquivo só com `declare module` e sem import/export é tratado como
script global — o que aqui é o que se quer, mas ele precisa ser importado por alguém
para entrar no build. Faça `import "./pixiViewportTypes";` no topo de
`ViewportInner.tsx` (que é quem usa `<pixiViewport>`). Se o `tsc` reclamar que
`pixiViewport` não existe em `IntrinsicElements`, é isso que está faltando.

### 2.3 `stage/stageProps.ts`

O `type Props` inteiro, exportado como `export type TacticalMapStageProps`. Ele é
consumido por `TacticalMapStage` **e** por `ViewportInner` (hoje `ViewportInner` declara
`Props` como seu próprio tipo de props).

Aproveite para corrigir uma imprecisão real: `ViewportInner` recebe hoje o `Props`
inteiro, incluindo `uploading`, que ele nunca usa. Ao extrair, dê a ele um
`type ViewportInnerProps = Omit<TacticalMapStageProps, "uploading"> & { onBgLoadingChange?: ... }`
— confira com o `tsc` quais campos ele realmente lê e não invente. **Isso é a única
mudança de tipo autorizada nesta task**; não mexa em nenhum campo do `Props` público.

### 2.4 As quatro camadas

`BgLayer.tsx`, `GridLayer.tsx`, `PiecesLayer.tsx`, `PieceSprite.tsx`.

Cada um: mover a função + seu `type ...Props` local + os comentários de bloco acima
dela. `PiecesLayer` importa `PieceSprite`. Nenhum deles ganha lógica nova.

Pontos de atenção por arquivo:

- **`GridLayer`**: o comentário de bloco acima dela (invariante §4.8 — desenhar em
  espaço de mundo com `applyTransform` por extremidade, e por que **não** um container
  com skew) é dos mais importantes do arquivo. Vai junto.
- **`PiecesLayer`**: é a maior (~250 linhas) e a mais perigosa. Tem três handlers de
  ponteiro que se cobrem (`handleUp` do stage, `handleWindowUp` de fallback,
  `handleMoveDOM`) e cada um tem comentário explicando por que existe. Mover em bloco,
  sem tocar em nada.
- **`PieceSprite`**: importa `getAvatarBlobUrl` e `getAvatarInsetShadowTexture` do
  módulo novo da Task 2.1.
- **`BgLayer`**: recebe `onBgPointerDown` cujo comentário no `ViewportInner` explica a
  ordem síncrona (invariante §4.3). Esse comentário está do lado do **consumidor**, no
  `ViewportInner` — garanta que ele siga para `ViewportInner.tsx`.

### 2.5 `stage/ViewportInner.tsx`

O que sobra: setup do viewport, os handlers de pan em `window`, o effect de
posicionamento de NPC, o `drawPlacementHover`, e a composição das camadas.

Este arquivo concentra os invariantes §4.1 a §4.4. Os quatro blocos de comentário —
o de "All listeners are on window", o do `requestAnimationFrame`/`pieceDragActiveRef`,
o do `bgDragState` síncrono, e o do `decelerate()` — **têm que estar neste arquivo ao
final**. Depois de mover, confirme:

```
grep -c "decelerate\|pieceDragActiveRef: piece onPointerDown\|listeners are on window" src/features/tactical-map/stage/ViewportInner.tsx
```

### 2.6 O que sobra em `TacticalMapStage.tsx`

`<Application>`, o `containerRef` com o handler de `wheel`, o `useLayoutEffect` do
estado de loading (invariante §4.5 — comentário junto), o overlay de carregamento e os
4 styled-components. ~180 linhas.

---

## Task 3 — Deduplicar `MapHandlesLayer`

`BgHandles` e `GridHandles` duplicam três coisas. Extraia as três **antes** de mexer
nos componentes.

### 3.1 `useShiftPressed`

Idêntico nos dois (hoje ~linhas 111–120 e ~294–303): um `useState` + um `useEffect`
com `keydown`/`keyup` de `Shift`.

**Crie** `src/features/tactical-map/hooks/useShiftPressed.ts`. Teste com `renderHook` +
`fireEvent` de `window`: pressionar Shift → `true`; soltar → `false`; e o listener é
removido no unmount (mesma verificação de leak da Fase 3).

### 3.2 `useHandleDrag`

O `startDrag` dos dois (hoje ~126–159 e ~311–343) tem a mesma forma: pega o viewport,
converte para mundo, guarda o estado inicial, registra `pointermove`/`pointerup`/
`pointercancel` em `window`, e no `up` limpa tudo e chama `onGestureEnd`.

A **única** diferença é o que roda no `move`: `computeNewBgFromDrag` num,
`gridFromHandleDrag` no outro — e o tipo do estado inicial (`startBg` vs `startGrid`).

Extraia como hook genérico:

```ts
// Um arraste de handle: registra os listeners de janela, converte o cursor para
// espaço de mundo, e delega o cálculo ao `compute` do chamador. Bracketa o gesto
// inteiro com onGestureStart/onGestureEnd para virar UM passo de undo.
export function useHandleDrag<TStart, TResult>(opts: {
  vpRef: React.MutableRefObject<Viewport | null>;
  getStart: () => TStart;
  compute: (handle: string, start: TStart, worldX: number, worldY: number, shift: boolean) => TResult | null;
  onResult: (r: TResult) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}): (handleId: string, shift: boolean, ex: number, ey: number) => void
```

**Preserve o padrão do ref de callback.** Hoje os dois fazem
`const onBgChangeRef = useRef(onBgChange); useEffect(() => { onBgChangeRef.current = onBgChange; })`
e chamam `onBgChangeRef.current(...)` dentro do listener. Isso existe para o listener
não capturar um callback velho no closure. O `onResult` do hook precisa do mesmo
tratamento — se você chamar `opts.onResult` direto de dentro do `onMove`, o arraste
passa a usar o callback do primeiro render e o `onGridChange` para de refletir
mudanças. **Este é o erro mais provável desta task.**

Diferença sutil a preservar: `BgHandles` guarda `aspectRatio` no estado do arraste e o
repassa ao `compute`; `GridHandles` não. Modele isso pondo o `aspectRatio` **dentro**
do `TStart` do lado do bg (ex.: `{ bg, aspectRatio }`), não como parâmetro extra do
hook.

### 3.3 `HandleMarker`

`BgResizeHandle` (~254) e `GridCornerHandle` (~476) são **idênticos** — mesmo corpo de
`draw`, mesmas props. Unifique num `HandleMarker` só, em
`src/features/tactical-map/stage/HandleMarker.tsx` (ou junto do `MapHandlesLayer`, se
preferir manter os quatro handles no mesmo arquivo).

`GridEdgeHandle` (~505) é **diferente** — desenha círculo, tem a afordância de skew com
Shift, e cor/tamanho variáveis. **Não force ele no mesmo componente.** Fica separado.

### 3.4 Aplicar

`BgHandles` e `GridHandles` continuam sendo dois componentes — eles têm geometria de
âncora genuinamente diferente (`pts` do bg segue rotação; o do grid passa por
`gridHandleLocal` + `applyTransform`). O que sai deles é só o triplo acima.

Meta: `MapHandlesLayer.tsx` de 543 para ~330 linhas.

---

## Verificação

1. `npx tsc -b` — limpo.
2. `npm test` — verde. Sobe pelos testes novos de `avatarTexture` e `useShiftPressed`
   (~10). **Nenhum teste pré-existente pode ter sido apagado ou afrouxado.**
3. Lint — zero erro na superfície do mapa:
   ```
   npx eslint src -f json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d);for(const f of r){const e=f.messages.filter(m=>m.severity===2);if(e.length&&/tactical-map|Map[A-Z]|Walls|stage\//.test(f.filePath))console.log(f.filePath,e.length)}})"
   ```
4. Tamanhos:
   ```
   wc -l src/features/tactical-map/TacticalMapStage.tsx src/features/tactical-map/stage/*.tsx src/features/tactical-map/MapHandlesLayer.tsx
   ```
   Nenhum acima de ~400 linhas. Se `PiecesLayer.tsx` ou `ViewportInner.tsx` passar
   disso, **não force** — anote no PR; quebrar mais fundo exige separar interação de
   render, e isso é decisão de design, não desta fase.
5. Invariantes — os comentários continuam no código:
   ```
   grep -rc "decelerate" src/features/tactical-map/stage/ViewportInner.tsx
   grep -rc "pixi=1" src/features/tactical-map/utils/avatarTexture.ts
   grep -rc "padding = 80" src/features/tactical-map/stage/PieceSprite.tsx
   grep -rc "OCULTO POR ORA" src/features/tactical-map/MapHandlesLayer.tsx   # deve dar 4
   ```

---

## Entrega

1. `./dev-checkout.sh refactor/tactical-map-fase-4-quebrar-stage`.
2. **Copie o `.env` do checkout principal para a worktree** se estiver usando uma — sem
   ele `VITE_WS_URL` fica indefinido e o lobby nunca conecta. Reinicie o Vite depois.
3. **Verificação visual — a mais extensa do refactor.** Esta fase move todo o código de
   interação Pixi, que não tem teste. Roteiro completo:

   **Editor de mapa:**
   - aba **Fundo**: adicionar imagem (overlay de carregamento aparece?), arrastar a
     imagem, redimensionar pelos 8 handles, redimensionar com Shift (livre), rotacionar
     pela esfera amarela, "Encaixar Grade".
   - aba **Grade**: quadrada e hexagonal; redimensionar pelos 4 cantos; Shift em TC/BC
     (perspectiva — o handle fica laranja e maior?); a borda branca acompanha.
   - aba **Peças**: arrastar NPC do roster; mover peça; realce **verde** em slot livre e
     **vermelho** em ocupado/fora; arrastar de volta pro roster; setas do teclado;
     Ctrl+Z e Ctrl+Shift+Z; a etiqueta `+Nm` de elevação; a sombra da peça.
   - aba **Paredes**: desenhar polilinha; Escape; botão direito; porta (auto-finaliza em
     2 cliques?); janela; parede de terreno (pontilhada?); porta trancada (marcador
     dourado?); selecionar; arrastar extremidade; Delete.
   - **Zoom e pan** em todas as abas: roda do mouse, arrastar o fundo do canvas, e
     confirmar que o mapa **não desliza depois de soltar** (invariante §4.4).
   - **Salvar** e recarregar a página: o mapa volta idêntico.

   **Lobby:** mestre arrasta peça; jogador clica em slot vazio e coloca o próprio
   personagem.

   **Partida ao vivo:** fog aparece; paredes vistas nítidas e lembradas esmaecidas;
   clicar numa porta abre/fecha **uma** vez (invariante §4.6 — se abrir e fechar no
   mesmo clique, o `LosSplit` está montando algo interativo duas vezes).

4. Só então abrir o PR.

**Título do PR:** `refactor(tactical-map): fase 4 — relocar pilha Pixi e quebrar TacticalMapStage`

No corpo: os dois commits, os tamanhos antes/depois, e a lista do roteiro visual que
você de fato executou.

---

## O que NÃO fazer

- **Não** mova `CharactersSidebar`, `RulesSidebar` ou `PageTabNav` — são compartilhados
  entre páginas e estão no lugar certo.
- **Não** toque nas 45 props do `MapEditorToolbar` — é a Fase 5. Nesta fase ele só
  **muda de pasta**.
- **Não remova os blocos `OCULTO POR ORA`.**
- **Não** una `BgHandles` com `GridHandles` num componente só. A geometria de âncora
  deles é genuinamente diferente; só o triplo da Task 3 é comum.
- **Não** corrija bug que encontrar. Anote no PR e siga — misturar correção com
  movimentação torna impossível saber qual das duas quebrou algo.
