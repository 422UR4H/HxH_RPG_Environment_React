# Prompt para a sessão de PO — efeitos de status no front (saída da sessão de Product Design)

> Escrito pela sessão de PD em 2026-11-22, para o dono repassar à sessão de PO. Objetivo: o PO
> escreve o documento de front que vai para quem implementa **sem perder nenhuma correção que o
> dono e o líder de product design já fizeram** — cada item da seção "Regras de desenho" custou uma
> rodada de correção e não pode voltar. O PO pode citar este arquivo inteiro no documento dele.

## Como usar

1. Leia este arquivo inteiro e as **notas da sessão**:
   `System_X_System_React/docs/superpowers/specs/2026-11-21-status-effects-front-design-notes.md`
   (decisões por rodada, com quem decidiu cada uma: **[dono]**, **[PD]** = líder de product design,
   **[Claude]** = proposta da sessão de PD, sem objeção).
2. Abra os **mockups finais** (abrem com duplo clique, sem servidor), na pasta
   `System_X_System_React/docs/superpowers/specs/2026-11-21-status-effects-front-mockups/`:
   - peça do mapa: `peca-pilha.html` (a pilha) e `peca-faixa-e-caixa.html` (faixa e caixa, clicável);
   - painel de ação do jogador: `painel-acao-jogador.html`;
   - mestre aplicando, editando e tirando: **`mestre-v7.html`** (a única válida; v1–v6 são histórico);
     **exceto a etapa 6 ("Aba Status")**, substituída pela lista de personagens v2 (aba "Personagens");
   - lista de personagens: **`personagens-v3.html`** (v1–v2 são histórico);
   - destaque no jogador: **`destaque-v5.html`** (final; v1–v4 são histórico);
   - aba "Partida" do mestre, painel fixo e ficha: **`partida-v6.html`** (final; rascunho e v2–v5 são histórico).
3. Siga o **Design System do projeto** (artefato `https://claude.ai/artifact/TxCRCJxNB6qX13WKxAjZRV`,
   `project/README.md`; link também em `System_X_System_React/src/styles/CLAUDE.md`). A sessão de PD
   só passou a lê-lo na v3, e boa parte das correções abaixo era regra escrita lá.

## Regras de desenho que o dono e o líder de PD já corrigiram (não repetir)

**Padrão do site e ícones**
- Procure o equivalente no site antes de criar qualquer coisa; mude só o que foi pedido — texto
  mexido sem pedido foi sentido como regressão.
- **Nada de emoji como ícone.** Ícones do projeto: `pen.svg` (editar), `Ativo 10.svg` (check),
  `arrowheadDown.svg` (expandir; girada 180° quando aberta — é a do `ExpandButton`), `x-red.svg`
  (fechar — a do `CloseButton`), `setavoltarcomponta.svg` (voltar — a do `BackButton`). Ícones dos
  status: game-icons do `react-icons/gi` (tabela nas notas).
- **Botões só de ícone são grandes e vazam, mas na medida do site** — não exagerar:
  - **X vermelho e Voltar** no padrão do X da gaveta (`EdgeDrawer`): **36 px, só 10 px para fora
    no topo, 8 px para dentro na lateral**; os dois **alinhados** no topo da folha/diálogo, com
    respiro até o título. Vale para **todo** X de fechar dessas telas, no celular e no desktop.
  - **Seta ao lado de texto** ("Digitar"): maior que a linha, **alinhada ao texto**, sem aumentar a
    altura da linha (padrão do `JointProficiencyCard`: ≥ 1,8 em, mínimo 26 px, margem negativa).
  - **Seta de uma caixa que expande** ("Aplicar em"): maior (≈ 42 px), **na mesma coluna das
    caixas de seleção** da lista que ela abre; não vaza (está no meio da caixa).
  - **Vazar só onde diagrama bem.** Onde ficaria estranho, o ícone fica contido, no porte dos demais.
- **Check** (`Ativo 10.svg`, ≈ 40 px): **centrado na caixa e vazando por igual** para os quatro lados.
  Caixa marcada com **borda `green500`** (o verde da folha), nunca o dourado; o card selecionado
  também ganha a borda verde. Clicar de novo desmarca (o check some, a caixa fica vazia).
- **Segmentados** ("Quem vê", "Como está cada parte"…): texto **centrado nos dois sentidos**.
- **Peça de gungi sem o emblema vermelho** nas listas, resumos e no círculo do painel (moldura de
  gungi + avatar). O emblema fica só onde já está hoje (o card da lista de personagens, a ficha).

**Hierarquia e diagramação**
- **Cabeçalho de folha/diálogo:** Voltar e X no topo (acima), respiro, depois o **ícone do status na
  altura do bloco título + descrição**, título em **branco** (a cor da família só no ícone e no
  traço — título colorido ficou sem contraste).
- **Folha na altura do conteúdo**: o botão principal vem logo depois do conteúdo, sem vão.
- Mais espaço **entre grupos** que **entre rótulo e conteúdo**.
- **Formulário no desktop sem "degrau"**: controles do mesmo bloco com **a mesma largura e a mesma
  altura** (34 px); no "Editar status", uma grade só, rótulo à esquerda e controle à direita.
- **"Aplicar em" é uma caixa que contém a lista**: o resumo (nomes + contagem, com a seta) é o topo;
  a lista abre **dentro** dela, separada por um traço. Lista solta embaixo foi recusada ("não dá
  para entender que a lista faz parte do 'Aplicar em'").
- **Pílulas de sugestão (apelido): toda linha cheia encosta nos dois lados** (as pílulas crescem);
  a última linha, incompleta, fica no tamanho natural, à esquerda.
- **Lista de escolha de status (desktop)**: itens da **mesma largura**, um por linha na coluna da
  família; famílias da **maior para a menor**, linha por linha, numa grade de 3 colunas:
  Consciência e corpo, Sentidos, Vida · Testes, Guarda, Mente · Parte do corpo, Ar, Presença.
- Caixa de "Aplicar em" baixa (44 px). Segmentados de "Como está cada parte" baixos (32–34 px).
- **Fundo das páginas de mockup escuro** (pedido do dono) — só dos mockups, não do app.

**Textos (cópia aprovada)**
- Dizer **quem vê, pela pessoa**; nada de jargão de construtor ("domínio", "peça", "âncora").
- "**Apelido do status**" (não "Apelido"); "**Afeta**" (não "Trava"); "**Intensidade**" (não "Pontos").
- "Aplicar em Jogador1" / "**Aplicar nos 2 personagens**" / "**Aplicar nos 2**" (não "em 2").
- "**Confira**" (título numa linha) + "Paralisado, antes de aplicar"; no resumo, **o nome do status em
  negrito**.
- "**Marcados com [ícone de olho] veem os status aplicados.**"
- Tirar no mesmo turno: "Tirar Atordoado de Jogador1?" / "Quando ficou atordoado neste turno,
  Jogador1 perdeu estas ações:" / **"Tirar e devolver as ações"** ("Elas voltam para a fila, no mesmo
  lugar.") / **"Tirar sem devolver as ações"** ("Jogador1 terá que declarar de novo.") / Cancelar
  **numa caixa**.
- Bloqueio do jogador: "Você está **Atordoado**. Não pode agir nem reagir enquanto durar." (sem
  texto sobre o que o mestre faz) e "Você **não pode atacar** devido a um status desconhecido."
  (destaque em vermelho na parte importante; caixa de erro do site: escura, borda 1 px `red600`).
- Sugestão do Preso: **"Amarrado"** no lugar de "Enredado".
- Frase do Preso: "Não se desloca, **mas** age e reage normalmente." (em todo lugar).
- **Guarda não é verde**: verde fica para status benéficos (futuro). **Guarda = dourado saturado
  `gold400`** (já existe; sem cor nova). Os mockups anteriores à `destaque-v3` mostram a Guarda verde:
  vale esta regra.
- **Debilitados na cor da aptidão em todo o site** (faixa, caixa, painel, lista, folha do mestre, luz):
  corpo vermelho (`diagramPhysical`), mente roxo (`diagramMental`), espírito azul-claro (`diagramNen`).
  Os mockups anteriores à `destaque-v3` ainda mostram o Debilitado na cor da família (cinza): vale esta regra.

## Decisões por lugar (resumo; detalhes nas notas)

**1. Peça do mapa** — pilha acima da peça: faixa de status → barras de vida e stamina (se visíveis
a quem olha) → balão da action/reaction. Faixa = ícones coloridos pela **família**, número em selo.
Clicar na faixa abre a **caixa no lugar, crescendo do centro para todos os lados**, por cima de
barras e peça; fecha ao clicar em outra coisa do mapa. Mestre: o que não é público fica apagado e o
cartão diz quem vê. Clicar na **peça** mostra os status no painel de ação. A caixa é a porta do
mestre para editar (lápis `pen.svg`) e aplicar ("＋ Aplicar status").

**2. Painel de ação** (vale para todos; **o formato novo é só do jogador** — decisão do dono de
2026-11-21, o do mestre segue colado às bordas):
- mostra **o alvo e as opções de ação**; os status do próprio personagem só ao clicar em si mesmo;
  **sem alvo, o círculo é o próprio actor**; a vida mostrada é a de quem está no círculo (hoje é a
  do actor);
- formato do jogador: cartão arredondado, afastado das laterais, **vindo de trás e de baixo** da
  navegação, um tom mais escuro (`brown900` sob `brown850`); **peça no círculo** quase toda acima do
  cartão, dividindo a linha do **nick (esquerda)** e da etiqueta **"você"/"alvo" (direita)**;
  **barras da ficha** (`HpBar`/`SpBar`) **passando por trás da peça** — vida à esquerda **espelhada**
  (cheia encostada na peça) com o número na **ponta esquerda**, SP à direita com o número na **ponta
  direita**; só para quem tem acesso a elas;
- navegação: fechada = plana, "Ação" é item comum; aberta = o item vira **botão circular do tamanho
  da referência** (`~/MEGAsync/HxH_Project/hxh images/Partidas e Batalhas/Batalhas-SxS.png`, lado
  direito), da cor da navegação, encaixado num **recorte em "U" que o contorna com folga igual**,
  saindo só um pouco por cima do cartão; seta grande e o texto "**Enviar ação**" em `green500`;
  cinza quando não dá para enviar;
- clicar no mapa recolhe o cartão; **o rascunho da ação fica guardado**;
- dentro: status do alvo em cima (etiquetas com apelido junto, quebrando linha), ação embaixo;
  "Destino: coluna x, linha y" **sai**; Dash/Shift (e depois Deslizar, Rolar, Saltar) logo abaixo de
  Mover quando ligado; Saldo na parte de ação;
- "**Agindo como X**" (com seletor) só para quem pode agir com **mais de um** personagem (mesma
  regra para jogador e mestre; mestre com 1 NPC não vê).

**3. Mestre aplicando, editando e tirando** — `mestre-v7.html`, fechado:
- celular: folha do mestre; desktop: **uma janela com a lista de status à esquerda e os campos do
  escolhido à direita**; editar = janela estreita sem a lista, "Tirar status" à esquerda;
- só os campos do status escolhido; **Intensidade** com − / ＋ começando **"Não definida"**;
  **Afeta** em 4 botões iguais (celular: linha própria; desktop: ao lado da Intensidade);
- apelido do status: sem mouse/trackpad o campo fica fechado ("Digitar" + seta, ao lado do rótulo)
  e as sugestões ficam tocáveis; com mouse/trackpad, aberto; **se já houver apelido digitado, abre
  aberto** e "Digitar" não aparece (a web não detecta teclado acoplado: usar
  `(hover: hover) and (pointer: fine)` e lembrar no aparelho se o mestre abrir uma vez);
- **Quem vê**: Todos · Mestre e alvo · Só o mestre · Escolher, com "padrão" no padrão do tipo;
- **uma lista só de personagens** (dentro de "Aplicar em"): ícone de gungi, capa, nickname, classe;
  coluna **Recebe** (check) sempre; coluna **Vê** (olho) só com "Escolher"; quem recebe já vem com
  o olho marcado; NPC com a **classe** e o **selo NPC** (`Badge`) no lugar do olho;
- **sem "Ligado a"**: o status vale no instante em que o mestre aplica (antes da ação abrir, ou
  entre a ação e a reação); o front **não manda `actionId`** e não usa `relink_status_effect`;
- "Confira" antes de aplicar em mais de um personagem; o front **impede antes** tudo o que puder
  (já tem, campo obrigatório vazio…); a recusa do servidor é exceção;
- avisos (`statusNotes`) no cartão da ação na fila, calculados dos status atuais.

**4. Lista de personagens** — `personagens-v3.html`, decidido em 2026-11-25: o card de hoje fica
igual (zona ajustada à mão, título "PERSONAGENS" **centralizado** como hoje) e ganha, **preso embaixo**, a faixa de etiquetas de status (mesmo padrão
do painel de ação); o jogador vê os próprios status e os públicos dos outros; o mestre vê tudo
(apagado = a mesa não vê) e **tocar numa etiqueta abre a edição**; aplicar é **só pelo "＋ status" de
cada card** — **sem** botão geral de "Aplicar status" na lista (o "Aplicar em" da folha marca
outros personagens). As abas **juntaram**: o footer do mestre ganha **"Personagens"**, que abre esta
lista (não existe aba "Status" separada).

**5. Destaque no jogador** — `destaque-v5.html`, fechado em 2026-11-25 (detalhes nas notas):
- avisos na **pilha que a mesa já tem no topo do mapa** (`StageNotices`), com a etiqueta do status;
  só do que ele vê; somem em **10 s** ("Já pode agir": 6 s), **todos com X**, tocar segura o tempo;
  **"Sua ação saiu da fila" fica até fechar** (sem ele o jogador espera um turno que não vem);
- **X dos avisos vaza para cima e para a direita na mesma medida** (10 px), a 10 px do header e da
  borda da tela (horizontal); a pilha é mais estreita (20 px de cada lado), começa logo abaixo do
  header com o **X 4 px abaixo dele** (não disputar o toque com o "Histórico") e tem **12 px entre avisos**;
- **luz na borda do mapa (só do canvas — nunca sobre header, navegação ou colunas)** ao ganhar status:
  **uma vez só: chega ao máximo quase na hora (≈ 0,15 s), bem intensa, e some devagar (≈ 3,2 s)**; na cor da família — **debilitados na cor da
  aptidão** (corpo vermelho, mente roxo, espírito azul-claro); **vermelho para dano** (família vida
  e qualquer dano; dano é só a luz, sem aviso);
- fora de ação: aviso com borda vermelha mais grossa e **cadeado vermelho** (sem círculo) no "Ação"
  enquanto durar; **tocar no "Ação" bloqueado mostra o motivo** num balão, não abre o painel (impedir
  o erro em vez de mostrá-lo depois); bloqueio **parcial** (Preso) abre o painel com o Mover apagado
  e o motivo embaixo;
- textos humanizados (ver o mockup): "Você está **preso**. Não se desloca, mas age e reage
  normalmente.", "Você **não consegue enxergar**. Seus ataques e defesas ficam mais difíceis.",
  "Seu **corpo está debilitado**. Seus testes físicos ficam mais difíceis.", "Você está
  **sangrando**. Perde 2 de vida por rodada até ser socorrido.", "Você **caiu**. …", "Você se sente
  **compelido** a: …", "Sua ação **X** saiu da fila porque você ficou atordoado.", "Você não está
  mais atordoado. **Já pode agir.**".

## Layout da mesa — resolver nesta mesma leva (pedido do dono, 2026-11-25; não refinado na PD)

- A **fila de ações** fica **sempre à mostra, à esquerda**, em **tablet e telas maiores**.
- **Celular em pé:** a fila continua onde está hoje, por enquanto.
- **Celular deitado:** a fila fica à esquerda, **como no computador**, e o **footer vai para a
  esquerda** (como a coluna de navegação do computador) — deitado sobra pouca altura, e footer +
  header comem a tela. **O header continua.**
- O footer do mestre: Fila · Agir · Ficha · **Personagens** (a "Partida" do rascunho fica para depois).

## Lacunas de contrato (o back corrige; o front não contorna)

- **L1.** Barras na peça e no painel: stamina não chega ao vivo; vida dos outros só vai ao mestre e
  ao dono; não existe comando de revelar barras (regra de revelar já decidida no brief).
- **L2.** Recusa por status invisível: o servidor manda `"<nick> não pode atacar por causa de um
  efeito."`; a tela quer "Você não pode atacar devido a um status desconhecido." (o contrato
  proíbe parsear).
- **L3.** `status_effect_exists` em lote não diz qual personagem (o front marca "já tem" antes).
- **L4.** Histórico/revelar (`POST …/reveal`, `concealedBy`): onde fica o "revelar" do mestre está
  em aberto.
- **L5.** "Quem vê" por personagem num lote: o comando tem **uma** `visibility` para todos.
- **L8.** `action_cancelled` não diz a causa: para "saiu da fila porque você ficou atordoado" o
  front precisa do tipo do status — só quando o dono o vê.
- **L6.** Cópia: "Enredado" → "Amarrado" no contrato §3 e no spec §8.
- **L7.** Intensidade opcional: hoje `points` é obrigatório (≥ 1) em Paralisado/Atônito/Atordoado.

## Perguntas de regra de jogo (para o PO decidir com o dono)

1. O jogador vê os **números** dos status de outro personagem (ex.: "Queimando 1")?
2. **Vários alvos** no painel de ação: de quem mostrar barras e status? (ideia do dono: avatares
   dos alvos no topo, o escolhido no centro, os outros menores; tocar troca)
3. O que significa um status **com intensidade "não definida"** (ex.: não se recupera sozinho até
   ser definida)?
4. Sem `actionId`, o histórico não diz a qual ação o status pertence — isso faz falta?
5. **O dono quer conversar:** Congelando seguir a lógica do Asfixiando — sem tirar vida direto, com
   uma **barra própria** de congelamento que **aplica outros status** (Lento, Corpo debilitado e
   outros a discutir).

## Aba "Partida" do mestre, painel fixo e ficha (`partida-v6.html`, fechado em 2026-11-25)

- **O header não muda**, em nenhum tamanho de tela.
- **Celular:** o painel de baixo do mestre **não é folha** — sempre visível, **mapa e painel meio a
  meio, fixo** (o painel conta com a navegação), em todas as abas; o conteúdo rola dentro; **sem X**.
- **Ficha no celular = exceção, para mestre e jogador:** abre no formato de folha do jogador, cobrindo
  boa parte do mapa (sem nada por cima do conteúdo da ficha de hoje), com X que vaza um pouco à
  direita; fecha no X, **tocando fora dela** ou **tocando de novo em "Ficha"** na navegação. **No
  computador padrão a ficha abre como hoje.**
- **Footer do mestre (celular):** Fila · Ficha · **Agir** · Personagens · Partida, com o **mesmo recorte
  e botão redondo** do jogador quando Agir está aberto ("Enviar ação").
- **Regime** continua na Fila; **Nova cena** (botão que abre o fluxo de hoje, sem caixa de texto) e
  **Encerrar partida** vão para Partida; Partida também tem "revelar barras" (todos os PJs a todos;
  todos os NPCs — quando existir; um por um no card da lista) e o espaço das configurações da mesa.
- **Computador padrão e tablet (mestre):** coluna da esquerda em **duas metades fixas — interface
  escolhida em cima (Agir por padrão, ou Partida), fila embaixo**, cada uma rolando por dentro;
  navegação da coluna: Agir · Ficha · Partida (Personagens fica na coluna da direita, com o Histórico).
  **O jogador não muda.**
- **Fila num tom mais escuro** onde divide a tela com outras seções (computador padrão, tablet,
  widescreen): `surfaceSidebar` com véu `alpha(neutral1000, 0.3)` — sem cor nova. No celular, como está.
- **Widescreen e ultrawide (mestre):** **duas seções fixas** à esquerda — a **fila** (≈ 240 px, sempre) e,
  ao lado, **uma seção que Agir, Ficha e Partida dividem** (≈ 320 px, Agir por padrão); histórico
  ≈ 260 px; nada flutua sobre o mapa (no 1920 px o mapa fica com ~1028 px). Ponto de troca entre o
  padrão e o widescreen sugerido: ~1600 px (o PO decide). Hoje (1400 px) o mapa é 668 px: esquerda
  412, histórico 320.

## Em aberto / fora do escopo agora

- A ficha no computador (hoje abre ao lado da coluna): o dono refina com o líder de PD.
- Formato da tela do mestre além do acima: o dono revê com o designer humano.
- Celular deitado: fila e footer à esquerda (seção "Layout da mesa").
