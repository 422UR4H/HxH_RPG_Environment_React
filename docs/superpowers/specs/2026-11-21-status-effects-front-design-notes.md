# Efeitos de status no front — notas da sessão de Product Design (em andamento)

> Notas de trabalho da sessão de PD (2026-11-19 a 2026-11-21), gravadas para sobreviver a um
> autocompact. **Não é o design doc final**: ele sai destas notas quando todos os lugares do brief
> estiverem decididos. Brief do PO: `System_X_System/docs/superpowers/specs/2026-11-19-status-effects-front-brief.md`
> (inclui a seção "Decisões do dono de 2026-11-21"). Contrato: `System_X_System/docs/dev/api/match-status-effects.md`
> **no `origin/main`** (mudou bastante desde o brief: mensagens em PT, `actionId`, desfazer no turno,
> `relink`, histórico/revelar).
>
> Mockups (abrem direto no navegador, `file://`): `2026-11-21-status-effects-front-mockups/`.
> Marcação: **[dono]** decidido pelo dono · **[Claude]** proposta minha, sem objeção do dono até aqui.

## Estado por lugar do brief

| Lugar | Estado | Mockup |
|---|---|---|
| 1. Peça do mapa | **fechado** | `peca-pilha.html`, `peca-faixa-e-caixa.html` |
| 2. Painel de ação (jogador, celular) | **fechado** | `painel-acao-jogador.html` |
| Mestre: aba "Partida" no footer | **v4 (2026-11-25), aguardando o dono** | `partida-v4.html`; rascunho, v2 e v3 histórico |
| Mestre: aplicar / editar / tirar | **FECHADO na v7** (dono: "a última versão é a que ficou perfeita; ignore as anteriores") | `comparativo-mestre.html` (celular × desktop por etapa); separados: `mestre-aplicar.html`, `mestre-aplicar-desktop.html` |
| 3. Lista de personagens da mesa | **v3 (2026-11-25): abas juntadas, sem botão geral, título centralizado** | `personagens-v3.html` (+ `card-*.png`); v1–v2 histórico |
| 4. Destaque no jogador ao ganhar status | **FECHADO na v5 (2026-11-25)** — Guarda em `gold400` | `destaque-v5.html`; v1–v4 histórico |

## 1. Peça do mapa — decisões

- **Pilha acima da peça**, de baixo para cima: peça → faixa de status (se houver) → barras de vida e
  stamina (se visíveis a quem olha) → balão da action/reaction (se agindo/reagindo). Andar vazio não
  existe; o de cima desce. [dono]
- Reações aparecerão **ao redor** da peça (fora do escopo agora); o balão não fica colado. [dono]
- **Barras na peça:** simples, largura da peça; cor esquemática no valor atual, fundo escuro
  (`surfaceBar`) na parte vazia. Stamina vira aura quando a aura existir. [dono]
- **Quem vê as barras:** jogador vê só a própria por padrão; mestre vê todas; mestre pode revelar.
  Regra de revelar (brief, decisões de 2026-11-21): por personagem, com atalho "todos os PJs a todos";
  NPCs um por um; "revelar todos os NPCs", se existir, é botão na configuração da partida; Stamina
  segue a Vida. [dono]
- **Faixa de status:** ícones **coloridos pela família**, com fundo leve da cor da família; número
  num selo com borda da cor da família. [dono — escolheu cor por família; recusou "todos brancos"]
- **Clicar na faixa abre a caixa no lugar:** a própria faixa cresce **a partir do centro, para todos
  os lados**, cobrindo barras e peça; mostra cartões (ícone em quadradinho tingido, nome em
  destaque, apelido embaixo, número em selo, traço da cor da família à esquerda). Fecha ao clicar
  em qualquer outra coisa do mapa. [dono]
- Clicar dentro da caixa não fecha. [Claude]
- **Só para o mestre:** status que não é público fica apagado na faixa; o cartão diz quem vê
  ("só o mestre", "mestre e dono", "público" em verde). [Claude]
- Ordem dos cartões = ordem das famílias do spec §5.2 (consciência e corpo → parte do corpo →
  sentidos → testes → vida → ar → guarda → mente → presença). [Claude]
- Clicar na **peça** (não na faixa) mostra os status dela no painel de ação. [dono]
- Tudo isso mora na camada HTML ancorada às peças (`MapPieceOverlay`), não no Pixi. [Claude — como construir]

### Cores das famílias (todas já na palette; nenhuma cor nova) [Claude, dono aprovou o visual]

consciência e corpo `gold300` · parte do corpo `ochre700` · sentidos `blue400` · testes `slate400`
(**debilitados na cor da aptidão**, em todo o site: corpo `red600`, mente `purple500`, espírito `blue400`) ·
vida `red600` (= HP) · ar `neutral100` · guarda ~~`green500`~~ **`gold400`** (2026-11-25: verde fica para status benéficos) · mente `purple500` · presença `neutral300`.
Precisam de tokens semânticos novos apontando para a palette (grupo `status`? prefixo novo é decisão
do dono — `src/styles/CLAUDE.md`). O designer pode ajustar depois.

### Ícones (react-icons/gi, game-icons) [Claude — o designer pode trocar]

paralyzed GiElectric · stupefied GiTerror · stunned GiKnockedOutStars · unconscious GiSleepy ·
restrained GiManacles · injured GiBrokenBone · slowed GiSnail · sense: vision GiBlindfold, hearing
GiSoundWaves, smell GiNoseSide, tact GiHand (equilíbrio: GiBodyBalance), taste GiTongue · weakened
GiDespair (GiWeightLiftingDown tem fundo preenchido — não usar) · bleeding GiBleedingWound · burning
GiFire · freezing GiSnowflake1 · poisoned GiPoisonBottle · asphyxiating GiLungs · prone GiFallDown ·
airborne GiJumpAcross · openGuard GiBrokenShield · compelled GiSpiralBloom · controlled GiPuppet ·
hidden GiHood.

## 2. Painel de ação — decisões (vale para todos, exceto o formato, que é só do jogador)

- O painel mostra **o alvo e as opções de ação**. Os status do próprio personagem **não** aparecem
  ali, a não ser que ele clique em si mesmo. [dono]
- Hoje a vida no painel é a do **actor** (`OwnBars`); passa a ser a de quem está no círculo. [dono]
- **Sem alvo** (só movendo, ou nada escolhido): o círculo é o **próprio actor**, com barras e status
  dele; o aviso de bloqueio mora aí. Ao tocar num alvo, o círculo vira o alvo. [dono aprovou a recomendação]
- **Formato (só jogador, celular/tablet em pé)** — referência: `~/MEGAsync/HxH_Project/hxh images/Partidas e Batalhas/Batalhas-SxS.png`, lado direito:
  - cartão com cantos de cima arredondados, afastado das laterais, que **vem de trás e de baixo** da
    navegação; cor um tom mais escuro que a navegação (cartão `brown900`, navegação `brown850`); [dono]
  - **ícone** = a peça (moldura de gungi + avatar), **sem o emblema vermelho**; quase todo acima do
    cartão, mas **dividindo a linha** do nick (esquerda) e da etiqueta "você"/"alvo" (direita). [dono]
  - **barras = as da ficha** (`HpBar`/`SpBar` → `ProgressBar`: borda preta, trilho, tom escuro sob o
    número), acima do cartão, **passando por trás do ícone**: vida à esquerda **espelhada** (cheia
    encostada no ícone, esvazia de fora para dentro, número na ponta esquerda), SP à direita (número
    na ponta direita). Só aparecem para quem tem acesso a essas barras. [dono]
  - **navegação:** fechada = plana, "Ação" é item comum; aberta = o item vira um **botão circular do
    tamanho da referência (~48px numa tela de ~328px)**, da cor da navegação, encaixado num recorte em
    "U" que o contorna com folga igual, saindo só um pouco por cima do cartão; seta grande **verde
    `green500`**, e o texto "Enviar ação" no mesmo verde; cinza quando não dá para enviar. [dono]
  - clicar no mapa recolhe o cartão e a navegação volta ao normal; **o rascunho da ação fica
    guardado**. [dono]
- Dentro do cartão: **status do alvo em cima, ação embaixo**. [dono]
- Status no painel = **etiquetas (forma B) com o apelido junto** ("Preso · Enredado"), quebrando
  linha, sem ocupar a linha inteira. [dono]
- **"Destino: coluna x, linha y" sai.** [dono]
- **Dash/Shift** aparecem logo abaixo do botão Mover quando ele está ligado; a linha cresce para
  Deslizar, Rolar, Saltar quando o movimento os trouxer. [dono confiou na recomendação]
- **Saldo** (barras de ação/movimento do actor) fica na parte de ação. [Claude]
- **"Agindo como X"** (com seletor) só para quem pode agir com **mais de um** personagem — vale para
  jogador e mestre pela mesma regra (mestre com 1 NPC só não vê). [dono]
- **Bloqueio:** caixa de erro do site (escura, borda 1px, `red600`), texto curto, destaque em vermelho:
  - status visível: "Você está **Atordoado**. Não pode agir nem reagir enquanto durar." Mover/Atacar
    e o envio apagados; [dono — sem texto sobre o que o mestre faz]
  - parcial (Preso): só o Mover apaga, motivo embaixo; [Claude]
  - status invisível ao jogador: recusa do servidor → "Você **não pode atacar** devido a um status
    desconhecido." (ver lacuna L2). [dono]
- Vários alvos: **não resolvido** → PO (ver P-PO abaixo).
- No desktop, o mesmo conteúdo no painel lateral. [Claude]

## Mestre — decisões e rascunhos

- **Formato do mestre não muda agora** (painel colado às bordas); só o miolo novo do painel vale
  para ele. [dono, brief 2026-11-21]
- **Rascunho guardado — aba "Partida"**: proposta de mover Regime, Nova cena, Encerrar partida (e
  futuras configurações e "revelar barras") para uma 4ª aba; no desktop, 4º item da coluna da
  esquerda; tablet em pé = celular. Perguntas abertas: (1) tirar esses controles da aba Fila?
  (2) "Agir" vira "Enviar ação" no próprio lugar, para o mestre?
- **Aplicar/editar/tirar (aguardando análise):**
  - entrada pela faixa da peça (✎ em cada cartão + "+ Aplicar status"), pelo painel e pela lista;
  - celular: folha com os 20 status agrupados pela família → folha só com os campos do escolhido;
  - desktop: **uma janela com a lista inteira à esquerda (3 colunas de famílias) e os campos à
    direita**; editar = janela estreita sem a lista, "Tirar status" à esquerda;
  - caso simples (ex. Preso) = escolher + Aplicar; campos obrigatórios sem padrão (pontos) começam
    vazios e travam o Aplicar;
  - "Quem vê": Padrão (com o que o padrão significa, pela pessoa) / Todos / Só o mestre / Escolher jogadores;
  - "Aplicar em": vários personagens (terremoto); quem já tem o status aparece apagado "já tem";
  - "Ligado a" (só com turno aberto): ação do turno / reação / turno todo (`actionId`);
  - tirar no mesmo turno com ações/reações derrubadas → "Tirar e devolver" / "Só tirar"
    (`restoreCancelledActions`, gatilho `cancelledActionIds`/`swappedReactionIds`);
  - avisos (`statusNotes`) no cartão da fila, derivados dos status atuais.
  - Perguntas abertas ao dono: expor "Escolher jogadores" já (recomendo sim); "Ligado a" como está
    (recomendo); lista longa no celular sem "recentes" por ora (recomendo).

## Mestre aplicar/editar/tirar — decisões de 2026-11-22 (dono + líder de product design)

Mockups: `comparativo-mestre-v2.html` (celular × desktop por etapa); separados `mestre-aplicar-v2.html`,
`mestre-aplicar-desktop-v2.html`. A v1 (`comparativo-mestre.html`) fica como histórico.

- **Entrada:** a faixa de status da peça é a porta principal do mestre para aplicar e editar. As
  outras duas portas (etiquetas do painel de ação ao clicar numa peça, e a lista de personagens)
  existem para quem não tem peça no mapa ou está fora da tela. [dono confirmou o fluxo; Claude explicou as outras portas]
- **Ícone de editar = `src/assets/icons/pen.svg`**, botão grande. [dono]
- **Apelido sem teclado:** em celular/tablet sem teclado o campo não aparece; aparecem as sugestões
  (tocáveis, preenchem sem teclado) e o texto **"Digitar" + ícone de expandir padrão**
  (`arrowheadDown.svg`, o do `ExpandButton`), que abre o campo. Com teclado o campo já vem aberto. [dono]
  - **Como detectar** [Claude — a web não informa se há teclado acoplado]: campo aberto quando
    `(hover: hover) and (pointer: fine)` (mouse/trackpad: computador, tablet com capa de teclado e
    trackpad); senão, "Digitar ⌄". Se o mestre abrir o campo uma vez, o aparelho lembra
    (`localStorage`, conveniência por aparelho).
- **Sugestão do Preso:** "Amarrado" no lugar de "Enredado" (Agarrado, Amarrado, Soterrado, Pendurado). [dono]
  → o contrato §3 / spec §8 têm "Enredado": o PO/back atualiza a cópia.
- **Uma lista só de personagens** (o padrão dos cards: ícone de gungi, capa, nickname, classe), com
  caixas de seleção por personagem: [dono]
  - coluna **"recebe"** (check `Ativo 10.svg`), sempre presente quando a lista está aberta;
  - coluna **"vê"** (olho), **só quando "Quem vê" = Escolher**;
  - a lista abre por dois caminhos: o **expandir padrão** de "Aplicar em" (resumo recolhido:
    nomes + contagem) ou o "Escolher" de "Quem vê". Expandiu e depois clicou em Escolher → a coluna
    "vê" aparece na lista já aberta;
  - **quem recebe já vem com o olho marcado** (vê o próprio status); o mestre pode desmarcar. [dono]
  - caixa marcada: **borda `green500`** (o verde da folha), não o dourado; o card selecionado também
    ganha borda verde. Clicar de novo desmarca (o check some). [dono; borda do card: Claude]
  - NPC não tem jogador: na coluna "vê" aparece "—". [Claude]
- **Ordem do formulário:** campos do status → apelido → **Ligado a** → **Quem vê** → Aplicar em (a
  lista fica por último, perto do botão). "Ligado a" vale para **todo** status com turno aberto — a
  falta dele no Preso era erro meu. [dono]
- **"Pontos" → "Intensidade"** (Paralisado, Atônito, Atordoado), num seletor − / ＋ (sem teclado).
  "Dificuldade" não serve para todos. Nos de vida o campo é "HP por round"; no Lento, "Penalidade". [dono escolheu "Intensidade"; demais rótulos: Claude]
- **Quem vê:** opções **Todos · Mestre e alvo · Só o mestre · Escolher**, com o **padrão do tipo
  marcado e escrito "padrão"**. "Mestre e alvo" = o padrão dos escondidos (o dono do personagem
  vê o próprio status). [dono propôs "Mestre e alvo"; Claude manteve "Só o mestre" como um toque
  porque é um caso de regra nomeado (a agulha do Illumi) — dono pode cortar]
- **Resumo antes de aplicar em vários:** Aplicar com mais de um personagem mostra "Confira antes de
  aplicar" (o status com os campos, em quem, quem vê, ligado a) com "Voltar e ajustar" e "Aplicar em N". [dono]
- **Desktop:** a Trava fica na mesma linha da Intensidade, encostada à esquerda, quando cabe
  inteira. [dono]
- **Contraste:** título do status em branco; a cor da família só no ícone e no traço. [dono apontou; Claude]
- **Tirar no mesmo turno** — novos textos: "Tirar Atordoado de Jogador1?" / "Quando ficou atordoado
  neste turno, Jogador1 perdeu estas ações:" / **"Tirar e devolver as ações"** ("Elas voltam para a
  fila, no mesmo lugar.") / **"Tirar e manter as ações canceladas"** ("Jogador1 terá que declarar de
  novo.") / Cancelar. [dono pediu; Claude escreveu]
- **Recusas do servidor são exceção:** o front impede antes tudo o que puder (já tem, campo
  obrigatório vazio, intensidade < 1…); a caixa de erro fica pronta para o raro. [dono]

## Mestre — decisões da rodada v3 (2026-11-22)

**Protocolo de versões [dono]:** cada versão nova do mockup é uma página nova com link próprio; a
anterior nunca é sobrescrita. Hoje: `mestre-v1.html`, `mestre-v2.html`, `mestre-v3.html` (na pasta de
mockups e no servidor em `/files/<nome>?key=…`).

**Design System do projeto** (artefato `https://claude.ai/artifact/TxCRCJxNB6qX13WKxAjZRV`,
`project/README.md`) — passei a ler a partir da v3. Regras que pesam aqui: **botões só de ícone
vazam** (expandir de lista ≥ 26 px e 1,8× o texto; X de gaveta 36 px subindo 10 px; nunca miúdo,
nunca cobrindo texto/clique alheio); **seta = `arrowheadDown.svg`, girada 180° aberta**, hover cresce
5–15 % com halo `actionHighlight`; **nada de emoji como ícone**.

- Botões só de ícone maiores (X sobe acima da folha; seta de expandir 36 px no "Aplicar em", que
  **não vaza** por estar no meio da caixa — vazar ali deixaria mal diagramado). [dono]
- **"Digitar" ao lado de "Apelido"** (no rótulo, com a seta vazando para baixo); ao tocar, o campo
  abre logo abaixo do rótulo, acima das sugestões. [dono]
- **O check (`Ativo 10.svg`) vaza da caixa**, para cima e para a direita (padrão do site). O olho
  fica dentro da caixa. [dono: vazar; olho dentro: Claude]
- **Segmentados ("Ligado a", "Quem vê") com o texto centrado nos dois sentidos**, em todas as telas. [dono]
- **Textos de "Ligado a" e "Quem vê": iguais aos da v2 na v3, de propósito** — o dono e o líder de
  PD comparam com a v1 antes de decidir (o dono sentiu regressão). **Em aberto.**
- Dica do olho: **"Marcados com [olho] veem os status aplicados."** [dono]
- **"Trava" → "Afeta"**; no celular, linha própria com **4 botões do mesmo tamanho** (nada
  amontoado); no desktop, na mesma linha da Intensidade, encostado à esquerda. [dono: nome e "não
  amontoar"; desenho: Claude]
- **Intensidade começa "não definida"** ("—" no seletor − / ＋, e "Não definida" embaixo). Ver
  opções e lacuna L7. [dono inclinado a decidir na hora do jogo; Claude trouxe opções]
- **NPC na lista:** mostra a **classe** (não "NPC"); na coluna "Vê", o **selo NPC** existente
  (`Badge`, `statusOngoing`) no lugar do travessão. [dono]
- **"Aplicar nos N personagens"** / "Aplicar nos 2" (não "em 2"). [dono]
- **"Confira"** no título (numa linha), com o ícone do status no cabeçalho também no desktop;
  subtítulo "Paralisado, antes de aplicar". [dono]
- **Editar com apelido já digitado → campo aberto**, sem "Digitar". "Digitar" só existe quando não
  há apelido digitado. Lesionado não tem sugestões (apelido livre). [dono]
- **"Tirar sem devolver as ações"** (numa linha); **Cancelar ganhou caixa**. Sem emoji nas ações. [dono]
- **Footer do mestre com uma 4ª opção, "Status"** (por enquanto, além de Fila/Agir/Ficha; depois
  a "Partida" do rascunho): todos os personagens com seus status e "+ status" em cada um — também
  a porta para quem não tem peça. [dono pediu "uma opção no footer"; conteúdo: Claude — **confirmar**]

## Mestre — decisões da rodada v4 (2026-11-22, dono + líder de PD) — `mestre-v4.html`

- **"Ligado a" sai de todas as telas.** O status vale no instante em que o mestre aplica: antes da
  ação abrir, ele entra antes; entre a ação aberta e a reação, entra nesse meio-tempo. O front
  **não manda `actionId`** (a mudança fica "do turno como um todo" no histórico) e não usa
  `relink_status_effect`. [dono] → registrar ao PO: o histórico não mostrará a qual ação o status
  pertence; se isso fizer falta, volta como pergunta.
- **"Apelido" → "Apelido do status"** (o líder de PD: "apelido" sozinho confunde). [dono/PD]
- **Seta do "Digitar" alinhada ao texto, sem vazar** — vazar só onde fica bem diagramado. [dono]
- **Check centrado na caixa, vazando por igual** (tamanho mantido). [dono]
- **Cabeçalho da folha** [PD]: Voltar (`setavoltarcomponta.svg`, o do `BackButton`) e **X vermelho**
  (`x-red.svg`, o do `CloseButton`) **alinhados no topo**, vazando acima da folha; respiro até o
  título; **ícone do status na altura do bloco título + descrição**. X vermelho em **todo** lugar de
  fechar dessas telas (inclusive o diálogo do desktop).
- **Hierarquia e espaçamento:** folha na altura do conteúdo (o botão vem logo depois, sem vão),
  espaço maior entre grupos que entre rótulo e conteúdo. [PD apontou; Claude]
- **"Aplicar em" é uma caixa que contém a lista**: o resumo é o topo da caixa (com a seta) e a
  lista abre **dentro** dela, separada por um traço. [PD]
- **Peça de gungi sem o emblema** em todas as listas e resumos. [PD]
- **"Como está cada parte"**: segmentados mais baixos. [PD]
- **Aba Status**: botão geral **"＋ Aplicar status"** (escolhe os personagens na lista), além do
  "＋ status" de cada personagem. [PD]

## Mestre — rodada v5 (2026-11-22) — `mestre-v5.html`

- **X vermelho e Voltar no padrão da gaveta do site** (`EdgeDrawer`): 36 px, **só 10 px para fora no
  topo e 8 px para dentro na lateral** — na folha do celular e no diálogo do desktop. A v4 vazava
  demais. [dono]
- Ícone do status do tamanho do bloco título + descrição: **mantido** (dono gostou).
- Seta do "Digitar" **maior, alinhada ao texto**, sem aumentar a linha (padrão do
  `JointProficiencyCard`: maior que a linha, margem negativa). [dono]
- Check um pouco maior (40 px), centrado, vazando por igual. [dono]
- Seta de "Aplicar em" maior (42 px) e **na mesma coluna das caixas de seleção** da lista. [dono]
- **"Editar status" no desktop sem degrau:** uma grade só (rótulo à esquerda, controle à direita)
  para as quatro partes, o apelido do status e "Quem vê"; todos os controles com a mesma largura e
  34 px de altura (apelido e "Quem vê" menores; partes um pouco maiores). [dono pediu alinhar; grade: Claude]

## Mestre — rodada v6 (2026-11-22) — `mestre-v6.html`

- **Sugestões de apelido: toda linha cheia encosta nos dois lados** da folha (as pílulas crescem para
  preencher); a última linha, incompleta, fica no tamanho natural, alinhada à esquerda. No desktop as
  quatro cabem numa linha que não está cheia, então ficam no tamanho natural. [dono: a regra; Claude:
  a última linha]
- **Lista de status de "Aplicar status" (desktop): todos da mesma largura**, um por linha na coluna
  da família. [dono]
- **Caixa de "Aplicar em" mais baixa** (44 px). [dono]
- **"Confira": nome do status em negrito.** [dono]

## Mestre — rodada v7 (2026-11-22) — `mestre-v7.html` (última da tela de aplicar)

- **"Aplicar status" (desktop): famílias da maior para a menor, linha por linha**, para encaixar a
  grade de 3 colunas: Consciência e corpo (5), Sentidos (5), Vida (4) · Testes (3), Guarda (3),
  Mente (2) · Parte do corpo (2), Ar (1), Presença (1). Só vale para essa lista de escolha; a caixa
  da peça continua na ordem do spec §5.2. [dono: a ideia; ordem exata: Claude]

## Lista de personagens e layout — decisões de 2026-11-25 — `personagens-v2.html`

- **Juntar as abas:** o footer do mestre ganha **"Personagens"** (no lugar da "Status" proposta),
  que abre a lista de personagens com os status. Um lugar só, igual no celular e no computador. [dono]
- **Sem o "＋ Aplicar status" geral** na lista: aplicar fica **só no "＋ status" de cada card** (a
  folha de aplicar já tem o "Aplicar em" para marcar outros personagens). [dono]
- O card de hoje fica igual (zona ajustada à mão); a faixa de etiquetas de status vem presa embaixo
  dele; jogador vê os próprios e os públicos dos outros; mestre vê tudo, apagado = a mesa não vê;
  tocar numa etiqueta abre a edição. [Claude, sem objeção]
- **Layout da mesa — vai junto nesta leva, sem refinar aqui** (o PO resolve com o dono) [dono]:
  - a **fila de ações** fica **sempre à mostra, à esquerda**, em **tablet e telas maiores**;
  - **celular em pé:** a fila fica onde está hoje, por enquanto;
  - **celular deitado:** a fila fica à esquerda, **como no computador**, e o **footer vai para a
    esquerda** (como a coluna de navegação do computador), porque deitado sobra pouca altura e o
    footer somado ao header come a tela; **o header continua**.

## Destaque no jogador — proposta v1 (2026-11-25) — `destaque-v1.html` — aguardando o dono

- Usa a **pilha de avisos que a mesa já tem no topo do mapa** (`StageNotices`: a do
  `LostDeclaredNotice`, do `ClockNotice` e do `MatchErrorBanner`), com a **etiqueta do status** dentro
  (mesmo padrão da faixa e do painel) e o **X vermelho** do site para fechar. [Claude]
- **Só avisa o que ele vê**: status que só o mestre vê nunca gera aviso nem pisca na faixa. [Claude, pela regra do brief]
- **Ganhou status:** aviso com a etiqueta e a frase do status, **fica até fechar**; na peça, o status
  novo **pisca algumas vezes** na faixa. Vários de uma vez (Inconsciente traz Caído): um aviso só.
- **Fora de ação** (Atordoado, Atônito, Inconsciente): borda vermelha, fica até fechar; o **"Ação" da
  navegação ganha um selo de cadeado** enquanto durar (no computador, no "Ação" da coluna).
- **Perdeu uma ação da fila:** "Sua ação **Atacar o Capanga** saiu da fila porque você ficou
  atordoado." Por status que ele não vê: só "Sua ação … saiu da fila." (lacuna **L8**).
- **Saiu do status:** aviso curto, **some sozinho em 6 s**; saindo de fora de ação, "Já pode agir." e o
  selo some.
- Mudou só o número ou o apelido: sem aviso.

## Destaque no jogador — rodada v2 (2026-11-25) — `destaque-v2.html`

Decidido pelo dono nesta rodada:
- **Reaproveitar a pilha de avisos do topo do mapa** (`StageNotices` em `MatchStageTemplate.tsx`, z 50,
  onde já moram `MatchErrorBanner`, `ClockNotice`, `LostDeclaredNotice`): o aviso de status é mais um
  componente nela. [dono aprovou a ideia]
- **Luz piscando na borda da tela** quando o personagem ganha um status, "como nos jogos", **na cor
  da família**; **exceto os debilitados**, na cor da aptidão (as dos atributos na ficha): corpo
  vermelho (`diagramPhysical`), mente roxo (`diagramMental`), espírito azul-claro (`diagramNen`).
  **Vermelho também para dano**: os status da família vida e **qualquer outro dano** que ele levar
  (dano: só a luz, sem aviso — a barra de vida já mostra quanto). [dono]
- **Guarda deixa de ser verde**: verde fica reservado a status **benéficos** (futuro). Proposta: um
  **amarelo novo**, diferente do dourado (o `gold400` já é o anel de seleção da peça e confundiria).
  Cor nova na palette = decisão do designer (`src/styles/CLAUDE.md`). [dono: tirar o verde;
  amarelo novo: Claude — **o líder de PD confirma a cor**]
- **Cópia do Preso:** "Não se desloca, **mas** age e reage normalmente." (vale para todo lugar que
  usa a frase, inclusive a folha do mestre). [dono]
- **X dos avisos no padrão do site** (o da gaveta); para caber, a pilha desce um pouco, fica um pouco
  mais estreita e os avisos ficam mais afastados entre si. [dono]
- **Todos os avisos com X**, inclusive "Já pode agir" (não havia motivo de UX forte para não ter: o
  X dá controle ao jogador; aviso que some sozinho também deve poder ser fechado). [dono perguntou; Claude]
- **Avisos somem sozinhos**: status **10 s**, "Já pode agir" **6 s**; tocar/passar o mouse segura o
  tempo. **Exceção:** "Sua ação saiu da fila" **fica até fechar** (o mesmo motivo do "o servidor
  perdeu sua ação": sem ele o jogador espera um turno que não vem). [dono: fechar sozinho; tempos e
  exceção: Claude]
- **Cadeado vermelho** (sem círculo) no "Ação" enquanto ele está fora de ação; **tocar no "Ação"
  bloqueado mostra o motivo** num balão acima do botão, **em vez de abrir o painel** (prevenir o erro
  em vez de mostrá-lo depois). Bloqueio **parcial** (Preso) continua abrindo o painel, com o Mover
  apagado e o motivo embaixo. [dono propôs; Claude concordou e definiu o parcial]
- Fora de ação: aviso com **borda vermelha mais grossa**. Só avisa o que ele vê.

Para o PO (registrado a pedido do dono):
- **Congelando como o Asfixiando**: não tirar vida direto; uma **barra própria** mostra que ele está
  congelando, e o congelamento **aplica outros status** (Lento, Corpo debilitado e outros a
  discutir). O dono quer conversar sobre isso com o PO.

## Destaque no jogador — rodada v3 (2026-11-25) — `destaque-v3.html`

- **X dos avisos vaza para cima E para a direita na mesma medida** (10 px), fica a 10 px do header e
  da borda da tela; por isso a pilha é mais estreita (20 px de cada lado) e **começa logo abaixo do
  header** (o X 10 px abaixo dele). Entre avisos, 20 px (o X do de baixo não encosta no de cima). [dono]
- **A luz fica só em volta do mapa (canvas)**, nunca sobre header, navegação, painéis ou colunas. [dono]
- **A luz pisca uma vez só: uma piscada forte e some devagar.** (No mockup ela se repete a cada 4 s só
  para dar para ver.) [dono]
- **Debilitados: faixa, etiqueta e luz na cor da aptidão** — corpo vermelho, mente roxo, espírito
  azul-claro — **em todo o site** (faixa da peça, caixa, painel, lista, folha do mestre). Assim a cor
  já diz o que está debilitado. [dono]
- **Cor da Guarda em aberto:** v2 com amarelo novo, v3 com o **dourado saturado que já existe
  (`gold400`)** — sem cor nova na palette. Único custo: o `gold400` também é o anel de seleção da
  peça, logo abaixo da faixa. [dono perguntou se dá para usar o gold400; Claude: dá]

## Destaque no jogador — rodada v4, final (2026-11-25) — `destaque-v4.html`

- **Curva da luz:** começa **fraca**, sobe **rápido** até uma piscada forte e depois **desce devagar**
  até sumir — uma vez só (no mockup: 0 → 30 % em ~0,25 s, → 100 % em ~0,2 s, → 0 em ~2,5 s, repetindo a
  cada 4 s só para dar para ver). [dono]
- **Avisos mais juntos e mais altos:** 12 px entre avisos (o X do de baixo quase encosta no de cima,
  sem cobrir texto) e o primeiro logo abaixo do header, com o **X 4 px abaixo do header** — não
  encosta nele para não disputar o toque com o botão "Histórico", que fica logo acima. [dono pediu
  mais perto; os 4 px: Claude]
- **Cor da Guarda: `gold400`** (o dono concordou com todo o resto da v3, que já a usava). [dono]
- Fora isso, a v3 vale inteira. [dono: "concordo com todo o restante"]

## Destaque — rodada v5 (2026-11-25) — `destaque-v5.html`

- **Curva da luz refeita:** a v4 ficou lenta. Agora chega ao máximo quase na hora (≈ 0,15 s), mais
  intensa que antes, e some devagar (≈ 3,2 s, um pouco mais lento que a v3). [dono]

## Mestre — aba "Partida", rodada v3 (2026-11-25) — `partida-v3.html`

- **O header não muda** (em todo tamanho de tela). Nos mockups ele aparece só indicado. [dono]
- **O painel de baixo do mestre (celular) não é folha:** fica **sempre visível e sempre da mesma
  altura**, em todas as abas; o conteúdo **rola dentro**. Não some, não cresce, não encolhe. **Sem X**
  (não fecha). Hoje a altura muda por aba (Fila ≈ 97 px num celular de 844 px; o painel de Ação do
  jogador ≈ 388 px); o mockup usa 300 px — o número final é do PO/designer. [dono]
- **Exceção: a ficha** abre no **formato de folha do jogador** (arredondada, afastada das laterais,
  vindo de trás da navegação), **cobrindo boa parte do mapa**, **em todo dispositivo, para mestre e
  jogador** — a exibição de hoje da ficha na mesa é ruim. Tem X; fecha no X ou tocando no pedaço de
  mapa que sobra. [dono: a exceção e o formato; fechar tocando no mapa: Claude]
- **Regime (Livre/Disputado) continua na aba Fila**, como hoje. [dono]
- **Nova cena vai para Partida**, como **botão que abre o fluxo de hoje** — nada de caixa de texto na
  tela. Encerrar partida também vai para Partida (separado, no pé). [dono]
- **Recorte com botão redondo também no mestre** ("poderia ser legal nas duas telas"): para o botão
  ficar no centro, o "Agir" vai para o meio: **Fila · Ficha · Agir · Personagens · Partida**. Só o
  jogador tem folha que abre e fecha; no mestre o recorte fica sobre o painel fixo. [dono inclinado;
  ordem: Claude]
- **Computador:** medido no print de hoje (1400 px): esquerda 412 px (navegação 72 + painel 340), mapa
  668 px, histórico 320 px. Proposta: **fila fixa 240 px, histórico 260 px, e os painéis de
  Agir/Ficha/Personagens/Partida flutuam sobre o mapa** (fecham clicando de novo no item ou no mapa);
  num notebook de 1366 px o mapa fica com ~794 px. [dono pediu mapa maior; proposta: Claude]

## Mestre — aba "Partida", rodada v4 (2026-11-25) — `partida-v4.html`

- **Ficha (celular):** sem o card do jogador por cima (confundia: só o texto "a ficha de hoje,
  inteira" indica o conteúdo); folha **≈ 16 % mais baixa** que a v3; **X mais para a direita**
  (vaza um pouco à direita, como nos avisos). [dono]
- **Celular: mapa e interface do mestre meio a meio, fixo** (a interface conta com a navegação). [dono]
- **Computador padrão e tablet (mestre):** a coluna da esquerda se divide em **duas metades fixas —
  em cima a interface escolhida (Agir por padrão, ou Partida), embaixo a fila**; cada metade rola
  por dentro; a navegação da coluna fica Agir · Ficha · Partida (Personagens já é aba da coluna da
  direita, com o Histórico). **O jogador não muda** (não vê a fila). [dono propôs; Claude concordou:
  o mapa ganha uma coluna e o mestre vê fila e ação juntas; cuidado: ~320 px por metade num notebook]
- **Widescreen e ultrawide:** fica a proposta da v3 (fila em coluna própria, painéis flutuando sobre o
  mapa) — o dono testou no notebook widescreen a 100 % e numa ultrawide. Ponto de troca sugerido:
  ~1600 px de largura (PO decide). [dono]
- **Computador: a ficha abre como hoje**, ao lado da coluna — sem mudança (o dono refina depois com o
  líder de PD). [dono]

## Fechamento da tela do mestre (2026-11-22)

- **A v7 é a versão final** da tela de aplicar/editar/tirar; as anteriores são só histórico. [dono]
- Com isso: **textos de "Quem vê" = os da v7** (Todos · Mestre e alvo · Só o mestre · Escolher, com
  "padrão" no padrão do tipo) e **Intensidade = opção A** (começa "Não definida"), que é o que a v7
  mostra. [dono, por aprovar a v7] — A depende do back (L7) e de uma regra de jogo para "sem
  intensidade" (PO).

### Intensidade — opções (para o dono decidir)

Quais status têm número hoje (contrato §4): **intensidade** (`points`, obrigatório ≥ 1) em
Paralisado, Atônito, Atordoado; **HP por round** (`hpPerRound`, padrão 1) em Sangrando, Queimando,
Congelando, Envenenado; **penalidade** (`penalty`, obrigatória ≥ 1) no Lento; penalidade opcional
(com desvantagem) em sentido prejudicado e Debilitado. Os demais não têm número.

- **A. "Não definida" como estado válido** (na v3): o seletor começa em "—"; o mestre define agora
  ou depois, editando. Exige o back aceitar `points` ausente (L7) e uma regra para "sem
  intensidade" (ex.: não se recupera sozinho até ser definida — regra de jogo, PO).
- **B. Opcional atrás de "Definir intensidade ⌄"**: o seletor nem aparece até ser pedido. Menos
  ruído para o caso comum; mesma dependência do back.
- **C. Manter obrigatória**, começando vazia e travando o Aplicar até preencher (v1/v2). Sem mudança
  no back, mas força o mestre a decidir na hora.

Recomendação: **A** — é a que o dono descreveu, e mostrar "Não definida" deixa claro o estado
para quem lê o status depois (cartão, faixa).

## Perguntas de regra de jogo — para o PO (não decididas)

1. O jogador vê os **números** dos status de outro personagem (ex.: "Queimando 1", pontos do
   Paralisado do alvo)? Hoje o contrato manda todos os parâmetros de um status visível.
2. **Vários alvos** no painel de ação: de quem mostrar barras/status? Ideia do dono: avatares dos
   alvos no topo do cartão, o escolhido no centro (grande), os outros menores, tocar troca.
3. (Já decidido no brief 2026-11-21, só registro) revelar barras: por personagem + atalhos.

## Lacunas de contrato — para o PO/back

- **L1. Barras na peça e no painel:** stamina não chega ao vivo pelo WS; vida dos outros só vai ao
  mestre e ao dono (`character_hp_changed`); não existe comando de revelar barras.
- **L2. Recusa por status invisível:** o servidor manda `"<nick> não pode atacar por causa de um
  efeito."`; o dono quer "Você não pode atacar devido a um status desconhecido." e o contrato proíbe
  parsear. O back precisa mudar o texto (ou mandar o "o que" em campo).
- **L3. `status_effect_exists` em lote** não diz qual personagem já tem (`"O personagem já está
  paralisado."`). Mitigação no front: marcar "já tem" nos chips de "Aplicar em" antes de enviar.
- **L5. Quem vê por personagem num lote.** `apply_status_effect` tem **uma** `visibility` para todos
  os `characterIds`. Com vários alvos: "Mestre e alvo" só funciona como `mode: default` (cada dono vê
  o seu) **quando o padrão do tipo é escondido**; num tipo público (Preso) não há como dizer "cada
  dono vê o seu" num comando só. E "Escolher" com vários alvos dá a mesma lista para todos (quem
  tem o olho vê o status em todos os que recebem — a dica da tela diz isso). Precisa de
  `visibility` por personagem (ou um modo "dono") no back, ou de o front mandar um comando por
  personagem (perde o tudo-ou-nada).
- **L7. Intensidade opcional:** hoje `points` é obrigatório (≥ 1) em Paralisado/Atônito/Atordoado;
  a opção A/B acima precisa que seja opcional, e de uma regra de jogo para "sem intensidade".
- **L8. Ação tirada da fila por status:** `action_cancelled` só traz o `actionId`; para dizer "porque você ficou atordoado" o front precisa da causa (o tipo do status, **só quando o dono o vê**). Sem isso, o aviso diz apenas que a ação saiu da fila.
- **L6. Cópia:** sugestão "Enredado" → "Amarrado" no contrato §3 e no spec §8.
- **L4. Histórico/revelar** (`POST …/reveal`, `concealedBy`): não coberto por esta sessão; onde fica o
  botão "revelar" do mestre (histórico e/ou edição do status) está em aberto.

## Pendências desta sessão (atualizadas em 2026-11-22: ver o prompt ao PO `2026-11-22-status-effects-front-prompt-po.md`)

1. Dono analisar `mestre-aplicar*.html` (amanhã) e responder as perguntas acima.
2. Desenhar a **lista de personagens** (número e apelido; mestre edita/tira) e o **destaque no
   jogador** (ganhou status / não pode agir).
3. **Prompt para a sessão de PO** sobre o redesenho do painel de ação (o dono pediu: formato,
   navegação com recorte, enviar no footer, rascunho guardado, avatar/barras, vários alvos,
   "agindo como"), para o PO refinar com ele.
4. Escrever o **design doc final** curto (`…-status-effects-front-design.md`) a partir destas notas,
   com os mockups.

## Ambiente (para retomar)

- Servidor de mockups (superpowers visual companion), idle de 48h:
  `http://localhost:56445/?key=<key do servidor, impressa ao iniciar>` —
  serve só o arquivo mais novo de `System_X_System_React/.superpowers/brainstorm/<sessão>/content/`.
  Reiniciar: `bash ~/.claude/plugins/cache/claude-plugins-official/superpowers/7.0.2/skills/brainstorming/scripts/start-server.sh --project-dir <React> --idle-timeout-minutes 2880`
  (cria pasta nova: copiar `gi.js`, `gungi.svg`, `avatar.png` e o HTML para ela).
- Mesa da seed: `http://localhost:5173/campaigns/1ef12dfc-ffbf-40d4-b5fe-733e5bde34cc/matches/5cc94c30-b4f4-4a07-84aa-af3728071478/game`
  (mestre@seed.dev / jogador1@seed.dev, senha `seed-dev-123`). Chrome headless de CDP na 9333 com
  perfil próprio (não toca a aba do dono); driver no scratchpad da sessão (`cdp.mjs`).
