# Cancelar ação — custo, "Custo:" e histórico — front — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** os textos de custo ("Custo:"), o aviso de Desvantagem no diálogo de cancelar e a ação
cancelada no histórico.

**Architecture:** só texto e um ramo novo no `historyRows`/`EventStream`, consumindo o contrato do
back (PR #86, `match-history.md`, evento `actionCancelled`).

**Tech Stack:** React 19 + TS strict, styled-components, Vitest + Testing Library.

**Spec:** [`docs/superpowers/specs/2026-10-10-front-combat-table-polish-design.md`](../specs/2026-10-10-front-combat-table-polish-design.md) **§16**.

**Branch:** `feat/combat-table-polish` (PR #72).

## Global Constraints

As mesmas do plano `2026-10-10-front-combat-table-polish.md` (TS strict, `import type`, tokens,
comentários em PT-BR, TDD, `git add` por caminho, trailer `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>`; verificação: `npx tsc -b`, eslint nos arquivos tocados, `npm run test`).

---

### Task 1: "Custo:" e o aviso no diálogo de cancelar (spec §16)

**Files:** `src/features/match/combat/QueuePanel.tsx` (linha "Cobra:"), `ReactionConfigDialog.tsx`
(`costText`), `combatText.ts` (um helper `costLabel(bars)` → "barra de ação" / "barra de
movimento" / "barras de ação e movimento", usado pelos dois), `CancelDeclaredDialog.tsx` (prop
`showSwapCost: boolean` → a linha do aviso), `src/pages/GameMasterPage.tsx` e
`GamePlayerPage.tsx` (passam `showSwapCost={state.roundMode === "Race"}`), testes vizinhos.

- [ ] Testes que falham: `costLabel` nos três casos; QueuePanel mostra "Custo: barra de ação"; a
  caixa da reação começa com "Custo: barra de ação." e mantém o resto da frase; o diálogo com
  `showSwapCost` mostra "Até o fim da rodada, o que este personagem fizer de novo rola a
  velocidade com Desvantagem." e sem ela não mostra.
- [ ] Implemente; `grep -rn "Cobra" src` não pode sobrar em texto de UI (comentários técnicos
  podem ficar). Commit `feat(combate): "Custo:" no lugar de "Cobra:" e o aviso de Desvantagem ao cancelar`.

### Task 2: a cancelada no histórico (spec §16; contrato `match-history.md` do PR #86)

**Pré-requisito:** o back da Task 3 do plano de back (`actionCancelled` em `rounds[].events`).
Leia a seção "O que não é turno" e o formato de `events[]` em
`/home/azzurah/Documentos/HxH_RPG_Environment_Project/System_X_System_Project/System_X_System/docs/dev/api/match-history.md`.

**Files:** os tipos do histórico (`grep -rn "roundModeChanged" src --include=*.ts`), `historyRows.ts`,
`EventStream.tsx` se o render de evento for por `kind`, testes vizinhos.

- [ ] Testes que falham: um evento `actionCancelled` com `action` vira a linha "Fulano cancelou:
  <describeDeclared da ação>"; sem `action`, "Fulano cancelou uma ação"; aparece na ordem do tempo
  entre os outros eventos e turnos; um `kind` desconhecido continua sendo ignorado como hoje.
- [ ] Implemente reaproveitando `describeDeclared` (adaptando a entrada se ela só aceita
  `DeclaredAction` — extraia a parte que descreve uma ação do wire, sem duplicar). Commit
  `feat(histórico): a ação cancelada aparece no histórico`.
