# Decisões da triagem — segunda auditoria UI/UX pré-TCC

Entrada da fase 3. Fonte: o banco do artifact de triagem (https://claude.ai/artifact/Jwr1eKJXJ5FrLvWD1hMjGo, coleção `decisoes`), lido direto em 28/10/2026. Os achados estão em `2026-10-27-auditoria-ui-ux.md`.

Os 20 achados foram marcados **Fazer**; IDENT-01 ficou na opção **A**. Abaixo, cada nota do dono do produto (resumida quando é só "perfeito") e a decisão tomada em resposta. Onde a nota faz uma pergunta, a resposta está aqui.

## Regra que vale para todos

As notas repetem um pedido: **não regredir onde o problema não acontece**. Toda correção se limita às larguras e aos casos medidos na auditoria. Fora deles, a tela fica pixel a pixel como está; cada PR traz print de antes e depois nas larguras em que nada deveria mudar.

## Vão para o Claude Design (não entram na fase 3)

- **COR-08 + NAV-03 — Abas da campanha e da partida.** O dono do produto nunca gostou da barra de abas e pediu um redesenho, não só o contraste. Como as duas decisões mexem no mesmo lugar (a barra e o que fica embaixo dela), vão juntas num briefing. Decisões de comportamento já tomadas, que o briefing leva como restrição:
  - Jogador não vê abas: nem na partida (hoje só "Eventos", e "Mapas" depois do fim da partida) nem na campanha (hoje só "Partidas"). O placeholder "Os mapas jogados nesta partida estarão disponíveis em breve." sai da visão do jogador.
  - "Eventos" ganha o selo "Em breve" com uma linha de descrição, como a coluna de Regras.
  - O contraste da aba inativa (2,1:1) é resolvido pelo redesenho.

## Fase 3 — decisões por achado

### Lobby e editor de mapa

- **EDI-03 — Fazer.** Nota: não regredir onde não há problema. Decisão: a coluna inteira rola em bloco só quando falta altura; em tela alta (ex.: 1366×768, 1920×1080) a coluna fica idêntica à de hoje.
- **LOB-01 — Fazer.** Pergunta: *o fundo do painel deve ser o mesmo marrom das colunas laterais, ou o próximo marrom mais claro?* Resposta: o mesmo (`surfaceSidebar`, `brown900`). Três motivos:
  1. O painel é uma lista de personagens, o mesmo tipo de conteúdo da coluna Personagens. Mesmo conteúdo com a mesma superfície se lê como "a mesma coisa".
  2. O marrom seguinte (`brown700`, `surfaceInput`) é o fundo dos **campos** e dos cards de partida. Pintar o painel com ele o faria parecer um campo grande, e a busca dentro do painel, que é um campo, perderia o contraste com o próprio fundo.
  3. O tabuleiro é escuro; o painel ao lado precisa ser o fundo mais quieto, para não competir com ele.
- **LOB-02 — Fazer.** Sem a reserva dos flutuantes no lobby; o tabuleiro abre enquadrado e ganha o botão "Enquadrar" da mesa.
- **LOB-03 — Fazer.** Nota: resolver como achar melhor, avaliar se vale descer os botões, e se a cor está certa. Decisões:
  - **Cor: não está certa.** "Iniciar Partida" (verde cheio) e "Cancelar Lobby" (vermelho cheio) têm o mesmo peso, e o olho não sabe qual é a ação principal. A ação destrutiva e secundária passa a ter menos peso que a principal, num estilo secundário que o projeto já usa (sem token novo). A confirmação de cancelar continua no diálogo.
  - **Posição: ficam em cima.** O mestre arruma as peças e depois inicia. Mas no desktop o tabuleiro é alto: embaixo dele o botão ficaria fora da tela, que é pior.
  - Empilhados, os dois com a mesma largura.
- **MESA-07 — Fazer.** Como sugerido.
- **EST-07 — Fazer.** Nota: cuidar do contraste e avaliar se o texto é necessário. Resposta: **é necessário.** A página da partida não tem como saber, antes, se o mestre abriu o lobby: isso só chega pela conexão do lobby. O jogador clica em "Entrar no Lobby", o lobby responde que está fechado e devolve a pessoa para a partida. Sem o aviso, o clique parece não ter feito nada. Fica o aviso, com cara de aviso (como o do login), e o texto passa a dizer o que fazer: "O mestre ainda não abriu o lobby. Tente de novo daqui a pouco."

### Formulários, listas e telas de mundo

- **FOR-07 — Fazer.** Nota: não regredir onde cabe, e o cinza do calendário não combina; proposta de usar o marrom escuro dos campos no fundo e verde nos seletores. Decisões:
  - **Fundo: sim, sai o cinza.** O cinza vem da família dos painéis de menu, de outro contexto. O calendário passa ao marrom mais escuro (`surfaceSidebar`, `brown900`), e não ao marrom dos campos: ele abre **por cima** dos campos, e na mesma cor se confundiria com eles. Um tom mais escuro, com a sombra que já tem, se lê como uma camada acima.
  - **Seletores de mês, ano e hora: continuam marrons, como campos.** São campos e devem parecer campos. Verde no projeto quer dizer "selecionado" ou "confirmar" (o dia escolhido, os botões de ação). Seletores verdes competiriam com o dia escolhido, que é a única coisa que deve saltar aos olhos.
  - Posição: como sugerido, preso dentro da janela só quando não couber de nenhum lado.
- **HIER-01 — Fazer.** Nota: muito cuidado com regressão; mudar só onde a inversão acontece. Decisão: os tamanhos só mudam abaixo da largura de coluna em que o rótulo ou o subtítulo passam o título. Acima dela, os valores de hoje ficam exatamente iguais (não vale um `clamp` contínuo que encolha também nas larguras boas).
- **RES-03 — Fazer.** Pergunta: *a data não fica melhor em cima do título, já que a campanha conta uma história pelas partidas?* Resposta: **sim, no celular a data vai para cima do título**, pequena e discreta (o padrão "sobretítulo"). O título continua o maior texto do card. Numa lista em ordem cronológica, a data é a âncora de leitura: com ela sempre no mesmo ponto, o olho desce a lista pelas datas como numa linha do tempo, e é isso que a campanha conta. Na largura em que a data cabe à direita (o desenho de hoje), nada muda. A data de fim ("Fim:") passa a seguir o fluxo do card no celular, para não encostar na descrição.
- **CON-09 — Fazer.** Nota: não ficou claro o que muda; o comportamento de flutuar e depois encaixar no fim da página não pode regredir. Resposta: **o comportamento fica exatamente como está**: flutua enquanto há página por baixo e encaixa no lugar dela no fim. Muda só o **desenho** do botão quando ele está encaixado: hoje, encaixado, ele vira um bloco quadrado alto (até 91 px, com texto de 12 px); passa a ter o mesmo tamanho, a mesma fonte e a mesma forma de pílula de quando flutua. Nos casos em que já está certo (flutuando, e o 320 da partida), nada muda.
- **TIP-03 — Fazer.** Como sugerido.
- **EST-06 — Fazer.** Nota: corrigir mantendo a consistência nos casos mal diagramados. Decisão: o ajuste fica no `EmptyState`, e todas as listas vazias que o usam herdam a correção.
- **FOR-08 — Fazer.** Nota: quebrar linha por um espacinho é demais; pode reduzir a fonte. Decisão: centralizado, e a fonte do link encolhe só nas larguras em que ele não cabe, para caber numa linha até 320 px. Acima disso, mesmo tamanho de hoje.
- **COR-09 — Fazer.** Como sugerido.
- **IDENT-01 — Opção A.** Borda de 3 px no quase-preto do contorno do "Entrar", cantos iguais aos do botão, rótulo em negrito escuro; foco azul da marca com anel; erro vermelho.

### Ficha

- **FOR-09 — Fazer, ampliado.** Nota: em vez do rótulo em cima (como Aniversário/Idade), usar no perfil inteiro o **rótulo na borda** do login e do cadastro, que economiza espaço; e mover a barra cinza com a seta para o **rodapé** do perfil aberto. A pergunta era *"o que você acha?"*. Resposta: **as duas coisas estão certas.**
  - *Rótulo na borda no perfil todo* (nome completo, descrição breve, aniversário, idade, alinhamento): ganha uma linha por campo, deixa o perfil igual aos formulários de entrada e resolve o achado (o rótulo nunca some). Vale nos modos em que o perfil tem campos (criar e editar). No modo ver, que mostra só texto, os rótulos continuam como estão.
  - *Barra no rodapé*: é o desenho de uma persiana. Fechado, o perfil é só a barra, com a seta para baixo ("puxe"). Aberto, o conteúdo desce e a barra vai junto, como a borda de baixo da persiana, com a seta para cima ("recolha"). A barra fica sempre na borda que se mexe, e quem acabou de ler o perfil fecha ali mesmo, sem voltar ao topo. A orientação da seta não muda.
  - Junto, a barra vira um botão de verdade (hoje é uma `div` clicável): dá para abrir e fechar pelo teclado, e o leitor de tela anuncia "aberto/fechado".
- **FICHA-01 — Fazer.** Os flutuantes da ficha se prendem às bordas da coluna da ficha, não da janela. Se o NAV-02 mudar a coluna depois, os botões acompanham sozinhos.
- **FICHA-02 — Fazer.** Nota: cuidado com a coluna de perícias, que é bem alta, e com o diagrama espiritual de Conscience (princípios Nen), que vai pôr mais diagramas na coluna. Decisão: título e diagramas **encostados no topo, com espaçamento fixo entre eles**; o que sobrar de altura fica embaixo. É a única opção que aguenta diagramas novos sem refazer a coluna: espalhar pela altura (`space-between`, o de hoje) separa o título do conteúdo quando há pouco, e aperta tudo quando houver mais. Os diagramas não mudam (zona pixel-tuned).
