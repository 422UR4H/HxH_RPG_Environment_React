# Polimento da mesa de combate — front — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** os 15 ajustes que o dono do produto levantou ao testar a Fase 8 — gesto de toque no
mapa, barras, véu da folha/gaveta, layout das abas, ordem da fila, HUD, Repelir, cor do
movimento e cancelar ação.

**Architecture:** cada ajuste mora na camada que já é dona do assunto — gesto no
`tactical-map/hooks`, barra no ion `ProgressBar`, véu no template `MatchStageTemplate` (com a
regra de página num hook), ordem da fila numa função pura ao lado do `QueuePanel`, dica num ion
`Tooltip` novo, cancelamento no reducer + `DeclaredActions`. Sem estado otimista.

**Tech Stack:** React 19 + TS strict (`verbatimModuleSyntax`: tipo só com `import type`),
styled-components com tokens, Vitest + Testing Library, PixiJS (sem teste — browser).

**Spec:** [`docs/superpowers/specs/2026-10-10-front-combat-table-polish-design.md`](../specs/2026-10-10-front-combat-table-polish-design.md)
— leia a seção do spec que a sua tarefa cita **antes** de começar. Contrato do back:
`../System_X_System/docs/dev/api/match-combat-ws.md` (`cancel_action`, `action_cancelled`).

**Branch:** `feat/combat-table-polish` (já criada a partir de `feat/combat-phase-8-regency`).

## Global Constraints

- TS strict; `import type` para tipos (`verbatimModuleSyntax`); `noUnusedLocals`/`noUnusedParameters`.
- **Sem cor crua** em styled-components: token em `src/styles/tokens.ts` (crie o token se faltar — 1 linha, nome pelo uso). Zona pixel-tuned intocada (`CharacterSheetHeader.tsx` e os três `*Diagram.tsx`).
- Componente compartilhado (2+ telas) vive em `src/components/<camada>/`; de uma feature só, em `src/features/<feature>/`. Promova, não duplique.
- Comentários em PT-BR explicando o porquê, na densidade dos vizinhos; texto de UI em PT-BR.
- Testes: Vitest + Testing Library, no estilo dos vizinhos em `__tests__/`. TDD onde há lógica. A camada Pixi (`src/features/tactical-map/stage/*`, `WallsLayer`, `IntentLayer`) não renderiza em teste — a lógica que der vai para função pura testada; o resto é verificado no browser pelo controlador.
- Verificação por tarefa: `npx tsc -b`, `npx eslint <arquivos tocados>`, `npx vitest run <testes tocados>`, e a suíte inteira `npm run test` antes do commit. (`npm run lint` global tem 2 erros pré-existentes em `src/features/sheet/*Diagram.tsx` — não são seus.)
- `git add` caminho por caminho; nunca `git add -A`/`.`/`commit -a`, nunca `stash`/`checkout` de arquivo que não é seu.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Arraste que começa sobre parede ou slot vazio e volta ao ponto de partida** não pode contar como toque (o reconhecedor olha o caminho, não só o fim).
2. **O véu nunca pode aparecer quando o painel pede toque no mapa** (compondo com ator, escolhendo casa/queda, Arrumar) — senão o fluxo de compor no celular quebra.
3. **Fila com duas ações do mesmo ator e mesmas barras** — a de maior velocidade primeiro; sem detalhe, chegada.
4. **`aria-disabled` no "Abrir próxima"** — o clique não pode mandar `open_next_action`.
5. **Cancelar uma ação que abriu no meio do caminho** — a recusa aparece no aviso e a linha continua coerente (passa a "em curso" pelo fluxo normal).

---

### Task 1: um reconhecedor de toque para o mapa (spec §1)

**Files:**
- Create: `src/features/tactical-map/hooks/tapGesture.ts`
- Test: `src/features/tactical-map/hooks/__tests__/tapGesture.test.ts`
- Modify: `src/features/tactical-map/hooks/useHoldGesture.ts` (a tolerância vem da constante nova)
- Modify: `src/features/tactical-map/WallsLayer.tsx` (o efeito "Viewer-mode door click", ~linha 258)
- Modify: `src/features/tactical-map/stage/PiecesLayer.tsx` (o slot vazio: `emptySlotPendingRef`, ~linhas 125, 367–390 e o `pointerdown` ~linha 490)

**Interfaces — Produces:**

```ts
/** Distância máxima (px de tela) que o ponteiro pode andar e o gesto ainda ser toque. */
export const TAP_TOLERANCE_PX = 6;

export type TapPointer = { pointerId: number; clientX: number; clientY: number; button?: number };

export function createTapTracker(tolerance?: number): {
  /** pointerdown. Só o botão primário (button 0 ou ausente) arma. Rearma se já armado. */
  down(e: TapPointer): void;
  /** pointermove. Andou mais que a tolerância desde a origem → desarma (virou arraste). */
  move(e: TapPointer): void;
  /** pointerup. true = foi toque (mesmo pointerId, nunca passou da tolerância). Sempre desarma. */
  up(e: TapPointer): boolean;
  /** pointercancel / desmontagem. */
  cancel(): void;
};
```

- [ ] **Step 1: testes que falham** — `tapGesture.test.ts`: down+up no mesmo ponto → true; andou 4px e soltou → true; andou 10px e **voltou** à origem antes de soltar → false (o caso que a cópia antiga errava); up sem down → false; up com outro `pointerId` → false; `cancel()` entre down e up → false; botão direito (`button: 2`) no down → up false; dois toques seguidos funcionam (up desarma).
- [ ] **Step 2:** rode e veja falhar.
- [ ] **Step 3:** implemente (closure, como `createHoldTracker`; sem React).
- [ ] **Step 4:** rode e veja passar.
- [ ] **Step 5: hold tracker** — em `useHoldGesture.ts`, `MOVE_TOLERANCE_PX` passa a ser `TAP_TOLERANCE_PX` importado (mesmo valor, 6; comente que é a mesma fronteira toque × arraste). `useHoldGesture.test.ts` continua verde.
- [ ] **Step 6: `WallsLayer`** — o efeito do clique de visualização passa a usar um tracker por efeito: `pointerdown` no `canvasEl` → `tracker.down(e)`; `pointermove` na `window` → `tracker.move(e)` (o ponteiro sai do canvas num arraste); `pointerup` no `canvasEl` → só se `tracker.up(e)` for true faz o hit-test e chama `onWallClickRef`; `pointercancel` na `window` → `tracker.cancel()`. Mantenha as guardas que já existem (`wallsInteractiveRef`, `onWallClickRef`, `vpRef`) e remova os quatro ouvintes no cleanup. Atualize o comentário do efeito: toque abre a caixa; arrastar o mapa por cima da parede não.
- [ ] **Step 7: `PiecesLayer`** — o slot vazio: onde hoje grava `emptySlotPendingRef.current = { slot, clientX, clientY, startClientX, startClientY }` (no `pointerdown` do Pixi), chame também `emptySlotTapRef.current.down({ pointerId, clientX, clientY, button })` (o evento federado do Pixi tem `pointerId`, `button`, `clientX/Y` — confira no código vizinho como ele já lê `clientX`; use o mesmo objeto). No efeito do `pointerup` (linhas ~371–390): acrescente `pointermove` na `window` → `tracker.move(e)`; troque o `Math.hypot(...) <= CLICK_THRESHOLD` por `tracker.up(e)`; `pointercancel` → `tracker.cancel()` e zera o pendente. Apague `CLICK_THRESHOLD` e os campos `startClientX/Y` que ficarem sem uso. O tracker é `useRef(createTapTracker())`.
- [ ] **Step 8:** `npx tsc -b`, eslint nos 5 arquivos, `npm run test`. Commit: `fix(mapa): toque × arraste num reconhecedor só — arrastar sobre parede não abre a caixa`.

### Task 2: as barras mostram o valor com zero (spec §3)

**Files:**
- Modify: `src/components/ions/ProgressBar.tsx`, `src/components/ions/ExpBar.tsx`
- Test: `src/components/ions/__tests__/ProgressBar.test.tsx` (novo; confira onde mora o teste da `ExpBar` — `grep -rl "ExpBar" src --include=*.test.tsx` — e ponha o novo ao lado), e o teste existente da `ExpBar`.

- [ ] **Step 1: testes que falham.** `ProgressBar`: renderiza `role="progressbar"` com `aria-valuenow=0`, `aria-valuemin=0`, `aria-valuemax=32` para `current=0 max=32`, e o texto "0/32" presente **fora** do elemento de preenchimento (dê ao preenchimento `data-testid="progress-fill"` e afirme que ele não contém o texto visível de base — a camada clara). `ExpBar`: com `currExp=0`, `mouseEnter` mostra o balão "0/100" (hoje não mostra).
- [ ] **Step 2:** rode e veja falhar.
- [ ] **Step 3: `ProgressBar`** — estrutura:

```tsx
<ProgressBarContainer>
  <BarBackground role="progressbar" aria-valuenow={current} aria-valuemin={min} aria-valuemax={max} $backgroundColor={backgroundColor}>
    <BarFill data-testid="progress-fill" $percentage={percentage} $color={color} />
    {/* Camada clara: lida sobre a trilha escura (o que não está preenchido). */}
    <Label $percentage={percentage} $tone="onTrack">{current}/{max}</Label>
    {/* Camada escura: a MESMA etiqueta, recortada na área preenchida. As duas juntas
        fazem o texto trocar de cor exatamente na borda do preenchimento. */}
    <FillClip $percentage={percentage} aria-hidden>
      <Label $percentage={percentage} $tone="onFill">{current}/{max}</Label>
    </FillClip>
  </BarBackground>
</ProgressBarContainer>
```

  `BarFill` vira só a cor (sem filhos), `height: 100%`; a altura da barra passa a vir da etiqueta
  na camada de fluxo — mantenha a altura visual de hoje (a etiqueta clara fica em fluxo normal com
  o mesmo `font-size: 3.8cqi`/`padding-top: 1px`; a camada recortada e o preenchimento ficam
  `position: absolute; inset: 0`). `Label`: `position: relative` (na clara) / `absolute` (na
  escura), `left: max(${p}%, 7ch + 8px)` com `transform: translateX(-100%)` e `padding-right:
  8px`, `white-space: nowrap`; cor `colors.textPrimary` (onTrack) ou `colors.textOnLight`
  (onFill); mesma fonte Oswald/peso 600 de hoje. `FillClip`: `clip-path: inset(0 ${100 - p}% 0 0)`.
  Limite `percentage` a [0, 100] e trate `max === min` como 0%. Ajuste visual fino é do
  controlador no browser — deixe a estrutura certa.
- [ ] **Step 4: `ExpBar`** — tire o `if (currExp > 0)` de `showTooltip` e do long-press.
- [ ] **Step 5:** rode, `npm run test`, commit `fix(ficha): barras mostram o valor com zero (HP, estamina e XP)`.

### Task 3: as abas da mesa no lugar certo (spec §2, §6, §8, §9, §10)

**Files:**
- Modify: `src/features/match/combat/MatchSheetPanel.tsx` (remove `Head`/`Close` e a prop `onClose`)
- Modify: `src/components/organisms/CharactersSidebar.tsx` (prop `fluid`)
- Modify: `src/features/match/MatchCharactersSidebar.tsx` (props `fluid` e `footer`, repassadas)
- Modify: `src/features/match/combat/EventStream.tsx` (prop `footer` dentro do contêiner que rola)
- Modify: `src/features/match/combat/QueuePanel.tsx` (sem "Detalhes": detalhe sempre aberto)
- Modify: `src/pages/GameMasterPage.tsx`, `src/pages/GamePlayerPage.tsx`
- Test: os testes vizinhos de cada um (`src/features/match/combat/__tests__/`, `src/pages/__tests__/` — `grep` pelo nome do componente)

- [ ] **Step 1: testes que falham** — QueuePanel: um item da fila com `action` mostra "Alvos:"/"Arma:" sem clique e não há botão "Detalhes". EventStream: `footer` aparece depois da última linha do histórico. MatchCharactersSidebar: `footer` aparece depois dos cards. MatchSheetPanel: sem botão "Fechar ficha" e sem o nickname fora da ficha. Testes existentes que clicam em "Detalhes" ou procuram "Fechar ficha" mudam junto (é o comportamento que o spec manda remover).
- [ ] **Step 2:** veja falhar.
- [ ] **Step 3: implemente.**
  - `CharactersSidebar`: `fluid?: boolean` → `width: ${fluid ? "100%" : "300px"}` (transient prop `$fluid` no styled). Só esta prop nova; nenhum outro chamador muda.
  - `MatchCharactersSidebar`: `fluid?: boolean`, `footer?: ReactNode`, repassados ao `CharactersSidebar` nos dois ramos.
  - `EventStream`: `footer?: ReactNode` renderizado dentro do `Container` (o que rola), depois das linhas; o efeito de rolar ao fim continua igual (ele usa `scrollHeight`, que já inclui o rodapé).
  - `QueuePanel`: apague `expanded`/`toggle`/`DetailsButton`/`aria-expanded`; renderize `QueueRowDetails` sempre que `detail` existe; atualize o comentário do componente (não há mais "expansível").
  - `MatchSheetPanel`: remova `onClose`, `Head`, `Close` (e imports que sobrarem).
  - `GameMasterPage`: tire `AddNpcPicker` e `DeclaredActions` do painel Agir; `AddNpcPicker` vai como `footer` de `MatchCharactersSidebar` (com `fluid`); `DeclaredActions` (com `showActor`) vai como `footer` do `EventStream`; `MatchSheetPanel` sem `onClose`.
  - `GamePlayerPage`: `DeclaredActions` sai do painel Ação e vira `footer` do `EventStream`; `MatchCharactersSidebar` com `fluid`.
  - `DeclaredActions` tem `padding: 0 12px 12px` — dentro do histórico, confira que o espaçamento fica coerente com as linhas do `EventStream` (ajuste o padding se precisar, por token/valor vizinho).
- [ ] **Step 4:** rode, `npm run test`, commit `feat(mesa): Pôr na partida em Personagens, declaradas no fim do Histórico, fila sem "Detalhes"`.

### Task 4: a fila do mestre na ordem de execução (spec §11)

**Files:**
- Create: `src/features/match/combat/queueOrder.ts`
- Test: `src/features/match/combat/__tests__/queueOrder.test.ts`
- Modify: `src/features/match/combat/QueuePanel.tsx`
- Test: o teste do QueuePanel

**Interfaces — Produces:**

```ts
export type OrderedQueueItem = { action: QueuedAction; inOrder: boolean };
/** A fila na ordem em que o mestre vai abrir (ver spec §11). */
export function orderQueue(queue: readonly QueuedAction[], order: BarsPayload["order"]): OrderedQueueItem[];
```

Consumes: `QueuedAction`, `BarsPayload`, `Bar` de `./combatMessages`. A velocidade de uma ação na
barra: `action` → `action.action?.speed?.rollCheck?.result`; `move` → `action.action?.move?.finalSpeed`
(confira os nomes em `QueuedActionDetail`/`HistoryAction`; se `finalSpeed` não estiver tipado, use
o que o tipo oferecer para a velocidade final do movimento e diga no relatório). Barra principal:
`action` se a ação a cobra, senão `move`. Mesmas barras = mesmo conjunto (reuse a ideia de
`sameBars` do QueuePanel — mova-a para `queueOrder.ts` e exporte, para não duplicar).

- [ ] **Step 1: testes que falham:** ordem `[B, A]` com fila `[A, B]` → `[B, A]`, ambos `inOrder`; mesmo ator e mesmas barras, velocidades 9 e 14, chegada 9 antes → 14 primeiro; empate de velocidade → chegada; ação fora da ordem vai ao fim com `inOrder: false`, na ordem de chegada; ordem vazia → fila na ordem de chegada, todos `inOrder: true` (ordem vazia também acontece antes do primeiro `bars_updated`; não se marca "próxima rodada" sem informação). Entrada da ordem sem ação correspondente na fila (a ação em andamento) é ignorada. Sem `action.action`: desempate só pela chegada.
- [ ] **Step 2:** veja falhar. **Step 3:** implemente. **Step 4:** veja passar.
- [ ] **Step 5: QueuePanel** — `queue.map` passa a ser `orderQueue(queue, order).map(({ action, inOrder }) => …)`; `!inOrder` mostra uma etiqueta "próxima rodada" (estilo do `OpenBadge`, cor `colors.textPlaceholderStrong`) com `title="Não cabe mais nesta rodada; abre na próxima"`. Teste no QueuePanel: duas linhas renderizadas na ordem do `order`, não da chegada.
- [ ] **Step 6:** `npm run test`, commit `feat(fila): a fila do mestre na ordem em que as ações vão abrir`.

### Task 5: o HUD — dica, "Abrir próxima", aviso e seleção de texto (spec §12, §13)

**Files:**
- Create: `src/components/ions/Tooltip.tsx`
- Test: `src/components/ions/__tests__/Tooltip.test.tsx` (ao lado do teste da `ExpBar`, se ele mora em outro lugar, siga ele)
- Modify: `src/features/match/combat/MasterControls.tsx` (`RegencyControls`)
- Modify: `src/pages/GameMasterPage.tsx` (passa os dados novos ao `RegencyControls`)
- Modify: `src/features/match/combat/MatchErrorBanner.tsx`
- Modify: `src/features/match/combat/combatErrorMessages.ts`
- Modify: `src/components/templates/MatchStageTemplate.tsx` (`user-select` no `Shell`)
- Test: testes vizinhos de `RegencyControls`/`MasterControls`, `MatchErrorBanner`, `combatErrorMessages`

**Interfaces — Produces:**

```tsx
/** Dica não clicável: hover (mouse) e foco mostram; toque mostra por TOUCH_MS. */
export default function Tooltip(props: { label: string; children: ReactNode; /** false = não mostra nunca */ enabled?: boolean }): JSX.Element;
```

- [ ] **Step 1: testes que falham.**
  - Tooltip: `pointerEnter` com `pointerType: "mouse"` mostra `role="tooltip"` com o texto e o filho ganha `aria-describedby` apontando para ela; `pointerLeave` esconde; `focus` no filho mostra, `blur` esconde; `click` com `pointerType: "touch"` (dispare `pointerDown` com `pointerType: "touch"` e depois `click`) mostra e some sozinha depois do tempo (fake timers); `enabled={false}` nunca mostra.
  - RegencyControls: regime `Race` com `orderLength=0` → botão "Encerrar rodada" habilitado e clicar chama `onOpenNext`; regime `Free` com `queueLength=0` → "Abrir próxima" com `aria-disabled="true"`, clicar **não** chama `onOpenNext`, e o hover mostra "A fila de ações está vazia"; `Free` com fila → "Abrir próxima" normal.
  - MatchErrorBanner: há um botão "Fechar aviso" que chama `onDismiss`; clicar no texto **não** chama `onDismiss`; continua sumindo em 6 s.
  - combatErrorMessages: `combatErrorText("game_error", "action queue is empty", "open_next_action")` → `"A fila de ações está vazia."`; `("game_error", "action not found in queue", "cancel_action")` → `"A ação já não está na fila."`; `("game_error", "action actor does not match player", "cancel_action")` → `"Essa ação não é sua."`; uma mensagem de domínio desconhecida continua com o prefixo de antes; `bySentType.cancel_action` = "Não foi possível cancelar a ação".
- [ ] **Step 2:** veja falhar.
- [ ] **Step 3: implemente.**
  - `Tooltip` (ion): wrapper `span` `position: relative; display: inline-flex`; estado `open`; `onPointerEnter`/`onPointerLeave` só para `pointerType === "mouse"`; `onFocus`/`onBlur` (captura, do filho); `onPointerDown` guarda o `pointerType` e `onClick` com o último `pointerType` de toque/caneta abre por `TOUCH_MS = 2500` (limpe o timer no unmount). A bolha: `role="tooltip"`, `id` via `useId`, posicionada abaixo do filho (`top: calc(100% + 6px)`, centralizada), `pointer-events: none`, `user-select: none`, `white-space: nowrap`, fundo `colors.grayBgDark`, texto `colors.textPrimary`, `fonts.sans` 12px, raio 4px, `z-index` acima da topbar. `aria-describedby` no filho com `cloneElement` (filho único) — ou, mais simples, o wrapper com `aria-describedby`; escolha e teste.
  - `RegencyControls`: props novas `queueLength: number`, `orderLength: number` (o `mode` já existe). `const endsRound = mode === "Race" && orderLength === 0; const empty = !endsRound && queueLength === 0;`. O `PrimaryButton` vira `aria-disabled={empty || undefined}`, texto `endsRound ? "Encerrar rodada" : "Abrir próxima"`, `onClick={empty ? undefined : onOpenNext}`, estilo de desabilitado quando `[aria-disabled="true"]` (mesma aparência do `:disabled` do `SmallButton` vizinho — reaproveite o token). Envolva em `<Tooltip label="A fila de ações está vazia" enabled={empty}>`. Na página: `queueLength={state.queue.length}`, `orderLength={state.bars?.order.length ?? 0}`.
  - `MatchErrorBanner`: o `Banner` deixa de ter `onClick`/`cursor: pointer`; ganha o `CloseButton` de `src/components/ions/CloseButton.tsx` (veja a API dele) com `aria-label="Fechar aviso"`, alinhado à direita (flex). O texto num `span`.
  - `combatErrorMessages`: `bySentType.cancel_action = "Não foi possível cancelar a ação"`; um `byGameMessage: Record<string, string>` com as três mensagens acima; em `combatErrorText`, se `code === "game_error"` e a mensagem está no mapa, devolva **só** a tradução (sem prefixo). Mantenha o comentário do arquivo coerente ("mapeia o código, nunca a prosa" ganha a exceção: as poucas mensagens de domínio que o contrato documenta e o usuário vê sempre).
  - `MatchStageTemplate` `Shell`: `user-select: none; -webkit-user-select: none;` e `& input, & textarea, & select { user-select: text; -webkit-user-select: text; }`, com um comentário (spec §13).
- [ ] **Step 4:** rode, `npm run test`, commit `feat(mesa): dica no "Abrir próxima", "Encerrar rodada", aviso com × e HUD sem seleção de texto`.

### Task 6: Repelir e a arma (spec §14)

**Files:**
- Modify: `src/features/match/combat/combatText.ts` (`weaponLabel`, e o texto corrido de `describeDeclared`)
- Modify: `src/features/match/combat/ReactionConfigDialog.tsx`
- Modify: `src/features/match/combat/useReactionControls.ts` (`quick` de repel abre a caixa)
- Modify: `src/features/match/combat/ActionComposer.tsx` (as opções de arma usam `weaponLabel`)
- Modify: `src/features/match/combat/QueuePanel.tsx` (`Arma:` usa `weaponLabel`)
- Test: testes vizinhos (`ReactionConfigDialog`, `useReactionControls`/`ReactionPanel`, `combatText`, `ActionComposer`)

- [ ] **Step 1: testes que falham.** `weaponLabel("Fist") === "Desarmado"`, `weaponLabel("LongSword") === "Long Sword"` (o comportamento de `humanWeapon`); `describeDeclared` de um ataque com `weapon: "Fist"` diz "desarmado" e não "com Fist". ReactionConfigDialog com `weapons=["Fist","Sword"]`: o select tem exatamente 2 opções, "Desarmado" e "Sword"; sem `defaultWeapon` vem "Desarmado" escolhido; enviar com Desarmado manda `weapon: "Fist"`. `quick(actorId, <botão de repelir>)` **não** envia — abre a caixa (`dialog` passa a existir com `initial` = o botão); os outros botões continuam enviando no toque.
- [ ] **Step 2:** veja falhar. **Step 3:** implemente:
  - `weaponLabel(name)`: `name === "Fist" ? "Desarmado" : humanWeapon(name)`. Substitua `humanWeapon` por `weaponLabel` onde for rótulo de arma (selects e "Arma:"). No texto corrido de `describeDeclared`: `Fist` vira " desarmado" em vez de " com Fist".
  - `ReactionConfigDialog`: tire `<option value="">Desarmado</option>`; o estado inicial é `defaultWeapon` se estiver em `weapons`, senão `"Fist"` (se `weapons` vier vazio — catálogo ainda carregando —, mantenha `"Fist"` como única opção para o select não ficar vazio). Envia `weapon` sempre (o servidor aceita `Fist`). Atualize o comentário da linha 49.
  - `useReactionControls.quick`: se o botão é o de repelir (`reactionKindOf(b, false) === "repel"`), chame o mesmo caminho de `configure(actorId, b)` em vez de enviar. Atualize o comentário (spec §14: a arma muda o resultado; a caixa já vem com a do rascunho).
- [ ] **Step 4:** `npm run test`, commit `fix(reação): Repelir sempre escolhe a arma; Fist e Desarmado viram uma opção só`.

### Task 7: a cor do movimento (spec §7)

**Files:**
- Modify: `src/styles/tokens.ts` (`pieceGhost` → `moveIntent` `#38bdf8`; `moveIntentBg` `rgba(56, 189, 248, 0.16)`; novo `intentOutline` `#0b1220`)
- Modify: `src/features/tactical-map/IntentLayer.tsx`, `src/features/match/combat/ActionComposer.styles.ts` e qualquer outro uso de `pieceGhost` (`grep -rn pieceGhost src`)

- [ ] **Step 1:** renomeie o token (o comentário diz o porquê: azul × laranja do ataque, convenção do gênero, verde já é do turno aberto — spec §7) e troque todos os usos.
- [ ] **Step 2:** `IntentLayer`: todo traço de `MOVE_COLOR` (stroke) é desenhado duas vezes — primeiro com `OUTLINE_COLOR = toPixiColor(colors.intentOutline)`, largura `+2`, `alpha` 0.55; depois o traço colorido como hoje. Faça isso com um helper local (`strokeTwice(g, draw, { color, width, alpha })` que chama `draw()` para o contorno, `g.stroke()`, e de novo para a cor) em vez de duplicar cada bloco. Preenchimentos (`setFillStyle`) não ganham contorno. **Leia o arquivo inteiro antes**: a ordem `moveTo/lineTo → setStrokeStyle → stroke` do Pixi 8 precisa ser respeitada; se o arquivo usar outra ordem, adapte e descreva no relatório.
- [ ] **Step 3:** `npx tsc -b`, `npm run test` (testes que leem o token pelo nome mudam junto), commit `feat(mapa): movimento em azul-ciano com contorno escuro`.

### Task 8: véu da folha e da gaveta em tela estreita (spec §4, §5)

**Files:**
- Create: `src/features/match/combat/useStageOverlays.ts`
- Test: `src/features/match/combat/__tests__/useStageOverlays.test.ts`
- Modify: `src/components/templates/MatchStageTemplate.tsx`
- Test: `src/components/templates/__tests__/MatchStageTemplate.test.tsx`
- Modify: `src/styles/tokens.ts` (`scrim: "rgba(0, 0, 0, 0.32)"`)
- Modify: `src/pages/GameMasterPage.tsx`, `src/pages/GamePlayerPage.tsx`

**Interfaces — Produces:**

```ts
export function useStageOverlays(): {
  panelOpen: boolean;
  setPanelOpen: (next: boolean | ((open: boolean) => boolean)) => void;
  asideOpen: boolean;
  setAsideOpen: (next: boolean | ((open: boolean) => boolean)) => void;
  /** Abaixo de asideUp a gaveta cobre o mapa: escolher algo nela que abre outra coisa a fecha. */
  closeAsideIfDrawer: () => void;
};
```

Regras do hook (spec §4–§5): `panelIsSheet = !useMediaQuery(\`(min-width: ${breakpoints.railUp}px)\`)`,
`asideIsDrawer = !useMediaQuery(\`(min-width: ${breakpoints.asideUp}px)\`)` (`src/hooks/useMediaQuery.ts`,
`src/styles/breakpoints.ts`). Estado inicial: painel aberto; gaveta aberta só a partir de
`asideUp` (é o `initialAsideOpen` que as duas páginas têm hoje — ele sai das páginas e mora aqui).
Abrir o painel com `panelIsSheet` fecha a gaveta; abrir a gaveta com `panelIsSheet` fecha o painel.
Fechar nunca mexe no outro.

Template — props novas:

```ts
/** O conteúdo do painel não pede toque no mapa: abaixo de railUp, um véu cobre o palco e o toque nele fecha o painel. */
panelDismissible?: boolean;
onDismissPanel?: () => void;
/** Abaixo de asideUp, com a gaveta aberta, um véu cobre o resto e o toque nele a fecha. */
onDismissAside?: () => void;
```

- [ ] **Step 1: testes que falham.**
  - Hook (mock de `window.matchMedia` por teste — o `src/test/setup.ts` devolve sempre `false`, ou seja, tela estreita; para tela larga sobrescreva com um mock que responde por query): estreito → `setAsideOpen(true)` fecha o painel; `setPanelOpen(true)` fecha a gaveta; aceitar updater `(o) => !o`; `closeAsideIfDrawer` fecha em estreito; em largura ≥ 1280 (`asideUp`) nada disso fecha o outro e `closeAsideIfDrawer` não faz nada; inicial: estreito = painel aberto, gaveta fechada; largo = os dois abertos.
  - Template: com `panelOpen` + `panelDismissible` + `onDismissPanel`, existe `data-testid="panel-scrim"` e o `click` nele chama `onDismissPanel`; sem `panelDismissible` não existe; com `asideOpen` + `onDismissAside` existe `data-testid="aside-scrim"` e o click chama; `pointerDown` no véu não propaga (um ouvinte de `pointerdown` na `window` não é chamado).
- [ ] **Step 2:** veja falhar. **Step 3: implemente.**
  - Template: `PanelScrim` renderizado **dentro** do `StageZone` (depois do `stage`), `position: absolute; inset: 0; z-index: 55` (acima dos avisos do palco — 50 — e abaixo da gaveta — 60; documente junto do `ASIDE_DRAWER_Z_INDEX`), fundo `colors.scrim`, `display: none` a partir de `media.railUp`. `AsideScrim` filho do `Middle`, `position: absolute; inset: 0; z-index: 55`, `display: none` a partir de `media.asideUp`. Os dois: `onPointerDown={(e) => e.stopPropagation()}` e `onClick={dismiss}`; `aria-hidden` (o fechar acessível continua sendo o rail/topbar). Atualize o comentário do template (o painel empurra o mapa **e**, quando não pede toque nele, vira modal).
  - Páginas: troquem os dois `useState` de painel/gaveta e o `initialAsideOpen` pelo hook. `onToggleAside={() => setAsideOpen((o) => !o)}`; `onDismissPanel={() => setPanelOpen(false)}`; `onDismissAside={() => setAsideOpen(false)}`; o `onSelectCharacterSheet` chama `closeAsideIfDrawer()`.
  - `panelDismissible` — mestre: `!(arranging || fallPicking || reactionPicking || (railActive === "agir" && !!actorId))`; jogador: `railActive === "ficha" || !actorId` **e** `!picking` (a aba Ação com personagem é o compositor). Comente a regra (spec §4).
- [ ] **Step 4:** `npm run test`, commit `feat(mesa): véu na folha e na gaveta em tela estreita — tocar fora fecha sem selecionar`.

### Task 9: cancelar uma ação declarada (spec §15)

**Pré-requisito:** o contrato do back (`../System_X_System/docs/dev/api/match-combat-ws.md`, seções `cancel_action` e `action_cancelled`). Leia as duas antes.

**Files:**
- Modify: `src/features/match/combat/combatMessages.ts` (tipos `CancelActionPayload`, `ActionCancelledPayload`, e `action_cancelled` na união de mensagens do servidor)
- Modify: `src/features/match/combat/normalizeWire.ts` (só se a união exigir um `case`; o `default` já repassa)
- Modify: `src/hooks/useMatchWs.ts` (`sendCancelAction`)
- Modify: `src/features/match/combat/useMatchCombat.ts` (`send.cancelAction`; confira como as mensagens do servidor chegam ao reducer — se há uma lista de tipos aceitos, inclua `action_cancelled`)
- Modify: `src/features/match/combat/combatReducer.ts` (`action_cancelled`)
- Create: `src/features/match/combat/CancelDeclaredDialog.tsx` (no molde de `ArrangeConfirmDialog.tsx` + `dialogStyles.ts`)
- Modify: `src/features/match/combat/DeclaredActions.tsx` (o "×" de ocultar vira "Cancelar"; prop `onHide` → `onCancel`)
- Modify: `src/pages/GameMasterPage.tsx`, `src/pages/GamePlayerPage.tsx`
- Test: `combatReducer` test, `DeclaredActions` test, `CancelDeclaredDialog` test, `useMatchWs` test se houver um que liste os envios

- [ ] **Step 1: testes que falham.**
  - Reducer: `action_cancelled { actionId }` remove da `queue` e de `declared` a entrada com aquele id; id desconhecido não muda nada (mesmo objeto de estado, ou igual em conteúdo — siga o padrão dos vizinhos).
  - DeclaredActions: linha "na fila" tem botão "Cancelar" que chama `onCancel(id)`; linhas "enviando…"/"em curso" não têm; não existe mais "Ocultar da lista".
  - CancelDeclaredDialog: com `pending` mostra "Cancelar esta ação?" + a descrição + "ela sai da fila e não acontece."; "Manter" chama `onKeep`; "Cancelar ação" chama `onConfirm`; `canConfirm=false` desabilita "Cancelar ação"; `pending=null` não renderiza.
- [ ] **Step 2:** veja falhar. **Step 3: implemente.**
  - `useMatchWs`: `sendCancelAction = (actionId: string) => sendRaw("cancel_action", { actionId })`, exportado junto dos outros; `useMatchCombat`: `send.cancelAction`.
  - Reducer `case "action_cancelled"`: filtra `queue` e `declared` pelo id (o fantasma do mapa deriva de `declared`, some junto).
  - Páginas: estado `cancelling: DeclaredAction | null`; `DeclaredActions onCancel={(id) => setCancelling(state.declared.find((d) => d.id === id) ?? null)}`; o diálogo com `describeDeclared` (e o nome do ator no mestre, como a linha mostra), `canConfirm={combat.status === "connected"}`, confirmar → `combat.send.cancelAction(cancelling.id)` e fecha o diálogo (sem estado otimista: a linha some com o `action_cancelled`). Se a linha deixar de estar "na fila" com o diálogo aberto (abriu, sumiu), feche o diálogo — derive: `const pending = cancelling && state.declared.some((d) => d.id === cancelling.id && d.status === "queued") ? cancelling : null`.
  - Tire `combat.dismissDeclared` das duas chamadas de `DeclaredActions` (o método continua existindo se outro lugar usa — `grep`; se ficar sem uso, mantenha-o: o `LostDeclaredNotice` usa `dismissLostDeclared`, confira e só remova o que ficar órfão de verdade).
  - Atualize o comentário de `DeclaredActions` ("o contrato ainda não tem verbo de cancelar" deixa de ser verdade).
- [ ] **Step 4:** `npm run test`, commit `feat(combate): cancelar uma ação declarada — confirmação e o mestre fica sabendo na hora`.

### Task 10: documentação

**Files:**
- Create: `docs/dev/match/combate-polimento-mesa.md`
- Modify: `CLAUDE.md` (seção "Feature: match combat": um ponteiro para o doc novo, uma frase)

- [ ] **Step 1:** o doc (PT-BR, no tom de `docs/dev/match/combate-fase-8.md`): uma seção por assunto — o reconhecedor de toque (e por que existe um só), a barra com texto em duas camadas, o véu (quando aparece, onde mora a regra, z-index), a ordem da fila (de onde vem e o desempate), "Abrir próxima"/"Encerrar rodada" e o `Tooltip` com `aria-disabled`, Repelir/Desarmado, a cor do movimento e o porquê, cancelar ação. Sem repetir o spec inteiro — o que um dev precisa para mexer ali.
- [ ] **Step 2:** commit `docs(combate): polimento da mesa`.
