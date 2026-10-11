# Parede como alvo — plano de implementação

Spec: `docs/superpowers/specs/2026-10-10-front-wall-as-target-design.md`. Branch `feat/wall-as-target`.
TDD nas partes puras; zona Pixi verificada no browser.

1. **`tactical-map/utils/wallReach.ts`** (+ teste): `wallContactSlots(wall, grid)`,
   `localToSlot`/`slotToLocal` em `coords.ts`, `isPathClear(from, to, walls, grid)`.
2. **`reach.ts`**: `approachReach({ actor, reach, grid, isFree, isPathClear })`; `approachSlot`
   delega. Testes existentes seguem verdes; novos para alcance de parede e caminho bloqueado.
3. **`wallVerbs.ts`** (+ teste): `actorWallVerbs`, `masterWallVerbs`, `WALL_TYPE_LABELS`,
   `ACT_LABELS`, `wallName`.
4. **`actionDraft.ts`**: `attack` → `act` com `kind`; `chooseWallTarget`, `setActKind`; `targetOf`
   no `ReachContext`; `resolveDraft` com alcance genérico, normalização de verbo e `act.verbs`;
   `draftVerdict` com `act`; `buildEnqueuePayload` com `interact`; `draftFromDeclared` com
   interact; chave v3. Atualizar `actionDraft.test.ts`.
5. **`useActionComposerState`**: `walls` como entrada; `targetOf`; `onWallTap`; `preview` com
   paredes; `isWallTappable`.
6. **`intentGeometry`/`IntentLayer`**: `IntentPreview.targetWalls`; destaque + linha de ataque.
7. **Toque consumido**: `consumeTap`/`isTapConsumed`; `WallsLayer` (consome + filtra por
   `isWallTappable`); `PiecesLayer` respeita; plumbing `isWallTappable` em
   Viewer → Stage → ViewportInner → WallsLayer.
8. **`ActionComposer`**: rótulo do interruptor, seletor de verbo, armas só em ataque, rótulo do
   declarar. Atualizar `ActionComposer.test.tsx`.
9. **Páginas**: jogador → `onWallClick` vai ao compositor; mestre → com NPC idem, sem NPC card
   `WallMasterCard` no Agir. Remover `WallActionSheet` e o `fromComposer: false` se ficar sem uso.
   Atualizar testes de página.
10. **`nameOf`** com paredes; `describeAction` nomeia a passagem.
11. Doc `docs/dev/match/combate-parede-alvo.md` + ponteiro no `CLAUDE.md`.
12. `npm run lint && npm run build && npm run test`; browser (mestre: NPC longe → toca porta →
    aproxima + abrir; atacar com arma; sem NPC → card); PR.
