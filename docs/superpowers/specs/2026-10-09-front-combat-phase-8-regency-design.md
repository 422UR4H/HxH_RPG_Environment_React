# Fase 8 do combate no front — Regência — design

> **Escopo:** o mestre edita a ação aberta no painel de resolução (F7): **viés, ajuste e motivo**
> de cada rolagem que muda o desfecho, e a **troca da perícia do dano** (Push ↔ Grab). Com isso o
> painel fica completo. **Um PR, repo `System_X_System_React`.**
>
> Documento mestre: `System_X_System/docs/superpowers/specs/2026-09-20-front-combat-phases.md`
> §8, §6A.6 F7, §4.6, §11.1, §0.2.
> Contrato: `System_X_System/docs/dev/api/match-combat-ws.md` — `edit_action` (com a tabela "o que
> cada rolagem muda com o turno aberto"), `action_edited`, `resolution_updated` (`damageSkill`,
> `conditions`), `match_full_state.resolution`. Escrito pelo PR #85 do back (branch
> `feat/combat-phase-8-regency-back`).
> Motor: `System_X_System/docs/dev/match/combat-engine.md`, "A edição do mestre".
> Plano: [`../plans/2026-10-09-front-combat-phase-8-regency.md`](../plans/2026-10-09-front-combat-phase-8-regency.md).
>
> **Branch:** `feat/combat-phase-8-regency`, a partir de `main` em `f37bddf` (depois do PR #70).

## 0. O workflow (cópia do §0.1 do documento mestre)

1. **Uma sessão por fase por repo.** Back e front rodam em paralelo quando não tocam arquivo em
   comum — são repos diferentes, então normalmente não tocam.
2. A sessão **lê o documento mestre e o contrato**, escreve o **design spec** e o **plano**, e
   **para** para o dono do produto revisar.
3. **Lacuna ou contradição: liste e pare.** Ela volta para o autor do documento, que corrige o
   texto. Não se contorna, e não se decide regra de jogo por conta.
4. Aprovado o spec, a sessão **compacta** e implementa **lendo o próprio plano do disco**.
5. Implementação por **subagent-driven-development**, uma tarefa por subagente.
6. **Verificação no browser, com três contas** (`test@`, `test2@`, `test3@mail.com`, senha
   `12345678`): um mestre e dois jogadores, jogando o caminho que o usuário faz.
7. PR aberto dizendo o que foi verificado e **o que não foi**.

> **Neste PR:** o dono do produto autorizou (2026-10-09) seguir do spec direto para a
> implementação e o PR sem parar para revisão; lacunas continuam parando. O back desta fase está
> no PR #85, ainda não mergeado: o front é verificado contra a branch dele.

## 1. O que você precisa saber antes

- O painel de resolução é `ResolutionDetails` (`src/features/match/combat/`), dentro do card "em
  andamento" do `QueuePanel`, só na página do mestre (`GameMasterPage`). Ele já tem dois botões:
  **Dar a palavra** (Fase 7) e **Escolher onde cai** (F14).
- A resolução do turno aberto chega por `resolution_updated` e, ao reconectar, por
  `match_full_state.resolution`; o reducer guarda em `state.openResolution`. `normalizeResolution`
  espalha o payload, então campos novos passam sem código novo.
- `combat.send.editAction` (`useMatchWs.sendEditAction`) já existe; hoje só manda
  `escapeLanding`. O erro de um envio aparece no banner, prefixado por "Não foi possível editar a
  ação" (`combatErrorMessages.ts`); `game_error` vai com o texto do servidor.
- **O contrato decide o que é editável.** Da tabela "o que cada rolagem muda com o turno aberto":

  | Rolagem | Onde aparece no painel | Viés? |
  |---|---|---|
  | `hit` | bloco **Acerto** (só se a ação tem ataque) | sim (rolada) |
  | `damage` | bloco **Dano** (só se a ação tem ataque) | **não** — o servidor recusa; só ajuste |
  | `dodge` | alvo cuja reação **aberta** é `dodge`, `closedDodge`, `escape`, `escapeGuard`, `closedEscape` | sim |
  | `defense` | reação aberta `dodge`, `closedDodge`, `escapeGuard` (a defesa padrão) | **não** — passiva |
  | `repel` | reação aberta `repel` | sim |
  | `moveSpeed` | reação aberta `escape`, `escapeGuard` | sim |
  | `moveSpeed` | reação aberta `closedEscape` | **não** — passiva (Shift) |

  **Não aparecem:** `speed`, o `moveSpeed` da própria ação, `feint`, perícias (`skillName`) e a
  `Evasion` das fechadas (decisão do dono, §8 do documento mestre). Num `closedDodge`/`closedEscape`
  o campo `dodge` edita só o **Reflexo**; a esquiva lida é o pior entre Reflexo e Evasion, por isso
  o rótulo ali é "Reflexo".
- **A ação tem ataque** ⇔ `resolution.damageSkill` presente (o contrato só o manda com ataque).
- `resolution.conditions` são as condições **em vigor** (só o mestre, só com turno aberto):
  `{actionId, field?, skillName?, bias, modifier, description?}`. `actionId` é sempre o ID real —
  o da ação do turno também. Um alvo com reação aberta tem `reaction.reactionId`; a ação do turno é
  editada **sem** `actionId` (ausente = a ação própria) e é reconhecida, em `conditions`, como a
  entrada cujo `actionId` não é de reação nenhuma do turno.
- **Cancelar é editar de volta.** Uma entrada zerada (`{ field }` sem viés, ajuste nem motivo)
  devolve a rolagem a "sem condição" e apaga a captura. Não há verbo de confirmação.

## 2. O desenho

### 2.1 O modelo: `rollEdits.ts` (puro)

Um módulo puro decide **o que é editável** a partir do `ResolutionPayload` e monta os payloads.

- `editableRolls(resolution)` → lista de `EditableRoll`:
  `{ key, actionId?: string, field: ConditionField, label: string, allowsBias: boolean, current?: RollCondition, targetId?: string }`.
  - Da ação (só com `damageSkill` presente): `hit` (rótulo "Acerto", viés sim) e `damage` (rótulo
    "Dano", viés não), `actionId` ausente.
  - De cada alvo com `reaction` aberta, pela tabela de §1, com `actionId = reaction.reactionId`.
  - `current` vem de `conditions`: a entrada com o mesmo `field` e o mesmo `actionId`; para a ação,
    a entrada com o `field` cuja `actionId` não é `reactionId` de nenhum alvo nem de
    `pendingReactions`.
- `conditionPayload(roll, draft)` → `EditActionPayload` `{ actionId?, conditions: [{ field, bias?, modifier?, description? }] }`,
  com `bias` só quando `allowsBias`, chaves zeradas omitidas.
- `clearPayload(roll)` → a entrada zerada (`{ field }`) — o "Desfazer".
- `damageSkillPayload(skill)` → `{ damageSkill: skill }`.
- `describeCondition(c)` → o texto curto em vigor: "vantagem · +2 · escuridão".

### 2.2 A tela

- **Cada rolagem editável ganha um botão "Editar"** na linha dela, e, se há condição em vigor, um
  resumo ao lado ("vantagem · −2 · escuridão") em cor de destaque, para o mestre ver de relance o
  que mexeu.
  - Acerto: a linha do bloco **Acerto**.
  - Dano: um bloco **Dano** novo logo abaixo do Acerto, com "medido por **Push**/**Grab**" (o
    seletor, §2.3) e o "Editar" do ajuste.
  - Alvo: uma linha por rolagem editável da reação aberta ("Esquiva 12 · Editar", "Defesa padrão
    15 · Editar", "Aparo 17 · Editar", "Movimento · Editar"), com o total que o cálculo já mostra
    quando existe (`dodgeTotal`, `defenseTotal`, `reaction.total`).
- **O editor** (`RollConditionEditor`) abre **inline**, embaixo da linha — um por vez no painel:
  - **Viés:** três botões, "Desvantagem / Normal / Vantagem" (−1/0/+1), só quando `allowsBias`;
  - **Ajuste:** campo numérico (inteiro, aceita negativo);
  - **Motivo:** campo de texto curto, opcional;
  - **Aplicar** manda o `edit_action` e fecha; **Desfazer edição** (só com condição em vigor)
    manda a entrada zerada e fecha; **Cancelar** fecha sem mandar.
  - Abre preenchido com a condição em vigor (`current`), ou neutro.
  - "Aplicar" com tudo neutro equivale a desfazer (o servidor trata igual) — o botão manda a
    entrada zerada; não há caso especial.
- **Sem estado otimista.** O número muda quando o `resolution_updated` recomputado chega; o resumo
  em vigor vem de `conditions` desse mesmo payload. Um erro do servidor aparece no banner, como os
  outros envios.
- O editor **fecha sozinho** quando a rolagem dele deixa de existir na resolução (o turno mudou, a
  reação sumiu) — ele é indexado pela `key` da rolagem e pelo `turnId`.

### 2.3 A perícia do dano

- Bloco **Dano**: "medido por" + dois botões de alternância **Push** e **Grab**, com o atual
  (`resolution.damageSkill`) marcado. Clicar no outro manda `{ damageSkill }` na hora — é uma
  escolha de dois valores, não precisa de "Aplicar"; voltar a Push é clicar em Push (apaga a
  captura no servidor).
- Se o servidor disser uma perícia que não é nenhuma das duas (o contrato aceita qualquer uma do
  enum), ela aparece como terceiro botão marcado, só para leitura do estado.

### 2.4 Onde as peças moram

- `src/features/match/combat/rollEdits.ts` — o modelo puro (§2.1).
- `src/features/match/combat/RollConditionEditor.tsx` — o editor inline.
- `src/features/match/combat/ResolutionDetails.tsx` — monta as linhas, o bloco Dano e o editor;
  prop nova `onEditAction?: (payload: EditActionPayload) => void`. Sem ela, **nenhum** botão de
  edição (preserva o teste "sem onOpenReaction, não tem botão nenhum").
- `QueuePanel.tsx` — repassa `onEditAction`. `GameMasterPage.tsx` — passa `combat.send.editAction`.
- `combatMessages.ts` — `ResolutionPayload.damageSkill?`, `conditions?`, tipos `RollCondition`,
  `ConditionField`, `ConditionEdit`; `EditActionPayload` alargado (todas as seções opcionais,
  `actionId?`).
- Tudo de feature (`features/match/combat`), nada promovido a `components/`: só o mestre usa.
  Cores e fontes por tokens (`colors`, `fonts`).

## 3. Resiliência (§0.2)

| Acontece | Resultado |
|---|---|
| **O mestre recarrega no meio de uma edição** | O `match_full_state.resolution` traz `conditions` e `damageSkill` (back §4): o painel mostra os números editados, o resumo em vigor e a perícia marcada. O rascunho de um editor aberto e não aplicado se perde — é rascunho de UI, não estado da partida. Nada é reenviado |
| **Um jogador recarrega** | Nada muda para ele: a resolução aberta é só do mestre, e o servidor não manda a edição a ninguém mais |
| **O servidor reinicia com o turno aberto** | O turno se perde inteiro (contrato §8), as edições junto; o `match_full_state` chega sem `resolution` e o painel some. Nada é reenviado |
| **A conexão cai entre o envio e o `resolution_updated`** | O editor já fechou; ao reconectar, o `match_full_state` mostra se a edição entrou |

## 4. Verificação

- **Testes (vitest):** `rollEdits` (o que é editável por tipo de reação; viés só onde cabe;
  `current` casado por `actionId`, inclusive a ação sem `actionId`; payloads; entrada zerada);
  `RollConditionEditor` (preenche com o atual, aplica, desfaz, cancela, esconde o viés);
  `ResolutionDetails` (botões só com `onEditAction`; resumo em vigor; seletor Push/Grab manda
  `damageSkill`; linhas por tipo de reação; nada para `Evasion`/`speed`).
- **Browser, três contas** (§0.1 passo 6), contra o back da branch do PR #85: o mestre (test@) num
  ataque de um jogador (test2@) a outro (test3@, por script WS) com reação aberta:
  editar o acerto (vantagem + ajuste + motivo) e ver o total mudar; trocar Push → Grab e ver o dano
  bruto mudar; editar a esquiva/defesa/aparo da reação; **recarregar o mestre** e ver o resumo e a
  perícia mantidos; desfazer e ver o número voltar; o jogador **nunca** vê nada disso antes de o
  turno fechar; fechar o turno.

## 5. Decisões desta sessão, para o revisor confirmar

| # | Decisão | Por quê |
|---|---|---|
| F1 | Só reações **abertas** ganham edição; as pendentes (anexadas, não abertas) não | O servidor aceita, mas uma reação pendente não entra no cálculo — editar e não ver efeito é o "controle que não muda nada". Abrir e então editar cobre o caso |
| F2 | Editor inline, um por vez, com Aplicar/Desfazer/Cancelar | Mobile-friendly (o painel é bottom sheet no celular) e sem um diálogo a mais; um por vez evita dois rascunhos competindo |
| F3 | Push/Grab manda na hora, sem "Aplicar" | Escolha binária e reversível com um toque; o servidor apaga a captura ao voltar |
| F4 | Sem estado otimista | O servidor é a fonte (§0.2); o recálculo chega em milissegundos e é o único número verdadeiro |
| F5 | "Reflexo" em vez de "Esquiva" nas reações fechadas | O campo `dodge` ali edita só o Reflexo, e a esquiva lida é o pior dos dois — chamar de "Esquiva" prometeria mover o total que talvez não mova |
