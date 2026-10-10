# Fase 8 do combate no front — Regência

> Spec: `docs/superpowers/specs/2026-10-09-front-combat-phase-8-regency-design.md`.
> Plano: `docs/superpowers/plans/2026-10-09-front-combat-phase-8-regency.md`.
> Contrato: `System_X_System/docs/dev/api/match-combat-ws.md` — `edit_action`, `action_edited`,
> `resolution_updated` (`damageSkill`, `conditions`) e `match_full_state.resolution`
> (PR #85 do back, branch `feat/combat-phase-8-regency-back`).

Este documento vem **depois** de `combate-fase-7.md`. Onde discordam, vale este. A Fase 8 só
existe na página do **mestre**: o jogador nunca recebe nada disso antes de o turno fechar.

## O que o mestre vê

O painel de resolução (`ResolutionDetails`, dentro do card "em andamento" do `QueuePanel`) já
tinha "Dar a palavra" e "Escolher onde cai". Agora cada rolagem que muda o desfecho tem um
botão **Editar**, e o painel fica completo.

| Peça | O que o mestre vê |
|---|---|
| Linhas editáveis da ação | Só quando a ação tem ataque: **Acerto** (viés + ajuste) no bloco Acerto e **Dano** (só ajuste) num bloco Dano novo, logo abaixo. Nessas duas o botão é "Editar" sem rótulo próprio ao lado: o bloco já nomeia a rolagem. |
| Linhas editáveis por reação **aberta** | `dodge`: Esquiva (viés) e Defesa padrão (só ajuste). `closedDodge`: **Reflexo** (viés) e Defesa padrão. `escape`: Esquiva e Movimento (viés). `escapeGuard`: Esquiva, Defesa padrão e Movimento. `closedEscape`: **Reflexo** (viés) e Movimento (só ajuste). `repel`: Aparo (viés). Cada uma é uma linha dentro do bloco do alvo. |
| Total na linha | Esquiva mostra `dodgeTotal`, Defesa padrão `defenseTotal`, Aparo `reaction.total`. **Movimento não mostra total** (o painel não tem esse número à mão). |
| Resumo em vigor | Ao lado de "Editar", em cor de aviso (`warningText`), o texto da condição que o servidor tem: "vantagem · −2 · escuridão". Vem de `resolution.conditions`, não do que o mestre digitou. |
| Editor | Abre **inline**, embaixo da linha, um por vez: viés (Desvantagem / Normal / Vantagem, só onde cabe), Ajuste (inteiro, aceita negativo), Motivo (até 80 caracteres, opcional) e os botões Aplicar, Desfazer edição (só com condição em vigor) e Cancelar. Abre preenchido com a condição em vigor. |
| Push / Grab | No bloco Dano, "medido por" com dois botões de alternância; o atual (`resolution.damageSkill`) fica `aria-pressed`. Clicar no outro manda `{ damageSkill }` na hora, sem Aplicar; clicar no que já está marcado não manda nada. Uma perícia fora das duas aparece como terceiro botão marcado e **desabilitado** (só leitura). |

Sem `onEditAction`, o `ResolutionDetails` não desenha **nenhum** botão de edição (nem o bloco
Dano): o teste "sem onOpenReaction, não tem botão nenhum…" continua valendo. A página do mestre
passa `combat.send.editAction` pelo `QueuePanel`.

## O modelo: `rollEdits.ts`

Módulo puro. Decide **o que é editável** a partir do `ResolutionPayload` e monta os payloads.

`editableRolls(resolution)` devolve `EditableRoll[]` (`key`, `actionId?`, `field`, `label`,
`allowsBias`, `current?`, `targetId?`), na ordem do painel: primeiro as da ação, depois as de cada
alvo com `reaction` aberta, na ordem de `targets[]`. A tabela do contrato, como está no código
(`REACTION_ROLLS`):

| Reação aberta | Rolagens (campo → rótulo, viés?) |
|---|---|
| `dodge` | `dodge` → Esquiva, sim · `defense` → Defesa padrão, **não** |
| `closedDodge` | `dodge` → Reflexo, sim · `defense` → Defesa padrão, **não** |
| `escape` | `dodge` → Esquiva, sim · `moveSpeed` → Movimento, sim |
| `escapeGuard` | `dodge` → Esquiva, sim · `defense` → Defesa padrão, **não** · `moveSpeed` → Movimento, sim |
| `closedEscape` | `dodge` → Reflexo, sim · `moveSpeed` → Movimento, **não** |
| `repel` | `repel` → Aparo, sim |
| ação com ataque | `hit` → Acerto, sim · `damage` → Dano, **não** |

- **Viés só onde cabe.** `allowsBias` é falso onde a leitura não tem dado para o viés escolher:
  o dano (o servidor recusa), a defesa padrão e o movimento do `closedEscape` (passivos). O
  editor esconde os botões de viés e `conditionPayload` ignora o viés do rascunho.
- **Não aparecem:** `speed`, o `moveSpeed` da própria ação, `feint`, perícias (`skillName`) e a
  `Evasion` das fechadas (decisão do dono, §8 do documento mestre). Tipo de reação fora da
  tabela não gera linha.
- **Ação com ataque ⇔ `resolution.damageSkill` presente** (o contrato só o manda com ataque).
- **A ação sem `actionId`.** O `edit_action` da ação do turno vai **sem** `actionId`; as das
  reações vão com `actionId = reaction.reactionId`. Mas em `resolution.conditions` o `actionId`
  é sempre o ID real, inclusive o da ação. Como o painel não o tem à mão, a condição da ação é
  a entrada com o `field` certo cujo `actionId` **não** é de nenhuma reação do turno (aberta, em
  `targets[].reaction`, ou pendente, em `pendingReactions`). A das reações casa por `field` +
  `actionId`.
- `conditionPayload(roll, draft)` monta `{ actionId?, conditions: [{ field, bias?, modifier?,
  description? }] }`: omite as chaves zeradas, apara o motivo e, com tudo neutro, devolve o
  desfazer. `clearPayload(roll)` é a entrada zerada `{ field }`. `damageSkillPayload(skill)` é
  `{ damageSkill }`. `describeCondition(c)` gera o resumo em vigor (sinal de menos U+2212).
- **Cancelar é editar de volta.** A entrada zerada devolve a rolagem a "sem condição" e apaga a
  captura no servidor. Não há verbo de confirmação, e "Aplicar" com tudo neutro **é** o desfazer.

## Sem estado otimista, e §0.2

Nada do que o mestre faz muda o painel por conta própria. "Aplicar" manda o `edit_action` e
fecha o editor; o número novo, o resumo em vigor e a perícia marcada só mudam quando o
`resolution_updated` recomputado chega (F4). Um erro do servidor aparece no banner, prefixado
por "Não foi possível editar a ação" (`combatErrorMessages.ts`).

O editor aberto é **derivado**, não efeito: é indexado por `turnId` e pela `key` da rolagem e
some sozinho quando o turno muda ou a rolagem deixa de existir (a reação sumiu).

| Acontece | Resultado |
|---|---|
| O mestre recarrega no meio de uma edição | O `match_full_state.resolution` traz `conditions` e `damageSkill`: o painel mostra os números editados, o resumo e a perícia. O rascunho de um editor aberto e não aplicado se perde (é rascunho de UI). Nada é reenviado. |
| Um jogador recarrega | Nada muda: a resolução aberta é só do mestre. |
| O servidor reinicia com o turno aberto | O turno se perde inteiro, as edições junto; o `match_full_state` chega sem `resolution` e o painel some. |
| A conexão cai entre o envio e o `resolution_updated` | O editor já fechou; ao reconectar, o `match_full_state` mostra se a edição entrou. |

## Decisões F1–F5 (do spec)

| # | Decisão |
|---|---|
| F1 | Só reações **abertas** ganham edição; as pendentes não (o servidor aceita, mas elas não entram no cálculo: seria um controle que não muda nada). Abrir e então editar cobre o caso. |
| F2 | Editor inline, um por vez, com Aplicar / Desfazer / Cancelar (cabe no bottom sheet do celular; sem diálogo a mais). |
| F3 | Push/Grab manda na hora, sem "Aplicar" (escolha binária e reversível). |
| F4 | Sem estado otimista: o servidor é a fonte. |
| F5 | "Reflexo" em vez de "Esquiva" nas reações fechadas: o campo `dodge` ali edita só o Reflexo, e a esquiva lida é o pior entre Reflexo e Evasion. |

## Como verificar no browser

Três contas (`test@` mestre, `test2@` e `test3@mail.com` jogadores, senha `12345678`), contra o
back da branch do PR #85. O setup de duas origens, o script WS para a terceira conta, a aba ativa
e o celular estão em `combate-fase-7.md` ("Como verificar no browser"). O roteiro: um ataque de
um jogador a outro com reação aberta; o mestre edita acerto, esquiva/defesa/aparo e troca
Push ↔ Grab, vendo o total mudar; recarrega e vê o resumo e a perícia mantidos; desfaz e vê o
número voltar; o jogador não vê nada disso até o turno fechar.

## O que não tem teste / limitações conhecidas

- **Reação pendente não é editável** (F1): é preciso "Dar a palavra" antes.
- **Esquiva e defesa passivas de quem não reagiu não são editáveis.** Um alvo sem reação aberta
  não ganha linha nenhuma; é pendência do documento mestre, não deste front.
- **Fora do painel:** `Evasion` das fechadas, `speed`, `feint`, o `moveSpeed` da própria ação e
  as perícias (`skillName`).
- O movimento (`moveSpeed`) não mostra o total ao lado do "Editar".
- O rascunho de um editor aberto se perde ao recarregar.
- Só o browser prova a integração com o back real do PR #85 (testes cobrem o modelo, o editor e
  o `ResolutionDetails` com payloads montados à mão).
