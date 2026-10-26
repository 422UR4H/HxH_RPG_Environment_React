# Fase 2 · PR 7 — Conteúdo e textos (`fix/ux-textos`)

Base: `main` em `74d7faf` (PR #83 mergeado; os tokens `surfaceDisabled` e `textDisabledOnDark` já estão lá).
Spec: `docs/superpowers/specs/2026-10-26-front-fase2-auditoria-tcc-design.md`, seção “PR 7” e decisões 5, 6 e 7.

Fora deste PR (não mexer): zona pixel-tuned, rótulo do `ProgressBar` (PR 5), atributos `autoComplete` (PR 3),
“round” e “roleplay” da mesa (TXT-01 e TXT-04 são do PR 4; mexer aqui daria conflito).

## 1. CON-02 e CON-05
- Organismo `UpcomingRulesSidebar` (`scope: "campaign" | "match"`): o título “REGRAS” com o selo “Em breve”
  (ion `ComingSoonBadge`, reaproveitável pelo CON-03 do PR 4), os mesmos quatro cards e a mesma nota de rodapé nas
  sete telas (campanha, partida, lobby, criar e editar campanha e partida). Card sem cara de clicável.
- O ícone dos botões de ação vira slot (`icon`). “+” só em Criar Partida, Criar NPC e Criar Mapa; os que navegam
  ou enviam (Ver Campanha, Procurar Campanhas, Abrir Lobby, Entrar…, Inscrever-se, Submeter Ficha) ficam sem ícone,
  porque todas as setas do designer são verdes e somem no botão laranja ou verde. O “+” sai do nome acessível.
- Testes de página: selo e nota nas telas; “+” só no criar.

## 2. Ação indisponível (CON-07 e CON-08)
- Molécula `BlockableButton` (`blockedReason?`): `aria-disabled`, `questionmark.svg` na mesma linha à direita do
  rótulo, explicação no `Tooltip` existente (hover, foco e toque). O `Tooltip` ganha quebra de linha com largura
  máxima (a frase não cabe numa linha no celular) e um modo que estica no contêiner.
- `ManageButton`: itens viram `<button>`, 48 px de altura, mesmo recuo e coluna de ícone fixa (alinhamento);
  `isFree` + `deleteDisabledReason` viram uma prop só, `deleteBlockedReason`.
- Textos (regras do back conferidas em 26/10): campanha “Campanha com partida iniciada não pode ser excluída: o
  histórico é do grupo.”; ficha “Ficha em campanha ou com envio pendente não pode ser excluída: o histórico é do
  grupo.” (o Excluir aparece desativado, em vez de sumir); lobby “O jogador precisa estar conectado.”, com 44 px.
- Testes: campanha com partida iniciada, ficha em campanha e com envio pendente, jogador desconectado no lobby.

## 3. CON-04
- “Aceitar” e “Recusar” só com a palavra (o X do designer não chegou), 44 px, `aria-label` com o nick, e só
  enquanto a inscrição está pendente. Aceitar com contorno sobre o painel escuro (pronto para o check verde);
  Recusar no texto destrutivo (`actionDestructiveText`). Selo “Rejeitado” → “Recusado”, para casar com o verbo.
- Testes de página da partida: rótulos, e botões ausentes em inscrição aceita.

## 4. FOR-06
- `FormField` com `optional`: “(opcional)” em cinza discreto ao lado do rótulo, só nos opcionais (Descrição
  Completa, Link da Chamada, Data Corrente da História).
- `CreateFormTemplate` com `noValidate`: sem balão do navegador; cada página checa os obrigatórios por um helper
  puro (`missingRequiredMessage`) e mostra a mensagem no erro do formulário.
- Testes: helper puro, e página com campo vazio mostra a mensagem própria.

## 5. TXT-02
- “Físicas”/“Espirituais” → “Physical”/“Spiritual”; “ONLINE” → “CONECTADO”; “📁 Upload arquivo” → “📁 Enviar
  arquivo”.
- Ficam e vão listados no PR: nome das classes (“WeaponsMaster”) e “PHYSICAL · MENTAL · SPIRITUAL” moram na zona
  pixel-tuned (`CharacterSheetHeader`, diagramas); “Nickname”, “Background”, Lv, NPC, Lobby, Dash/Shift, Push/Grab
  ficam por decisão.
