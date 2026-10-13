# Combate no front — reação padrão, viés em teste passivo e ajuste na fila

> Spec (cross-repo, no back): `HxH_RPG_System/docs/superpowers/specs/2026-10-12-default-reaction-and-queue-edits-design.md`
> (EN + PT-BR). Contrato: `HxH_RPG_System/docs/dev/api/match-combat-ws.md` — `attach_reaction`,
> `open_reaction`, `edit_action`, `close_turn`, `action_queued`, `resolution_updated`.
> Branch dos dois PRs: `claude/jolly-sagan-gvfth9`.

Este documento vem **depois** de `combate-fase-8.md` e de `combate-polimento-mesa.md`. Onde
discordam, vale este.

## O que mudou no servidor, e o que o front lê disso

| Servidor | Front |
|---|---|
| Todo alvo de um ataque ganha uma reação `default` (esquiva por reflexo + defesa padrão, passivas) quando o turno abre. O que o alvo mandar a substitui. | `ReactionKind` ganhou `"default"`; rótulo "reação padrão" (`REACTION_KIND_LABELS`), verbo "esquivou" (`avoidedVerb`, ramo padrão), sem barra (`REACTION_BARS`). |
| A reação **não aberta entra no cálculo**, depois das abertas. `targets[].reaction` vem para toda reação, com `opened`. | `ResolutionDetails` numera "aberta em Nº" só entre as abertas e escreve "não aberta" nas outras. `opened` ausente (servidor antigo) lê como aberta — lá só as abertas vinham. |
| `pendingReactions` lista toda reação não aberta (a padrão sentada e o `nothing` inclusive), com `seated` na padrão de quem ainda não respondeu. | A lista "Reações esperando" mostra a padrão como qualquer outra ("Dar a palavra" fica: narrar a esquiva padrão é decisão do mestre) e marca "ainda não respondeu". |
| `nothing` nunca precisa ser aberto e não segura o fechamento; a padrão sentada também não segura. Os dois continuam abríveis: abrir também posiciona na cadeia, e é assim que o mestre controla o tempo de resolução dessa escolha. | "Dar a palavra" aparece para os dois. O `close_turn_refused` já vem filtrado. |
| `match_full_state.passiveValue`: o valor base dos dados (11 no 2D10). | O reducer guarda em `state.passiveValue`; `GameMasterPage` → `QueuePanel` → `ResolutionDetails`/`QueuedActionEdits` → `RollEditLine` → `RollConditionEditor` o levam até o aviso. |
| Viés do mestre num teste passivo o torna rolado: vantagem = melhor entre o dado e o valor base; desvantagem = pior. | Ver "O viés de uma leitura passiva". |
| `edit_action` aceita o id de uma ação **na fila** (condições e `damageSkill`), e o servidor responde com o `action_queued` que a redescreve, com `conditions` e `damageSkill`. | Ver "Ajustar na fila". O reducer trata um `action_queued` de `actionId` conhecido como atualização (substitui no lugar). |
| `ownReactions` não lista a padrão sentada. | Nada a fazer: os botões de reação continuam disponíveis para quem não respondeu. |

## `rollEdits.ts`: `bias` no lugar de `allowsBias`

Cada `EditableRoll` diz como a leitura usa os dados (`BiasMode`):

| `bias` | Leitura | Viés |
|---|---|---|
| `rolled` | rolada | os três botões à vista |
| `passive` | valor base (11 no 2D10) | atrás do botão **Viés**; o viés torna o teste rolado |
| `none` | o dano | não há viés (o servidor recusa) |

A tabela por reação (`REACTION_ROLLS`) agora inclui `default` (Esquiva e Defesa padrão, as duas
`passive`), e a defesa padrão de `dodge`/`closedDodge`/`escapeGuard` e o Movimento do
`closedEscape` passaram de "sem viés" para `passive`. `allowsBias(roll)` é o atalho (`bias !==
"none"`). O viés do sistema (`systemBias`) só é anexado ao movimento quando ele é rolado: numa
leitura passiva o viés do sistema não vale.

`editableRolls` gera linhas para **toda** reação em `targets[]` — aberta ou não —, porque toda ela
entra no cálculo (a F1 da Fase 8, "só as abertas", caiu).

## O viés de uma leitura passiva

`RollConditionEditor`, quando `roll.bias === "passive"`:

- os botões de viés não ficam à vista: há um botão **Viés** (`aria-expanded`, `aria-controls`)
  que abre um cartão;
- no cartão, **o aviso vem antes dos botões** (`passiveBiasNote(passiveValue)`, texto do dono do
  produto): "Este teste usa o dado base (11). Vantagem/Desvantagem passa a rolar contra o dado
  base." Sem `passiveValue` (servidor antigo), o parêntese some — o aviso não inventa número. O
  mestre lê o efeito no caminho do clique, sem ícone a decifrar;
- o botão diz a escolha quando ela não é Normal ("Viés · Vantagem"), então fechar o cartão nunca
  esconde um viés em vigor; com viés em vigor o editor abre com o cartão aberto.

O resto do editor é o da Fase 8 (Modificador, Motivo, Aplicar / Desfazer / Cancelar), sem estado
otimista.

## Ajustar na fila

`QueuePanel`, com `onEditAction`: cada linha da fila ganha **Ajustar** (`aria-expanded`, uma linha
aberta por vez; fecha sozinho quando a ação sai da fila). Aberto, mostra `QueuedActionEdits`:

- as rolagens de `queuedRolls(queued, mode)`: Acerto (`rolled`) e Dano (`none`) quando há ataque;
  **Velocidade de ação** (`rolled` no Race, `passive` fora dele); **Velocidade de movimento** quando
  há movimento (`rolled` no Dash, `passive` no Shift). Cada uma com `RollEditLine` (o mesmo
  "Editar" + editor inline do cálculo do turno), um editor aberto por vez;
- o "medido por" Push/Grab (`DamageSkillPicker`) quando há ataque;
- a nota "Mexer na velocidade muda o lugar na fila. O jogador não vê estes ajustes."

Fechada, a linha resume o que está em vigor ("Ajustada: velocidade de ação +3"), lido de
`action_queued.conditions`. Todo payload leva o `actionId` da ação (`damageSkillPayload(skill,
actionId)`). Alvos e perícias não se ajustam na fila — o servidor recusa (chegariam ao dono antes
do fechamento).

`RollEditLine.tsx` concentra a linha editável (`RollEditLine`) e o seletor Push/Grab
(`DamageSkillPicker`), extraídos do `ResolutionDetails` para servir aos dois painéis.

## Como verificar no browser

Mesmo setup de `combate-fase-8.md` (três contas, `test@`/`test2@`/`test3@mail.com`, senha
`12345678`), contra o back da branch `claude/jolly-sagan-gvfth9`:

1. Um jogador ataca o outro e o alvo **não** reage: o card do turno mostra o alvo com "reação:
   reação padrão · não aberta", as linhas Esquiva e Defesa padrão, e a padrão em "Reações
   esperando" com "ainda não respondeu".
2. Editar a Esquiva: o botão **Viés** abre o cartão com o aviso; Vantagem → Aplicar; o total muda
   para o melhor entre o dado e 11. Tirar e repor a vantagem dá o mesmo número (o dado não rola de
   novo).
3. O alvo reage com Esquivar: a linha passa a ser a da esquiva dele (rolada), e a edição na padrão
   some.
4. Com duas ações na fila, **Ajustar** na segunda, Velocidade de ação +10: ela passa à frente na
   ordem. O jogador dono não vê nada.
5. O dono cancela a ação ajustada: o ajuste some com ela.

## O que não tem teste / limitações conhecidas

- A apresentação da reação padrão (ícone, texto próprio no card do alvo, no balão e no histórico)
  é outra tarefa; hoje ela usa o rótulo "reação padrão".
- Só o browser prova a integração com o back real; os testes cobrem o modelo (`rollEdits`), o
  editor (cartão de Viés), o reducer (`action_queued` como atualização) e os painéis com payloads
  montados à mão.
- O `nothing` não aberto colide depois das abertas; para posicioná-lo antes (de um aparo, por
  exemplo), o mestre o abre.
