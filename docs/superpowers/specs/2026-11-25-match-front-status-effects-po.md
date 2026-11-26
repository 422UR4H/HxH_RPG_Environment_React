# Mesa e efeitos de status no front — design de produto (PO)

> Escrito pela sessão de PO em 2026-11-25, a partir do retorno da sessão de Product Design. É o
> documento que quem **planeja e implementa** o front lê. Cobre todas as fases do front; a **fase 1
> está detalhada** para ser despachada já; as outras têm escopo e dependências, e ganham detalhe
> antes de cada uma ser despachada.
> Marcação: **[dono]**, **[PD]** (líder de product design), **[Claude-PD]** (proposta da sessão de PD
> sem objeção), **[PO]** (decisão desta sessão, a revisar pelo dono).

## 1. Leitura obrigatória (nesta ordem)

1. **`2026-11-22-status-effects-front-prompt-po.md`** (mesma pasta) — **inteiro**. As seções "Regras
   de desenho que o dono e o líder de PD já corrigiram", "Textos (cópia aprovada)" e "Mockups não são
   especificação de espaçamento" **fazem parte deste documento, sem resumo nem corte**: cada item
   custou uma rodada de correção e não pode voltar. Em conflito entre aquele arquivo e o que vem
   abaixo, vale o que vem abaixo **só** onde este documento disser explicitamente que decide.
2. `2026-11-25-status-effects-front-design.md` — o índice do PD (uma linha por decisão e a tela final
   de cada lugar).
3. `2026-11-21-status-effects-front-design-notes.md` — histórico por rodada, com quem decidiu.
4. Mockups finais em `2026-11-21-status-effects-front-mockups/` (duplo clique): `peca-pilha.html`,
   `peca-faixa-e-caixa.html`, `painel-acao-jogador.html`, `mestre-v7.html` (menos a etapa "Aba
   Status"), `personagens-v3.html`, `destaque-v5.html`, `partida-v6.html`. Os demais são histórico.
5. Design System do projeto (artefato `https://claude.ai/artifact/TxCRCJxNB6qX13WKxAjZRV`,
   `project/README.md`; link em `src/styles/CLAUDE.md`) e os CLAUDE.md do front (`CLAUDE.md`,
   `src/components/CLAUDE.md`, `src/styles/CLAUDE.md`, `src/pages/CLAUDE.md`).
6. Do back (`System_X_System/`): o spec de produto dos status,
   `docs/superpowers/specs/2026-11-15-status-effects-design.pt-br.md` — §11 (onde aparece) e §16
   (decisões da implementação, que valem sobre o resto) —, e os contratos
   `docs/dev/api/match-status-effects.md`, `match-history.md`, `match-combat-ws.md`. **O contrato é
   a fonte da verdade do fio:** o front não contorna lacuna; lista e para.

## 2. Por que

Os efeitos de status já existem no back (fases 1 e 2), mas nada aparece na tela. E a mesa, do jeito
que está, não comporta o que vem: o mestre acumula botões e informação, e o jogador precisa de uma
tela limpa. Por isso o front começa por **rearrumar a mesa por papel e por tamanho de tela** (fase 1)
e só depois põe os status nela. O jogador e o mestre têm necessidades opostas [dono]: o jogador, tela
limpa; o mestre, informação presa à tela — e, no futuro, telas maiores.

## 3. As fases do front

| Fase | Entrega | Depende de |
|---|---|---|
| **F1** | **Layout da mesa** (refactor, sem status): colunas por papel e tamanho de tela, footer do mestre novo, aba "Partida", ficha como folha no celular | merge dos PRs da fase 2 (back #116, front #114) |
| F2 | Painel de ação novo: formato do jogador, navegação com o botão redondo "Enviar ação", alvo/actor no círculo, barras da ficha | F1 |
| F3 | Status para ler: faixa e caixa na peça, etiquetas no painel de ação e na lista de personagens, ícones e cores por família | F1 (F2 para o painel); pergunta 1 da §6 |
| F4 | Mestre aplicando, editando e tirando: folha/janela, "Aplicar em", "Quem vê", "Confira", "Tirar e devolver" | F3; back corrige L3, L5, L7 |
| F5 | Destaque no jogador (avisos, luz na borda, cadeado, bloqueio parcial) e status no histórico | F3; back corrige L2, L4, L8 |

As barras de vida e stamina **de outros personagens** (e "revelar barras") esperam a fase 5 do
back (visibilidade por jogador, lacuna L1). Até lá, cada um vê as próprias barras e o mestre vê
todas. As lacunas L2–L8 viram um PR pequeno do back antes da F4.

## 4. Fase 1 — Layout da mesa

### 4.1 Objetivo e limites

Rearrumar a mesa **sem mudar o que cada tela faz**: as mesmas funções, em lugares novos. **Nada de
status nesta fase.** O ponto de partida é `src/components/templates/MatchStageTemplate.tsx` (as
cinco zonas: `topbar`, `rail`, `stage`, `panel`, `aside`), `RailNav` (o rail que deita e vira
rodapé abaixo de `railUp`), `AsideTabs` (Histórico/Personagens), `QueuePanel`, `MatchSheetPanel` e
`src/styles/breakpoints.ts` (`tabletUp` 768, `railUp` 1024, `asideUp` 1280). Siga o padrão do
template: **onde cada zona aparece é CSS do template**; a página decide o que vai dentro.

Fica **fora** da F1: o painel de ação novo e o botão redondo "Enviar ação" (F2); tudo de status
(F3–F5); "revelar barras" e as configurações da mesa (dependem do back); a ficha no computador
(abre como hoje; o dono refina com o líder de PD); qualquer mudança no formato da tela do mestre
além do descrito aqui (o dono revê com o designer humano). Os **itens da fila ficam como hoje**
(`QueuePanel`): os "cards" de ação dos mockups não existem e não foram pedidos.

### 4.2 O que vale em todo tamanho

- **O header não muda**, em nenhum tamanho de tela [dono].
- **A fila mantém o espaçamento de hoje** — margem do seletor de Regime (Livre/Disputado) e dos
  itens. Nos mockups de computador e widescreen ela aparece sem essa margem: **erro do mockup, não
  copiar** [dono].
- **Fila num tom mais escuro onde divide a tela com outras seções** (computador padrão, tablet,
  widescreen): `surfaceSidebar` com véu `alpha(neutral1000, 0.3)` — sem cor nova. No celular, como
  está [dono].
- **Regime continua na Fila** [dono].
- Mudar só o que este documento pede; texto, ícone ou espaçamento mexido sem pedido conta como
  regressão (regras do prompt do PD).

### 4.3 Por tamanho de tela

**Celular em pé** (abaixo de `tabletUp`):
- **Jogador:** como hoje, exceto a ficha (abaixo).
- **Mestre:** o painel de baixo **não é folha** — **mapa e painel meio a meio, fixo**, sempre
  visível, em todas as abas; o painel conta com a navegação; o conteúdo rola por dentro; **sem X**
  [dono]. Footer do mestre: **Fila · Ficha · Agir · Personagens · Partida** [dono, `partida-v6`; vale
  sobre a lista de 4 itens da seção "Layout da mesa" do prompt do PD, que é anterior]. Nesta fase o
  "Agir" é um item comum; o recorte em "U" e o botão redondo chegam na F2.
- **Ficha (mestre e jogador) = folha:** abre no formato de folha do jogador, cobrindo boa parte do
  mapa, sem nada por cima do conteúdo da ficha de hoje, com o X que vaza um pouco à direita; fecha no
  X, **tocando fora dela** ou **tocando de novo em "Ficha"** [dono].

**Celular deitado** [dono]: deitado sobra pouca altura, e header + footer comem a tela.
- A **fila fica à esquerda, como no computador**, e o **footer vira a coluna de navegação à
  esquerda** (como a do computador). **O header continua.**
- **Como reconhecer "celular deitado"** [PO]: `(orientation: landscape) and (max-height: 540px)` —
  um celular deitado passa de 768 px de largura e cairia no tablet; quem decide é a altura. Conferir
  no aparelho e ajustar o número se preciso, registrando no PR.

**Tablet (em pé e deitado) e computador padrão** (de `tabletUp` até o widescreen):
- **A fila fica sempre à mostra, à esquerda** [dono].
- **Mestre:** coluna da esquerda em **duas metades fixas — a interface escolhida em cima (Agir por
  padrão, ou Partida) e a fila embaixo**, cada uma rolando por dentro. Navegação da coluna: **Agir ·
  Ficha · Partida**. **Personagens** fica na coluna da direita, com o Histórico (`AsideTabs`), como
  hoje [dono].
- **Jogador: não muda** [dono].

**Widescreen e ultrawide — a partir de 1600 px** [ponto sugerido pelo PD; decisão do PO]:
- **Mestre:** **duas seções fixas à esquerda**: a **fila** (≈ 240 px, sempre) e, ao lado, **uma
  seção que Agir, Ficha e Partida dividem** (≈ 320 px, Agir por padrão); histórico à direita
  (≈ 260 px); **nada flutua sobre o mapa**. Referência: em 1920 px o mapa fica com ~1028 px; hoje,
  em 1400 px, o mapa tem 668 px (esquerda 412, histórico 320).
- Registrar o ponto como um breakpoint com nome em `breakpoints.ts` (a regra do arquivo: nome, não
  número).

### 4.4 A aba "Partida" do mestre (nesta fase)

- **Nova cena**: um botão que abre o fluxo de hoje (sem caixa de texto na aba).
- **Encerrar partida**: sai de onde está hoje e vem para cá.
- **Revelar barras** e **configurações da mesa**: **não entram na F1** (os dados e os comandos não
  existem no back). Não desenhar controles vazios: a aba mostra só o que funciona [PO].

### 4.5 "Personagens" no footer do mestre (nesta fase)

Abre a **lista de personagens de hoje** (`MatchCharactersSidebar`), sem mudança no card. A faixa de
status presa embaixo de cada card e o "＋ status" chegam na F3/F4. Não existe aba "Status" separada
[dono].

### 4.6 Como provar

- Não há teste para a camada Pixi do mapa: **o navegador é a única evidência** do tamanho do mapa e
  das colunas (CLAUDE.md da raiz, "Entrega").
- Mesa: `go run ./cmd/devseed` em `System_X_System/` (ver `docs/dev/seed.md`), com **mestre e
  jogador**. Nunca derrubar a aba já logada do dono: usar as contas do seed.
- Larguras a conferir, nos dois papéis: **390 × 844** (celular em pé), **844 × 390** (celular
  deitado), **768 × 1024** (tablet em pé), **1024 × 768** (tablet deitado), **1400 × 900**
  (computador), **1920 × 1080** (widescreen). Prints de cada uma no PR.
- Conferir que nada regrediu: a fila e o Regime com o espaçamento de hoje, os itens da fila iguais,
  o header igual, o jogador igual (exceto a ficha no celular), os avisos do palco (`StageNotices`) e
  o relógio do mestre por cima do mapa como hoje (as camadas do template estão comentadas nele).

### 4.7 Dependências para despachar a F1

1. **Merge dos PRs da fase 2** (back #116, front #114): eles mexem no cálculo do mestre, que a F1
   muda de lugar. Começar a F1 depois do merge evita conflito.
2. **Merge do PR #115 do front** (os documentos do PD e este), para quem implementa ler da `main`.
3. **Nada do back.**
4. A pergunta 0 da §6, se o dono não aceitar a leitura do PO.

## 5. Fases 2 a 5 — escopo

O que cada uma entrega está no prompt do PD, "Decisões por lugar", e no índice do PD. Antes de
despachar cada uma, a sessão de PO escreve aqui a seção detalhada dela, com as respostas da §6.

- **F2 — painel de ação:** "Decisões por lugar", item 2. O formato novo (cartão arredondado,
  afastado das laterais) é **só do jogador**; o miolo vale para todos [dono, 2026-11-21]. As barras
  da ficha no painel mostram só o que a pessoa já recebe hoje.
- **F3 — status para ler:** itens 1 e 4 (peça e lista), as cores por família e a regra dos
  Debilitados na cor da aptidão.
- **F4 — mestre aplica:** item 3 (`mestre-v7.html`), com "Amarrado" no lugar de "Enredado" e a
  Intensidade decidida (§6).
- **F5 — destaque e histórico:** item 5 (`destaque-v5.html`) e os eventos de status no histórico,
  com a pergunta "revelar?" ao tirar o Escondido.

## 6. Perguntas em aberto (com o dono)

0. **[para a F1] O que muda para o jogador no layout?** Leitura do PO: na F1 o jogador **só** ganha a
   ficha como folha no celular e o celular deitado com a navegação à esquerda; "fila sempre à mostra
   à esquerda no tablet e maiores" é do mestre, porque é ele quem conduz a fila. Se a fila também
   deve ficar à mostra para o jogador, a F1 muda.
1. O jogador vê os **números** dos status de outro personagem (ex.: "Queimando 1")? (F3)
2. **Vários alvos** no painel de ação: de quem mostrar barras e status? Ideia do dono: avatares dos
   alvos no topo, o escolhido no centro, os outros menores; tocar troca. (F2/F3)
3. ~~Intensidade "não definida"~~ — **decidido** [dono, 2026-11-25]: Paralisado, Atônito e
   Atordoado sem intensidade **não se recuperam sozinhos** (seguem bloqueando; duram até o mestre
   definir ou tirar); os de vida começam em **1 por round**. **Lento e o modelo de "dois valores
   por status"** (um para o teste de sair do status, outro para a intensidade) **seguem em aberto**
   na sessão de PO; a F4 espera essa resposta para os campos do Lento.
4. Sem `actionId`, o histórico não diz a qual ação o status pertence — isso faz falta? (F5)
5. O dono quer conversar: **Congelando** seguindo a lógica do Asfixiando, com uma barra própria que
   aplica outros status (Lento, Corpo debilitado…). (regra; back)

## 7. Decisões do PO neste documento (para o dono revisar)

- Corte em cinco fases, com a F1 só de layout.
- Widescreen a partir de **1600 px**.
- "Celular deitado" reconhecido pela altura (`max-height: 540px` deitado).
- Aba "Partida" na F1 só com Nova cena e Encerrar partida; nada de controles vazios.
- Footer do mestre no celular com cinco itens, pela `partida-v6` (a mais nova).
- Leitura da pergunta 0 (o jogador quase não muda na F1).
