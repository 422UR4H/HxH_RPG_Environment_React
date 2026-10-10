# Polimento da mesa — segunda rodada — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** os cinco achados da segunda rodada de testes manuais do dono do produto (spec §17).

**Architecture:** só front. Arma padrão entra na resolução do rascunho (uma regra,
`defaultWeaponOf`); "Barras" sai da linha rolável; "Adicionar à partida" alinhado aos cards; o
pan do mapa só começa com alvo no canvas e termina sem botão pressionado; parede com cursor
`pointer` no hover.

**Tech Stack:** React 19, TS strict (`verbatimModuleSyntax`), styled-components, Vitest + Testing
Library, Pixi v8 + pixi-viewport (sem teste — `src/test/setup.ts` mocka `@pixi/react`).

**Spec:** [`docs/superpowers/specs/2026-10-10-front-combat-table-polish-design.md`](../specs/2026-10-10-front-combat-table-polish-design.md)
**§17** — leia §17 inteiro; o resto do spec é contexto da primeira rodada.

**Branch:** `feat/combat-table-polish` (PR #72).

## Global Constraints

- TS strict; `import type` para tipos. Sem hex/rgba cru fora de `src/styles/tokens.ts`.
- TDD onde há teste possível (tudo menos a camada Pixi). Testes nos arquivos `__tests__` vizinhos.
- Textos de UI em PT-BR. Comente o porquê na densidade dos vizinhos (PT-BR, como o código ao redor).
- Verificação por tarefa: `npx tsc -b`, `npx vitest run <arquivos tocados>`, `npx eslint <arquivos tocados>`; ao fim da tarefa, `npm run test` inteiro.
- `git add` caminho por caminho. Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Arma: o que a tela mostra como escolhida é exatamente o que `buildEnqueuePayload` envia.
2. Arma: escolha explícita de "Desarmado" (`Fist`) não é atropelada pelo padrão.
3. Pan: um `pointerdown` na camada HTML sobre o mapa (botões de reação, balões) não começa pan; no canvas, continua começando.
4. Pan: soltar o botão fora da janela / arraste nativo não deixa o mapa preso ao mouse.
5. Cursor da parede não fica "preso" em `pointer` ao sair do canvas.

---

### Task 1: a arma padrão é uma arma (spec §17, último item)

**Files:** `src/features/match/combat/actionDraft.ts` (+ `__tests__/actionDraft.test.ts`),
`src/features/match/combat/useActionComposerState.ts`, `src/features/match/combat/useGameTable.ts`,
`src/features/match/combat/ActionComposer.tsx`, `src/features/match/combat/ReactionConfigDialog.tsx`
(+ `__tests__/ReactionConfigDialog.test.tsx`).

- [ ] **Testes que falham:**
  - `defaultWeaponOf(["Fist", "Katana", "ThrowingDagger"]) === "Katana"`; `defaultWeaponOf(["ThrowingDagger", "Fist"]) === "ThrowingDagger"`; `defaultWeaponOf(["Fist"]) === undefined`; `defaultWeaponOf([]) === undefined`.
  - `resolveDraft(d, ctx, "Dash", "Katana")` com `d.attack = { targets: ["x"] }` → `resolved.attack.weapon === "Katana"` e `buildEnqueuePayload` manda `attack: { weapon: "Katana" }`. Com `d.attack.weapon = "Fist"` (escolha explícita) → continua `"Fist"`. Sem o 4º argumento → como hoje (`weapon` ausente).
  - `ReactionConfigDialog`: `weapons=["Fist","Katana"]`, sem `defaultWeapon`, Repelir → a opção marcada é Katana; com `defaultWeapon="Fist"` → Desarmado marcado (rascunho explícito vence); `weapons=["Fist"]` → Desarmado.
- [ ] **Implemente:**
  - `export function defaultWeaponOf(names: string[]): string | undefined` em `actionDraft.ts`: o primeiro nome `!== "Fist"`, na ordem dada. Comentário: regra única do padrão, a ser enriquecida.
  - `resolveDraft(draft, ctx, defaultCategory, defaultWeapon?: string)`: `attack` resolvido = `draft.attack ? { ...draft.attack, weapon: draft.attack.weapon ?? defaultWeapon } : undefined` (sem chave `weapon: undefined` quando nenhum dos dois existe, para não mudar igualdade nos testes atuais).
  - `useActionComposerState` ganha `defaultWeapon?: string` e o repassa a `resolveDraft` (inclua nas deps do `useMemo`).
  - `useGameTable` chama `useCombatCatalogue(token, actorId)` (a mesma query das páginas — o React Query reaproveita) e passa `defaultWeapon: defaultWeaponOf(catalogue?.weapons.map((w) => w.name) ?? [])`.
  - `ActionComposer`: `selectedWeapon = attack?.weapon ?? "Fist"` continua certo (agora o `attack` resolvido já traz o padrão) — só confira.
  - `ReactionConfigDialog`: o estado inicial vira `defaultWeapon && weapons.includes(defaultWeapon) ? defaultWeapon : defaultWeaponOf(weapons) ?? "Fist"`; atualize o comentário das linhas 49–50.
- [ ] Verificação, commit `feat(combate): Atacar e Repelir abrem com uma arma, não Desarmado`.

### Task 2: "Barras" sempre à vista e "Adicionar à partida" (spec §17, itens 3 e 4)

**Files:** `src/features/match/combat/GeneralBar.tsx` (+ teste se existir; senão crie `__tests__/GeneralBar.test.tsx` só se o comportamento for testável em jsdom — a mudança é de layout, então basta conferir que os testes atuais passam), `src/features/match/combat/MasterControls.tsx` (+ `__tests__/MasterControls.test.tsx`), `src/pages/__tests__/GameMasterPage.test.tsx` (strings), `src/features/match/MatchCharactersSidebar.tsx` (comentário).

- [ ] **GeneralBar:** dentro de `TopRow`, envolva `Turn`/`Idle`, `Order` e `Prices` num `Scroll` (`display:flex; align-items:center; gap:10px; flex:1; min-width:0; overflow-x:auto; white-space:nowrap; scrollbar-width:none`). `TopRow` deixa de rolar (`display:flex; align-items:center; gap:10px`). `StripToggle` fica fora do `Scroll`, irmão dele, `flex-shrink:0` (o `margin-left:auto` pode sair; `Prices` mantém o `margin-left:auto` dentro do `Scroll`).
- [ ] **AddNpcPicker:** rótulo "Adicionar à partida"; botão "Adicionar" ABAIXO do seletor (troque o `AddRow` horizontal por coluna: seletor e botão um sobre o outro, botão na largura do seletor). O bloco sem o recuo lateral de 12 px: não use `Picker` aqui (é o wrapper dos painéis com `padding: 12px 12px 0`); um wrapper próprio em coluna, `gap: 6px`, sem padding lateral — ele mora dentro da lista de cards, que já tem as margens dela. Atualize o JSDoc ("Adiciona à partida…") e a dica do `NpcPicker` (linha ~109): "Nenhum NPC nesta partida. Ponha um NPC no mapa ou em Personagens → Adicionar à partida."
- [ ] Testes: troque `"Pôr na partida"` → `"Adicionar à partida"` e o botão `"Pôr"` → `"Adicionar"` em `GameMasterPage.test.tsx` (linhas ~570, 692–696, 755–759) e onde mais aparecer (`grep -rn "Pôr na partida\|name: \"Pôr\"" src`). **Não** mexa em "Pôr no mapa" nem em "Pôr X em…" (Arrumar).
- [ ] Verificação, commit `feat(mesa): "Barras" fora da linha que rola; "Adicionar à partida" alinhado aos cards`.

### Task 3: o mapa — pan só no canvas, sem pan preso, parede com mãozinha (spec §17, itens 1 e 2)

**Files:** `src/features/tactical-map/stage/ViewportInner.tsx`, `src/features/tactical-map/WallsLayer.tsx`, `docs/dev/match/combate-polimento-mesa.md`.

Camada Pixi: **sem teste possível** (`@pixi/react` é mockado); a verificação é `tsc` + a suíte inteira (nada quebra) + o controlador verifica no browser.

- [ ] **Pan (`ViewportInner.tsx`, efeito "Viewport pan via DOM events", ~linha 212):** em `onWindowDown`, depois do `if (!canvas …) return;`, troque a checagem de retângulo por `if (e.target !== canvas) return;` (o retângulo deixa de ser necessário: se o alvo é o canvas, o ponto está nele). Comente o porquê: um card, a aba Histórico ou a camada HTML por cima do canvas recebem o toque, e o retângulo sozinho começava pan por baixo deles. Em `onWindowMove`, antes de mover (`if (!isPanningRef.current) return;` → logo depois), `if ((e.buttons & 1) === 0) { isPanningRef.current = false; return; }` com comentário: um `pointerup` perdido (arraste nativo, soltar fora da janela) deixava o mapa seguindo o mouse. Não mexa no ramo `bgDragState` (editor).
- [ ] **Cursor da parede (`WallsLayer.tsx`, efeito "Viewer-mode door click", ~linha 255):** no mesmo efeito, um `handleHover(e: PointerEvent)` no `pointermove` **do canvas** (`canvasEl.addEventListener("pointermove", …)`), e um `pointerleave` no canvas que limpa. Lógica: só `e.pointerType === "mouse"` e `e.buttons === 0`; se `wallsInteractiveRef.current` ou `!onWallClickRef.current` → limpa; senão o MESMO teste de acerto do `handleViewerClick` (extraia o cálculo `screen → world → raw → findNearestWall(…, HIT / vpScaleRef.current)` para uma função local usada pelos dois, sem duplicar) e aplique `canvasEl.parentElement.style.cursor = hit ? "pointer" : ""`. Comente por que no PAI (o Pixi reescreve `canvas.style.cursor` a cada movimento — `inherit` fora de objeto interativo, `pointer` na peça). No cleanup do efeito, limpe o cursor do pai. Use o retângulo do `canvasEl` (não `e.target`) no cálculo, já que o alvo agora é sempre o canvas.
- [ ] **Doc:** em `docs/dev/match/combate-polimento-mesa.md`, uma seção nova antes de "Limites conhecidos", "Segunda rodada (spec §17)", curta: pan só com alvo no canvas + fim sem botão; cursor da parede no pai do canvas e por quê; arma padrão `defaultWeaponOf` na resolução do rascunho; "Barras" fora da linha rolável; "Adicionar à partida". Atualize a menção a "Pôr na partida" da linha ~176.
- [ ] Verificação (`npx tsc -b`, `npm run test`, eslint nos dois .tsx), commit `fix(mapa): pan só a partir do canvas e sem ficar preso; parede com cursor de clique`.
