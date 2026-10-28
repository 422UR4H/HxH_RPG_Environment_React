# Briefings para o Claude Design — pendências de design pré-TCC

Data: 28/10/2026 · Origem: as duas auditorias de UI/UX (`2026-10-auditoria-tcc.md` e `2026-10-27-auditoria-ui-ux.md`) e as decisões de cada uma.

São quatro briefings, um por assunto. Cada um é independente: dá para levar ao Claude Design numa conversa só, um de cada vez, ou só os que forem prioridade.

## Como usar

1. No Claude, crie um artifact do tipo **Design** (é o Claude Design; não use `/design-sync`, porque o site avulso fecha em 14/12/2026).
2. Cole o texto de um briefing inteiro (da linha `### Briefing` até o fim da seção) e anexe os prints listados nele. Eles estão na pasta `2026-10-briefings-claude-design/`, ao lado deste arquivo.
3. Peça o Design System pelo link abaixo, para o Claude Design trabalhar com as cores e componentes reais.
4. Traga o link do resultado para a sessão de implementação.

**Design System (v12, já reflete o `tokens.ts` depois do PR #89):** https://claude.ai/artifact/TxCRCJxNB6qX13WKxAjZRV

## Restrições comuns (valem para os quatro)

- **Não é redesign.** O professor gosta da identidade atual: fundo de mapa nas telas de mundo, fundo de espaço na ficha, cabeçalho verde com a logo, traço grosso escuro nos elementos principais, Roboto como fonte.
- **Só os tokens que existem** (`palette` e `colors` do Design System). Uma cor nova na palette é decisão do designer, e o briefing deve dizer explicitamente se propõe uma.
- **Contraste mínimo de 4,5:1** para texto até 18 px; 3:1 para texto grande e ícones.
- **Toque:** alvos de pelo menos 44×44 px no celular.
- **Larguras que precisam funcionar:** 320, 390, 768, 1024, 1366, 1920, e o projetor da apresentação (1280×800 a 150%, que dá 853×533).
- **Português** em todo texto de interface.
- O que já foi decidido não volta: **não há botão de sair da mesa** (NAV-01); os botões flutuantes que **encaixam em bloco no fim da página** ficam como estão (CON-06 e CON-09 revisto).

---

## 1. CON-01 — Ícones em emoji ao lado de ícones SVG

### Briefing

**Telas:** quase todas. Onde aparece mais: menu Gerenciar (campanha, partida, ficha), editor de mapa, mesa do mestre e do jogador (abas de baixo e histórico), escolha de imagem.

**Problema.** O projeto tem ícones SVG próprios, com o traço da identidade (seta de voltar, check, "?", lápis, câmera, mais/menos, x). Ao lado deles, muitos botões usam caracteres de emoji ou símbolos de texto. Esses mudam de desenho conforme o sistema (Windows, Android e iPhone desenham ⚙ e 🗑 de jeitos diferentes, alguns coloridos), não seguem o traço do projeto e às vezes nem a cor do texto. Na mesma tela convivem dois sistemas de ícone.

**Inventário atual (código em `main` depois da fase 3):**

| Onde | Símbolo | Significado |
|---|---|---|
| Menu Gerenciar (`ManageButton`) | ⚙, ▾/▴, 🗑 | gerenciar, abrir/fechar menu, excluir |
| Escolha de imagem (`ImagePickerModal`) | 📁, 🔗, ⚠️, ⚠ | enviar arquivo, colar link, aviso de descarte |
| Editor do background (`BackgroundEditorModal`) | 💡, ⚠ | dica de formatação, aviso de descarte |
| Fundo do mapa (`BgImagePanel`) | 🔒/🔓 | travar proporção |
| Peça no mapa (`PiecePropertyPanel`) | ✕ | remover do mapa |
| Paredes (`WallConfigPanel`) | ✓ | aplicado |
| Barra do editor (`MapEditorToolbar`) | ↺, ↻ | desfazer, refazer |
| Mesa do mestre, abas de baixo | ☰, ⚔, 📜 | fila, agir, ficha |
| Mesa do jogador, abas de baixo | ⚔, 📜 | ação, ficha |
| Mesa, saldos e compositor (`OwnBars`, `ActionComposer`) | ⚔, ➜ | saldo de ação, saldo de movimento, mover |
| Mesa, verbos de parede (`wallVerbs`) | ⚔, 🚪, 🔓 | atacar, abrir/fechar, arrombar |
| Mesa, histórico (`EventStream`) | ♥, ↻, ⇄, ✦, ⚑, ✕ | dano/cura, fim da rodada, regime, cena, ação do mestre, cancelou |
| Mesa, barras e editor de rolagem | ▾/▴ | abrir/fechar |
| Mesa, avisos (`MatchErrorBanner`, `LostDeclaredNotice`, `MasterControls`) e "× Cancelar" | × | fechar, cancelar |

**SVGs que já existem** (`src/assets/icons`): seta para baixo, câmera, check, menos, lápis, mais, "?" (dois tamanhos), x, seta de voltar (com e sem ponta), emblema, livro do background, gungi.

**Caminhos a explorar:**
- **A. Um conjunto SVG próprio, no traço da logo.** Desenhar os que faltam (engrenagem, lixeira, desfazer/refazer, espada, pergaminho, porta, cadeado, link, pasta) no mesmo traço dos SVGs atuais. É o mais coerente, mas é o que dá mais trabalho.
- **B. Uma biblioteca de ícones de traço** (do tipo Lucide ou Phosphor), com a espessura e as pontas ajustadas para combinar com os SVGs atuais. É rápido, mas é preciso conferir se o traço conversa com a identidade.
- **C. Híbrido.** Biblioteca para os ícones utilitários (desfazer, lixeira, link, cadeado) e SVG próprio para os do jogo (espada, pergaminho, porta, os do histórico).

**Restrições específicas:** o ícone herda a cor do texto (para funcionar no claro e no escuro); 20–24 px nos botões, 16 px no histórico da mesa; o ⚙ do "Gerenciar" e o ▾ do menu são os mais vistos e vêm primeiro; o histórico da mesa precisa distinguir os tipos de evento sem depender só da cor.

**Prints de referência:** `CON-01-1.webp`, `CON-01-2.webp` (primeira auditoria).

---

## 2. NAV-02 — Ficha estreita e sem cabeçalho no desktop

### Briefing

**Telas:** ver, criar e editar ficha de personagem, de 1024 px para cima (no celular e no tablet a ficha já ocupa a tela toda e está boa).

**Problema.** A ficha é a única tela sem a barra verde com a logo. No desktop, ela é uma coluna de no máximo 940 px no centro, com faixas cinza vazias dos dois lados (em 1920, mais de 480 px de cada lado). O conteúdo dela é denso (cabeçalho do personagem, diagramas de atributos, perícias, proficiências) e fica espremido enquanto sobra tela. Parece um layout de celular no meio do monitor.

**O que já mudou e precisa ser levado em conta:**
- Os botões flutuantes da ficha ("Gerenciar" e "Procurar Campanhas") agora ficam presos às bordas da coluna da ficha (FICHA-01, fase 3). Se a coluna mudar, eles acompanham sozinhos.
- O perfil do personagem ganhou rótulos na borda dos campos e a barra de abrir/fechar no rodapé (FOR-09, fase 3).
- Os diagramas de atributos e os cards do cabeçalho são uma zona ajustada pixel a pixel: a proposta não deve exigir redesenhar os diagramas, só a moldura em volta deles.
- No futuro entra mais um diagrama na coluna de atributos (o espiritual de Conscience, com os princípios Nen).

**Caminhos a explorar:**
- **A. Cabeçalho padrão + fundo temático nas laterais.** A barra verde com a logo e o "Voltar", como nas outras telas, e o fundo de espaço ocupando a janela inteira (não só a coluna). A ficha continua uma coluna central, mas deixa de flutuar sobre o cinza.
- **B. Ficha mais larga, em duas colunas reais no desktop.** Acima de ~1280 px, cabeçalho do personagem e atributos à esquerda, perícias e proficiências à direita, aproveitando a largura.
- **C. Manter a coluna como "cartão" de propósito.** Assumir a ficha como um objeto (uma ficha de papel sobre a mesa): sombra, borda e fundo lateral que façam o cinza parecer intencional, com o cabeçalho padrão por cima.

**Restrições específicas:** o fundo de espaço é a identidade das telas de ficha (os erros e carregamentos da ficha já usam ele); celular e tablet não mudam; a tela precisa caber no projetor (853×533) sem esconder os botões.

**Prints de referência:** `NAV-02-1.webp` (primeira auditoria, 1440), `ficha-1920.webp` e `ficha-1366.webp` (estado atual, depois da fase 3).

---

## 3. Mensagens de erro e avisos — um padrão único

### Briefing

**Pergunta da primeira auditoria:** o padrão de erro da fase 2 (FOR-04: mensagem por campo, em português, sem o balão do navegador) basta, ou vale padronizar no Claude Design?

**Avaliação: não basta.** O FOR-04 resolveu só o login e o cadastro. O resto do site tem uns 12 componentes de erro e aviso, feitos um a um conforme as funcionalidades chegaram, em cinco desenhos diferentes:

| Desenho | Onde |
|---|---|
| 1. Borda à esquerda + fundo levemente tingido | erro e aviso do login/cadastro (cartão claro); erro ao salvar a ficha; aviso de lobby fechado e erro de formulário (versão escura, fase 3) |
| 2. Caixa vermelha translúcida | era o erro de envio dos formulários de campanha e partida |
| 3. Texto vermelho solto | erro do campo (login), erro ao trocar o mapa da partida, erro ao enviar imagem, erro ao salvar o mapa, erro ao excluir campanha, erro ao carregar o histórico da mesa |
| 4. Faixa com borda e "×" para fechar | erros da mesa, aviso de ação perdida, falha ao carregar o fundo do mapa |
| 5. Página inteira (ícone, título, "Tentar de novo") | erro ao carregar qualquer página |

**Por que importa (e um caso grave já achado):** o erro de envio dos formulários (desenho 2) estava em vermelho sobre vermelho translúcido em cima do mapa, com contraste de **1,2:1**, praticamente invisível ("Erro ao criar campanha. Tente novamente."). Foi corrigido na fase 3 com a versão escura do desenho 1, mas o fato de cada tela ter o seu erro é o que permitiu isso passar. O texto vermelho solto (desenho 3) sobre os marrons tem o mesmo risco.

**O que pedir ao Claude Design:** uma escala de mensagens por **nível**, com o desenho de cada um e o tom de texto:
- **Campo** (o valor digitado está errado);
- **Formulário/ação** (o envio falhou, tente de novo);
- **Aviso** (não é erro: lobby fechado, conta criada, sessão expirada);
- **Mesa** (erro durante o jogo, que some sozinho ou se fecha);
- **Página** (não carregou).

Para cada nível: versão sobre fundo claro (login) e sobre fundo escuro (mapa, ficha, mesa); com ou sem ícone; onde fica; como some. E um guia curto de escrita (o que aconteceu + o que fazer: "Não foi possível salvar. Suas alterações estão guardadas aqui; tente de novo.").

**Caminhos a explorar:**
- **A. Estender o desenho 1** (borda à esquerda + tinta) para todos os níveis, variando a cor da borda (vermelho para erro, dourado para aviso) e o tamanho. É o que já está mais espalhado e o que a fase 3 adotou como provisório.
- **B. Caixa com ícone** (o "!" do erro de página) em todos os níveis acima de campo, para o erro ser reconhecido sem depender de cor.
- **C. Erros da mesa como "toast"**, no canto, separados dos erros de formulário, porque a mesa tem um tabuleiro que não pode ser coberto.

**Restrições específicas:** vermelho de erro é `feedbackDanger`/`feedbackDangerText`, dourado de destaque é `actionHighlight`; texto de erro sobre o mapa precisa de base escura (a textura do mapa é clara); erro nunca só pela cor.

**Prints de referência:** `erro-formulario-antes.webp` (o 1,2:1), `erro-formulario-depois.webp`, `erro-pagina.webp`, `erro-salvar-mapa.webp` (texto vermelho solto), `erro-login.webp`, `aviso-lobby-fechado.webp`.

---

## 4. Abas da campanha e da partida (COR-08 + NAV-03)

### Briefing

**Telas:** página da campanha (abas "Partidas" e "Mapas") e página da partida ("Eventos" e "Mapas"), mestre e jogador, todas as larguras.

**Problema.**
- A aba inativa ("Mapas") está em cinza claro direto sobre o mapa, com contraste de **2,1:1** (o mínimo é 4,5:1); no projetor ela some.
- O dono do produto nunca gostou dessa barra de abas: ela não foi pensada para o projeto e destoa (texto fino, sublinhado verde, nada do traço grosso da identidade).
- A aba "Eventos" da partida não lista evento nenhum: só contém os botões.
- Hoje a barra some quando há uma aba só, então o jogador normalmente não a vê. A exceção é a partida encerrada: ali o jogador vê "Eventos" e "Mapas", e "Mapas" só traz o aviso "Os mapas jogados nesta partida estarão disponíveis em breve.".

**Decisões já tomadas (restrições do briefing):**
- **Jogador não vê abas**, nem na campanha nem na partida. Na prática, sai a aba "Mapas" que o jogador vê na partida encerrada, junto com o aviso de "em breve" que ela mostra.
- **"Eventos" ganha o selo "Em breve"** com uma linha de descrição (como a coluna de Regras faz), porque a lista de eventos é uma funcionalidade futura.
- Os botões flutuantes que hoje ficam embaixo das abas (Gerenciar, Criar Partida, Abrir Lobby, Entrar) continuam onde estão, com o comportamento de flutuar e encaixar intacto.

**O que pedir:** o desenho da navegação entre "o conteúdo" e "os mapas" para o mestre, e como fica a mesma área para o jogador (sem abas: título de seção? nada?).

**Caminhos a explorar:**
- **A. Abas como botões de segmento** (duas pílulas lado a lado, a ativa cheia em verde e a inativa com o contorno escuro grosso), no peso dos botões do projeto.
- **B. Abas de pasta**, com a ativa "colada" no painel marrom de baixo (como uma ficha de arquivo), usando os marrons dos painéis.
- **C. Sem abas:** "Mapas" vira uma seção abaixo, ou um botão "Mapas da campanha" no menu Gerenciar do mestre; a página mostra só o conteúdo principal.

**Restrições específicas:** o texto da aba inativa com pelo menos 4,5:1 sobre o mapa; alvo de toque de 44 px; funcionar em 320 px com os rótulos inteiros; o selo "Em breve" já existe no projeto (coluna de Regras, editor de mapa).

**Prints de referência:** `COR-08-1.webp` (aba "Mapas" ampliada), `NAV-03-1.webp` (aba Eventos), `abas-campanha-mestre-390.webp` (mestre, com abas), `abas-campanha-jogador-390.webp` (jogador, sem barra), `abas-partida-mestre-1366.webp`.

---

## O que não virou briefing

- **NAV-01 (sair da mesa):** decidido, não há botão de sair.
- **FICHA-02 (título "ATRIBUTOS" longe do diagrama):** resolvido na fase 3. Nos modos criar e editar ainda há uns 70–89 px entre o título e o diagrama, mas quem ocupa esse espaço é o contador "Pontos para Distribuir", não vazio. Se o designer quiser mexer, é dentro dos diagramas (zona ajustada pixel a pixel) e entra junto com o NAV-02.
