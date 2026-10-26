# Fase 2 da auditoria pré-TCC — design

Data: 2026-10-26 · Base: `main` em `d11bd58` (tokens em duas camadas já mergeados, PR #81).

## Intenção

O designer vai apresentar o System X System como TCC, no sistema online (Render + Neon, um ambiente de teste). A
identidade visual está aprovada pelo professor: **nada de redesign**. A fase 1 levantou 55 achados de detalhe
(estados, consistência, textos, responsividade, acessibilidade e cor). Esta fase corrige os que o dono do produto
marcou como “fazer”, com qualidade de design e de engenharia: cada correção ataca a causa e tira a duplicação que
ela gerou (refatorar junto é esperado).

A banca vai ver o produto principalmente em três momentos, e é por eles que a ordem dos PRs foi escolhida:

1. Entrar no site, com o servidor dormindo: login e primeira página levam de 14 s a vários minutos (PROD-01 e 02).
2. Navegar pelas campanhas e abrir a mesa: é aí que os estados de carregando e erro aparecem.
3. Jogar um turno na mesa, provavelmente num projetor.

## Fontes, nesta ordem de precedência

1. As palavras do dono do produto: `docs/audits/2026-10-auditoria-tcc-decisoes.md` (as duas rodadas, literais).
2. Esta spec, que registra como cada decisão vira código e as decisões que ele me delegou (seção “Decisões
   delegadas”).
3. O relatório `docs/audits/2026-10-auditoria-tcc.md`: para cada id, *o que está errado* e *onde* (arquivos e
   linhas). A *correção sugerida* do relatório vale, exceto onde esta spec diz outra coisa.

## Maquetes aprovadas e valores de referência
As maquetes que o dono do produto aprovou estão em `docs/audits/2026-10-auditoria-tcc/fase2/` (as mesmas do
artifact de decisões). Elas foram feitas com CSS injetado nas páginas reais, então valem pelo desenho, não pelo
código. Os valores usados nelas, que servem de ponto de partida:
- **Estado de página** (`est-*.webp`): cartão com largura máxima de 460 px, `calc(100% - 32px)` no celular;
  padding de 32 × 36 px no desktop e 24 × 20 px no celular; raio de 12 px; sombra `0 8px 28px` em preto a 45%.
  Ícone de 44 px. Título de 22 px/700, texto de 16 px com altura de linha 1,45 e rótulo do carregando de 20 px/500.
  Indicador circular de 40 px com traço de 4 px. Botões com altura mínima de 44 px, padding horizontal de 20 px,
  raio de 6 px e 16 px/700; vão de 12 px entre eles.
- **Login** (`login-neutra-*.webp` e `login-azul-390.webp`): campo com borda de 2 px, raio de 8 px, texto de
  18 px/400 e altura de 48 px; rótulo de 14 px/600; anel de foco de 3 px no azul da marca a 35%; mensagem de erro de
  15 px/500 com ícone de 18 px. No celular, o cartão com 16 px de margem, raio de 16 px e padding de 24 × 20 px.
  **Diferenças pedidas depois das maquetes:** o rótulo vai embutido na borda (as maquetes o mostram acima do campo)
  e o espaço entre campos é igual ao espaço até o botão.
- **Barras** (`bars.webp`): opção D, a última linha. **Selos** (`tags.webp`): opção 1. **Flutuantes**
  (`float-forte-390.webp`): sombra `0 6px 18px` em preto a 60%, mais um contorno de 1 px em branco a 14%.
  **Menu Gerenciar**: as maquetes `menu-*` são anteriores à decisão; o desenho final é o da “Ação indisponível” no
  PR 7.

## Como trabalham quem implementa e quem coordena
- Os PRs são implementados por subagentes, coordenados pela sessão principal, que fala com o dono do produto.
  Onde esta spec diz “pergunte” ou “pare e mostre”, quem implementa **para e reporta à sessão principal**, que leva a
  questão ao dono do produto. Quem implementa não escolhe sozinho nesses pontos.
- **Regras do back valem mais que os textos desta spec.** Se o back contradiz uma regra citada aqui (tamanho do
  e-mail e da senha, quem pode excluir o quê), segue-se o back, e o texto da interface é ajustado no PR, com nota.
- **Ordem e base dos branches:** os PRs vão de 1 a 7, nessa ordem. Um PR que depende de algo de um anterior ainda
  não mergeado sai do branch desse anterior (PR empilhado, com a base apontada para ele). Quando o anterior é
  mergeado, o GitHub reaponta a base para a `main`, porque o repo apaga o branch no merge. Sem dependência, o PR sai
  da `main`. Dependências conhecidas: o 3 usa a variável de foco e o token azul de superfície clara do 2; o 4 e o 7
  usam os tokens de desativado do 2; o 4 pode usar o componente de estado do 1.

## Metas
- Todo item “fazer” das decisões, com a rota *direto* ou *tokens*, resolvido e verificado no navegador.
- Nenhuma tela que a banca possa ver mostra texto cru, estado sem saída, serifada, data errada ou corte.
- Um padrão por coisa: um componente de estado de página, um anel de foco, uma política de reconexão, um campo de
  formulário claro, um jeito de explicar ação indisponível.

## Não-metas
- **NAV-01 (encerrar partida)**: é uma sessão paralela, com o handoff em
  `System_X_System_Project/docs/handoffs/2026-10-26-encerrar-partida.md`. Esta fase não cria saída na mesa.
- **NAV-02** (ficha sem cabeçalho e estreita no desktop): espera o designer, com o Claude Design.
- **CON-01** (conjunto de ícones): sai daqui só um briefing curto para o Claude Design.
- **APR-01** (dados de teste nas telas): é a próxima tarefa, com contas próprias para a apresentação.
- Tradução das classes (Swordsman → Espadachim etc.): vai para a lista do designer (ver TXT-02).

## Anti-metas (falhou, mesmo que funcione)
- Mudar a cara do produto: cores da palette, a logo, os fundos, o laranja dos botões principais e o desenho dos
  cards continuam.
- Cor nova na `palette` sem o designer (`src/styles/CLAUDE.md`, passo 3 do fluxo: pare e pergunte).
- Qualquer número da zona pixel-tuned (`src/components/CLAUDE.md`) mudado sem a verificação da seção “Zona
  pixel-tuned”. As únicas autorizações são o A11Y-02 e o rótulo do `ProgressBar` (MESA-03).
- Um anel de foco que pese na interface para quem usa o mouse.

## Restrições globais
- TypeScript strict com `verbatimModuleSyntax`; `styled-components`; cor só por token (o teste
  `noRawColors` cobra). Para cor nova, siga o fluxo de `src/styles/CLAUDE.md`: token semântico novo só aponta para
  cor que já existe na `palette`.
- Atomic Design e a regra *promote, don't duplicate* (`src/components/CLAUDE.md`).
- Textos e comentários em português. Erros de API pela forma única de `src/pages/CLAUDE.md`
  (`getApiErrorDetail` + mapa de mensagens + fallback em português).
- Continuam valendo as decisões do plano de 23/10 (`docs/superpowers/plans/2026-10-23-front-header-logo-errors-loading.md`):
  D1 (logo centrada na janela), D2 (nunca texto cru do back ou do axios), D3 (credencial errada dá uma mensagem
  só, sem dizer qual campo), D4 (os erros do socket da mesa seguem como estão).
- Antes de cada commit: `npm run typecheck && npm run lint && npm test` (lint sem warning). Antes do PR: `npm run build`.
- **Sessão paralela (encerrar partida):** ela trabalha em worktrees, nas portas 5001, 8082 e 5174. Esta fase usa
  as portas padrão (5000, 8081, 5173) e **não mexe nas worktrees `end-match`** nem nos processos delas.

## PRs, na ordem

Cada PR sai de `origin/main` atualizado, num branch próprio, e segue a seção “Entrega” do `CLAUDE.md` da raiz. O
primeiro PR leva também os documentos da auditoria (`docs/audits/` e esta spec).

### PR 1 — Estados de espera e erro (`fix/ux-estados`)
Itens: EST-01, EST-02, EST-03, EST-05, PROD-01, PROD-02 (parte das páginas), COR-04, TXT-05.

**Componente de estado de página** (substitui `LoadingContainer` e `ErrorContainer` de `PageStates.tsx` em todo uso
de página inteira). O desenho foi aprovado nas maquetes (`est-*` no artifact de decisões):
- **Família de fundo**, pela página que falhou. `sheet` (espaço) são as páginas que desenham o
  `CharacterSheetTemplate` (`CharacterSheetPage`, `EditCharacterSheetPage`, `CreateCharacterSheetPage` e
  `CreateNpcPage`, mesmo estando dentro de uma campanha) e a lista de fichas (`CharacterSheetsPage`). Todas as
  outras são `world` (mapa-múndi), assim como a rota `*` e qualquer caso sem família conhecida. Se a imagem do fundo não carregar, a cor de base da família aparece por baixo e o
  texto continua legível: o fundo nunca é requisito de leitura.
- **Moldura:** na família `world`, o `PageHeader` (logo e voltar). Na `sheet`, só o `BackButton` fixo, como a ficha
  é hoje (a falta de cabeçalho é o NAV-02, fora daqui).
- **Cartão central:** na família `world`, o painel marrom das barras laterais (`surfaceSidebar`, quase opaco, borda
  `borderInput`); na `sheet`, preto translúcido com borda neutra. Raio de 12 px, sombra, largura máxima de cerca de
  460 px e 16 px de margem no celular.
- **Carregando:** indicador circular girando, com o arco em `palette.green500` (token semântico novo, por exemplo
  `feedbackProgress`; ver “Decisões delegadas” 1) sobre uma trilha clara e discreta, e o rótulo específico
  (“Carregando campanha…”, com o caractere de reticência: TXT-05). **Depois de 3 s** aparece uma segunda linha,
  menor: “O servidor está acordando. Isso pode levar até um minuto.” (PROD-02). Respeita `prefers-reduced-motion`
  (sem girar, pulsando ou parado).
- **Erro:** ícone de alerta em SVG inline (sem emoji), título em vermelho claro de texto sobre escuro (token novo,
  por exemplo `feedbackDangerText` → `palette.red500`: 4,9:1 no marrom e 6,6:1 no preto; resolve o COR-04), uma
  frase do que fazer em `textMuted` e duas ações: **“Tentar de novo”** (principal, verde `brandAccent`, faz o
  `refetch`) e **“Voltar para …”** (secundária, com contorno). Com as duas lado a lado, cada uma tem a largura do
  próprio texto. **Quando empilham** (tela estreita), as duas ocupam a largura toda, com a principal em cima.
- **Não encontrado:** 404 da API vira “Campanha não encontrada” (ficha, partida…), com o título em branco e o
  link para a lista. A rota `*` (EST-02) usa o mesmo cartão: “Página não encontrada” e “Ir para o início”.
- Suspense das rotas pesadas (EST-05): o mesmo componente, família `world`, “Carregando…”.

**Fim dos carregamentos eternos (EST-03).** Mesa e editor de mapa tratam `isError` antes do guarda de
carregamento. Varra **todas** as páginas: no React Query v5, uma query desligada (`enabled: false`) fica em
`isPending` para sempre, então todo guarda com `isPending` sobre uma query que pode estar desligada (sem token,
sem id) é um carregando eterno em potencial. Cada página se protege com `if (!token) return <Navigate to="/" replace />`
antes de qualquer guarda (o relatório cita `CampaignsPage`, `CampaignPage`, `CreateCampaignPage` e
`CreateMapPage`; confirme se há outras). Teste os caminhos sem token, com id inválido, com 404 e com 500.

**Acordar os servidores cedo (PROD-01).** Ao abrir o app, em qualquer página e com ou sem sessão, o front dispara
em segundo plano um `GET /readiness` na API (que passa a tocar o banco, ver abaixo) e um `GET /health` no servidor do jogo, sem esperar resposta (`mode: "no-cors"`,
então o CORS não importa) e no máximo uma vez a cada 5 min por aba. A URL HTTP do jogo sai do `VITE_WS_URL`
(`ws`→`http`, `wss`→`https`, só a origem). Um módulo só, em `src/services/`.

**Paciência medida em tempo, não em tentativas (PROD-01).** `useLobbyWs` e `useMatchWs` passam a usar **uma
política de reconexão única**, extraída para um módulo testado: depois da primeira falha, tentar de novo com espera
crescente e teto de cerca de 5 s, por até uns 3 min contados da primeira falha. Durante esse tempo o status é de
“acordando”, e a interface diz “Acordando o servidor da mesa… pode levar até um minuto.” (na barra de status do
lobby e no rótulo de conexão da `MatchTopBar`). Esgotado o tempo: o lobby mostra “Não foi possível conectar ao
servidor da mesa.” com “Tentar de novo”, e a mesa fica em “Desconectado” com o “Reconectar” que já existe. A
mensagem “Muitas tentativas de conexão. Recarregue a página…” sai. Os casos especiais continuam exatamente como
estão: `4001` (lobby não aberto), aberta em outra aba, expulso, lobby encerrado e a sala do mestre ainda fechada
(`waiting`). Com o socket fechado, “Iniciar Partida” e “Cancelar Lobby” ficam desativados.

**PR pequeno no back (`feat/api-readiness-db`):** hoje `/liveness` e `/readiness` (`internal/app/api/health.go`) respondem fixo, sem tocar em nada. Segue-se o padrão de liveness × readiness: o `/liveness` continua dizendo só que o processo está de pé, e o `/readiness` passa a fazer um `Ping` no pool do Postgres, com prazo de 2 s: `200` se o banco respondeu, `503` se não. Assim o aquecimento acorda o Render **e** o Neon numa requisição só. Contrato novo em `System_X_System/docs/dev/api/health.md`, registrado no `documentation-map.yaml`. Se o Render tiver um health check configurado no painel, ele deve apontar para o `/liveness`, para um banco lento não derrubar a API. Os dois PRs podem entrar em qualquer ordem (com `no-cors`, a resposta não importa para o front). A validação online acontece depois que os dois estiverem no ar.

### PR 2 — Fundação: tipografia, foco, aba e tokens (`fix/ux-fundacao`)
Itens: TIP-01, TIP-02, A11Y-01, HALO-01, FAV-01, FAV-02, COR-02, COR-03, COR-06, COR-07.

- **TIP-01:** a correção do relatório. A fonte é declarada uma vez só, no `body`, os controles herdam
  (`font: inherit`), `fonts.sans` passa a ser `"Roboto", system-ui, -apple-system, "Segoe UI", Arial, sans-serif`,
  saem os `"Roboto", sans-serif` repetidos, o `"sans-serif"` entre aspas é corrigido e o contorno do
  `MatchStageTemplate` sai. **Nos quatro arquivos da zona pixel-tuned, não mexa nas declarações de fonte**: elas já
  dizem Roboto, e tirar ali não traz ganho que pague o risco.
- **TIP-02:** `fonts.display` aponta para a Roboto, a fonte do site; o dono do produto prefere variar a Roboto a
  usar outra família. O token `display` continua existindo como papel, para o designer poder mudar depois. Toda
  menção direta a `"Oswald"` passa a usar o token, **menos a do `ProgressBar`**: o rótulo dele aparece dentro dos
  cards da zona pixel-tuned, então essa troca vai para o PR 5, que reescreve o rótulo de qualquer jeito. Confira o
  peso dos títulos da Home, do SAIR e dos grupos de atributo na Roboto.
- **A11Y-01:** um anel de foco global no reset: `:focus-visible` com `outline: 2px solid var(--focus-ring)` e
  afastamento de cerca de 3 px, com `--focus-ring` valendo `actionHighlight` no `:root`. Superfícies claras (o
  cartão do login e do cadastro) redefinem a variável para o azul da marca, num token semântico novo que aponta para
  `palette.blue700`. **Para não pesar:** o anel vale para botões, links, abas, cards e controles próprios. Campos de
  texto, áreas de texto e selects mantêm o estilo de foco próprio deles (a borda que muda de cor) e não ganham o
  anel, porque o navegador marca `:focus-visible` neles também no clique do mouse. Nenhum componente fica com
  `outline: none` sem um foco visível equivalente. O afastamento de 5 px da seta e da logo continua.
- **HALO-01:** na seta de voltar, o halo dourado (já pronto, comentado no `BackButton.tsx`) só no hover. No foco
  pelo teclado, fica só o anel, sem o halo.
- **FAV-01:** o favicon passa a ser `src/assets/images/sxs-logo-mini.svg` (o dono do produto colocou o arquivo; ele
  está sem commit no checkout e entra neste PR), servido de `public/` como SVG, mais um `apple-touch-icon` PNG de
  180 px. Some a referência a `/vite.svg`.
- **FAV-02:** o nome do produto é **System X System** (sigla SXS, só onde o nome inteiro não couber). O `<title>`
  do `index.html` vira “System X System”, e cada página define o seu título por um hook pequeno:
  “Campanhas · System X System”, “O Grande Início · System X System”, “Mesa · O Grande Início · System X System”.
- **COR-02:** `statusScheduled` → `palette.blue700`, com texto branco como nos outros selos.
- **COR-03:** o botão de confirmar a exclusão usa `actionDestructive`.
- **COR-06:** o “Lv” das perícias e atributos da ficha passa ao cinza claro de texto secundário (`textMuted`: 7,4:1
  sobre `#444`). Fica em `src/features/sheet/AttributeSkillGroup.tsx`, fora da zona pixel-tuned.
- **COR-07:** desativado deixa de ser só opacidade. Um par de tokens semânticos de desativado sobre fundo escuro,
  com texto legível (mire em 3:1 ou mais, embora a WCAG não exija em desativado), usado no lobby e na barra do
  mestre.

### PR 3 — Entrada: login, cadastro e sessão (`fix/ux-entrada`)
Itens: FOR-01, FOR-02, FOR-03, FOR-04, FOR-05, COR-01, EST-04, PROD-02 (parte do login).

- **Campo (decisão do dono do produto):** borda cinza neutra em repouso (token semântico novo →
  `palette.neutral400`, 3,5:1 sobre o branco), **rótulo embutido na borda**: um rótulo fixo no canto superior
  esquerdo, sobre a borda, com fundo da cor do cartão “cortando” a linha. Ele é sempre visível (não é um placeholder
  que flutua), o que evita os bugs de rótulo flutuante com o preenchimento automático do navegador. É um `<label>`
  de verdade, ligado ao campo. Em foco: borda e rótulo no azul da marca, mais o anel azul de 3 px translúcido. Com
  erro: borda e rótulo em `feedbackDanger` e a mensagem embaixo. Texto digitado com 18 px de peso normal, altura de
  48 a 52 px, raio de 8 px.
- **Espaçamento (pedido explícito):** a distância entre um campo e outro é **a mesma** entre o último campo e o
  botão “Entrar”/“Criar conta”. Com o rótulo na borda, essa distância fica menor que a das maquetes.
- **Celular (FOR-05):** o cartão mantém 16 px de margem lateral e cantos arredondados (fim da faixa branca de ponta
  a ponta). Os campos e o botão também mantêm os cantos.
- **Validação (FOR-04):** `noValidate` nos dois formulários e validação própria em português, por campo (vazio,
  e-mail inválido, tamanho mínimo e máximo), mostrada embaixo do campo. Para credencial errada, uma mensagem só,
  embaixo dos campos (D3). Antes de escrever as regras de tamanho, **confira no back** as regras reais do cadastro
  (o e-mail com mínimo de 12 caracteres e o limite da senha) e alinhe o front a elas.
- **Rótulos e preenchimento automático (FOR-03):** `autocomplete` de `email`, `current-password`,
  `new-password` e `username` (no nick), com o `BaseInput` repassando as props. O fundo que o Chrome põe nos campos
  preenchidos automaticamente é neutralizado no CSS (`:-webkit-autofill`), para o campo continuar com a cara do
  produto; **verifique com um preenchimento automático real do Chrome**. Nos outros formulários (campanha, partida,
  ficha, NPC), desligue a sugestão do navegador onde ela não faz sentido (nome de personagem, de campanha). Em caso
  de dúvida sobre um campo, pergunte.
- **Cadastro concluído (FOR-01):** a correção do relatório, com o aviso “Conta criada. Entre com seu e-mail e
  senha.” e o e-mail já preenchido.
- **Sessão expirada (EST-04):** o interceptor de 401, que só age quando havia token, grava um aviso em
  `sessionStorage` antes do redirecionamento; o login mostra “Sua sessão expirou. Entre de novo.” e apaga o aviso.
  Bordas a cobrir com teste: vários 401 ao mesmo tempo dão um redirecionamento só; o login com credencial errada
  (sem token) não aciona nada; o aviso não aparece de novo depois de lido. **E o caso da Home:** com o token vencido,
  hoje a Home aparece normalmente porque não chama a API. Ao abrir o app, leia o `exp` do JWT (sem biblioteca) e,
  vencido, siga o mesmo caminho do 401. A nova chave de `sessionStorage` entra na lista do interceptor
  (`CLAUDE.md` do repo).
- **Espera do login (PROD-02):** depois de 3 s com o “Entrar” carregando, a mesma linha do servidor acordando
  aparece embaixo do botão.
- Avisos no cartão (sessão expirada, conta criada) usam um componente só de aviso sobre fundo claro.

### PR 4 — Mesa e editor (`fix/ux-mesa`)
Itens: MESA-01, MESA-02, MESA-04, MESA-05, MESA-06, EDI-01, EDI-02, TXT-01, TXT-03, TXT-04, CON-03 e a parte do
A11Y-02 que não é pixel-tuned (editor e faixa de barras).

- **MESA-01:** “Fila vazia” quando ninguém está na ordem e “Fila:” antes dos nomes quando há. A faixa “Barras”
  mostra só quem já tem velocidade ou saldo; se ninguém tem, o botão “Barras” não aparece.
- **MESA-02:** sem conexão pronta ou sem tabuleiro, “Mover” e “Atacar” ficam desativados e o compositor diz que é
  preciso esperar o mestre abrir a sala.
- **MESA-04:** a correção do relatório (estado vazio centralizado, painel na largura normal até haver ficha).
- **MESA-05:** cada item da camada ancorada às peças (`MapPieceOverlay`: botões de reação e balões) é deslocado
  na horizontal para caber inteiro na camada. A conta vai para uma função pura em `overlayLayout.ts`, com testes, e
  a ponta do balão continua apontando para a peça. É a solução simples que o dono do produto pediu: o jogador
  continua podendo arrastar o mapa, e o deslocamento não briga com o arraste; mover a câmera sozinha brigaria.
- **MESA-06:** o bloco “Acerto” só aparece quando a ação tem ataque.
- **EDI-01 e EDI-02:** as correções do relatório.
- **TXT-01:** “Fim da rodada” e “Fecha a cena e a rodada atuais”.
- **TXT-03:** um helper único devolve o verbo pelo ponteiro principal do aparelho (`(pointer: fine)` → “Clique”,
  senão “Toque”) e é aplicado em todas as dicas com “Toque” (faça um grep; o relatório cita algumas).
- **TXT-04:** sem descrição, o topo mostra o tipo da cena, “Roleplay” ou “Batalha”, com a mesma grafia no topo, no
  histórico e no diálogo (uma constante só). “Cena sem nome” some.
- **CON-03:** a aba “Decorações” continua visível, com um selo “Em breve” e a dica “Em breve”. É o mesmo tratamento
  do CON-02.
- **A11Y-02 (editor e mesa):** abas e rótulos do editor passam de 10–11 px para 12–13 px; a faixa de barras da
  mesa, de 11 para 12 px.

Quando este PR e o PR 1 estiverem mergeados, avise o dono do produto: a fase B da sessão de encerrar partida
depende deles.

### PR 5 — Cards e barras: zona pixel-tuned (`fix/ux-cards`)
Itens: MESA-03, COR-05 e a parte do A11Y-02 dos cards.

- **MESA-03 (decisão delegada 4):** o número da barra fica **fixo à direita**, branco com contorno escuro nítido,
  no mesmo tratamento do número da EXP (reaproveite `shadowText`, ou crie um token de contorno se o desenho pedir).
  Ele nunca muda de lugar nem de cor, e as duas camadas recortadas do `ProgressBar` saem. Isso também resolve o
  COR-05. O tamanho continua em `cqi`, como hoje, e a fonte passa da `"Oswald"` direta para o token
  `fonts.display` (a parte do TIP-02 que ficou para cá).
- **A11Y-02 (cards):** os números de 9 a 10 px dos cards ganham um piso legível, só nas larguras em que hoje ficam
  abaixo dele, sem mudar as proporções do card.
- Este PR só abre depois da verificação da seção “Zona pixel-tuned”.

### PR 6 — Datas, layout e toque (`fix/ux-layout`)
Itens: DAT-01, RES-01, RES-02, A11Y-03, CON-06.

- **DAT-01:** a correção do relatório, com testes rodando num fuso brasileiro (`TZ=America/Sao_Paulo`) e perto da
  meia-noite UTC.
- **RES-01 (o dono do produto concordou):** a escolha entre data à direita e empilhado vem da largura da **coluna
  central** (container query), não da janela. O título usa `clamp()` e nunca parte palavra no meio (quebra normal,
  `hyphens: auto` com o `lang` da página). Mude só as telas que hoje quebram; no notebook, o arranjo atual fica. O
  selo de status (ex.: AGENDADA) fica alinhado nos dois arranjos. Matriz de teste: 320, 360, 390, 412, 600, 768,
  820, 1024, 1180, 1280, 1440 e 1920 px, com e sem as abas laterais abertas, nas páginas de campanha, partida e
  lobby, com títulos curtos e longos.
- **RES-02:** reservar a largura das abas laterais no respiro da coluna central e subir as abas **só o suficiente**
  para nunca encostarem nos botões verdes da coluna central, inclusive em campanhas e partidas sem descrição (o caso
  que o dono do produto descreveu). A área de toque passa a 44 px, mesmo que invisível. Se alguma tela pedir uma
  escolha que mude o layout, pergunte.
- **A11Y-03:** áreas de toque de 44 px sem mudar o desenho (padding ou pseudo-elemento). Onde ficar estranho,
  busque um meio-termo ou pergunte.
- **CON-06 (decisão do dono do produto):** os botões flutuantes continuam, com uma sombra mais funda e um contorno
  claro sutil (token de sombra novo, a partir da palette), e um respiro no fim da lista do tamanho da barra de
  botões mais uns 24 px, para o último card nunca ficar escondido.

### PR 7 — Conteúdo e textos (`fix/ux-textos`)
Itens: CON-02, CON-04, CON-05, CON-07, CON-08, FOR-06, TXT-02.

- **CON-02:** a correção do relatório. A nota “Mais opções de configuração serão adicionadas em breve.” e os cards
  são os mesmos em todas as telas (hoje o lobby tem dois e as outras quatro).
- **CON-04 (decisão delegada 6):** os dois botões com ícone do designer, ou os dois sem. O par sai com ícone se o X de recusar do designer (pedido em 26/10, no vermelho de texto destrutivo `red600`, não no vermelho do brand) chegar até este PR; senão, os dois saem só com a palavra, e os ícones entram juntos depois. A regra abaixo vale para quando houver ícone: os dois com
  `aria-label` com o nick e 44 px, e só enquanto a inscrição está pendente. Depois, fica só o status. O check é o
  `src/assets/icons/Ativo 10.svg`, renomeado para `checkcomponta.svg` (no par do `setavoltarcomponta.svg`, a seta
  em uso; o arquivo não é usado em lugar nenhum), nas cores originais e com o ícone escondido do leitor de tela.
  Como o ícone é verde, o botão Aceitar não pode ter fundo verde (o check some): use um botão com contorno sobre o
  painel escuro. O Recusar usa o estilo destrutivo de texto (`actionDestructiveText`) e não leva o `x.svg`, que é o
  X verde da marca (ver decisão delegada 6). Se o designer entregar um ícone de recusar no mesmo traço e fora do
  verde, ele entra no Recusar.
- **CON-05:** a correção do relatório (o ícone vira parâmetro).
- **Ação indisponível (CON-07 e CON-08, decisão delegada 5):** um padrão só. O botão fica com `aria-disabled` (não
  `disabled`, que não recebe toque nem foco), com o ícone `src/assets/icons/questionmark.svg` (do designer, nas
  cores dele) na **mesma linha, à direita** do rótulo. Tocar, passar o mouse ou focar no botão mostra a explicação no
  `Tooltip` que já existe (ele já trata `aria-disabled`). Textos: campanha, “Campanha com partida iniciada não pode
  ser excluída: o histórico é do grupo.”; ficha, “Ficha em campanha não pode ser excluída: o histórico é do grupo.”
  (na ficha, o Excluir passa a aparecer desativado, em vez de sumir); lobby, “O jogador precisa estar conectado.” Os
  botões ficam com 44 px, e os espaçamentos do menu Gerenciar ficam alinhados (hoje o motivo fica torto). Confira no
  back as regras reais de exclusão antes de escrever os textos.
- **FOR-06:** “(opcional)” em cinza discreto só nos campos opcionais dos formulários de campanha e partida (o grupo
  menor, para não poluir), e mensagens próprias no lugar do balão do navegador.
- **TXT-02 (decisão delegada 7):** aplicar a tabela abaixo e listar no PR tudo o que mudou, para o dono do produto
  revisar com o designer.

## Zona pixel-tuned (PR 5, e no PR 2 só como verificação)
A zona (`CharacterSheetHeader.tsx`, `MentalsDiagram.tsx`, `PhysicalsDiagram.tsx`, `NenPrinciplesDiagram.tsx`) foi
equilibrada à mão para todas as larguras. O dono do produto autorizou mexer no tamanho dos números dos cards e no
rótulo do `ProgressBar`, **desde que nada quebre em nenhum celular, tablet ou computador** (“99% de certeza ou
mais”). Portão de verificação, antes de abrir o PR:
- prints de antes e depois de cada card (barra lateral da campanha, partida, lobby, mesa e cabeçalho da ficha) em
  320, 360, 390, 412, 600, 768, 820, 1024, 1180, 1280, 1440 e 1920 px, e com zoom de 80, 90, 110, 125 e 150%;
- um script que mede as caixas dos textos do card e acusa qualquer sobreposição ou texto saindo do card;
- se algo encostar ou ficar estranho, quem implementa para e reporta à sessão principal, com os prints. Ela mostra
  ao dono do produto antes de seguir. O PR 5 não abre com sobreposição pendente.

O PR 2 (troca de fonte) usa a mesma matriz só para confirmar que a zona não mudou.

## Decisões delegadas (minhas, com o porquê, para o dono do produto conferir)
1. **Cor do carregando: verde saturado (`green500`), não dourado nem o verde da marca.** O verde da marca
   (`green700`) quase some no marrom (2,5:1); o saturado tem 6,5:1 no marrom e 8,8:1 no preto e conversa com o
   botão verde do cartão. O dourado, no produto, marca destaque e foco, não andamento.
2. **Botões empilhados com largura igual.** Lado a lado, cada um tem a largura do próprio texto; empilhados,
   larguras diferentes parecem desalinhadas, então os dois ocupam a largura toda, com a ação principal em cima.
3. **Rótulo do campo fixo na borda, não flutuante.** Cumpre o pedido (menos espaço entre campos) e evita o bug
   clássico do rótulo flutuante com o preenchimento automático, preocupação do próprio dono do produto no FOR-03.
4. **Número da barra fixo, branco com contorno (a opção D).** O contorno deixa o número legível sobre qualquer cor,
   preenchida ou não. Com isso, a opção A perde a razão de andar: o que ela evitava era o número partido em duas
   cores. Fixo, o número fica no mesmo lugar em todos os cards, o que facilita comparar, e não se mexe enquanto a
   barra anima o dano. Fica igual ao número da EXP do mesmo card. Era também como o HP aparecia antes.
5. **Ação indisponível: desativado + “?” na mesma linha + explicação ao tocar.** O texto fixo embaixo pesava num
   menu pequeno, e o “?” sozinho escondia demais. A combinação mostra que há um motivo, explica na hora em que a
   pessoa tenta e usa o ícone do designer, que tem contraste suficiente nos painéis escuros. O mesmo padrão vale no
   Expulsar, por consistência.
6. **Aceitar com o check do designer; Recusar sem o X verde.** Ícone com palavra é a forma mais rápida de ler, e
   o dono do produto indicou os ícones do designer. O check com ponta combina com a seta de voltar em uso, que também
   tem ponta. O `x.svg` é o X verde da logo, e usá-lo para recusar misturaria a marca com uma ação negativa. É a
   mesma lógica da regra dos tokens que tira o vermelho do brand dos elementos clicáveis. O verde também diz “sim”,
   ao contrário da palavra. Enquanto o designer não fizer um ícone de recusar fora do verde, o Recusar fica só com a
   palavra, no vermelho de ação destrutiva.
7. **Inglês e português (TXT-01 e TXT-02).** Regra: termos de regra do jogo e jargão consagrado de RPG ficam em
   inglês; a interface fica em português. A tabela:

| Hoje | Fica | Por quê |
|---|---|---|
| Atributos e siglas, perícias, proficiências, princípios Nen, alinhamentos | Em inglês | Termos de regra; as siglas já são em inglês. |
| Classes (Netrunner, Swordsman, WeaponsMaster…) | Em inglês, com a grafia corrigida (“Weapons Master”) | Traduzir só algumas (Espadachim ao lado de Netrunner) misturaria ainda mais. A tradução vai para a lista do designer, com uma proposta pronta. |
| “PHYSICAL · MENTAL · SPIRITUAL” (diagramas) e “Físicas · Espirituais” (grupos de perícias) | “Physical · Mental · Spiritual” nos grupos também | A mesma categoria com dois nomes na mesma tela. Os diagramas estão na zona pixel-tuned. |
| “Nickname” e “Background” | Ficam | Jargão de RPG que os jogadores conhecem, como Lv, NPC e Lobby. Vão para a lista do designer. |
| “ONLINE” ao lado de “AGUARDANDO” | “CONECTADO” e “AGUARDANDO” | O par mistura línguas, e a mesa já diz “Conectado”. |
| “Upload arquivo” | “Enviar arquivo” | Metade em cada língua; a outra aba já é “Colar link”. |
| “Loading...” · “round” · “roleplay” | “Carregando…” · “rodada” · “Roleplay” | EST-05, TXT-01, TXT-04. |
| Dash/Shift, Push/Grab, Lv, NPC, Lobby | Ficam | Termos de regra e jargão consagrado. |

## Verificação de cada PR
- Navegador, ponta a ponta (headless com perfil próprio e token de conta de teste injetado; mestre em `localhost`,
  jogador em `127.0.0.1`; mesa com `go run ./cmd/devseed`), em 1280 e 390 px, e em 768 px onde o layout mudar.
- Estados forçados pelo headless: API respondendo 500 e 404, requisição pendurada, socket do jogo caindo (embrulhe o
  construtor `WebSocket` para apontar a uma porta fechada; `Network.setBlockedURLs` não bloqueia WebSocket).
- O PR diz o que foi verificado e o que não foi. No fim do PR 1, a validação online acontece com o dono do
  produto, que faz o login no sistema online e deixa o servidor do jogo dormir para testar de verdade.
- Ao fim de cada PR, mate os servidores que subiu (`kill $(lsof -ti:5173)`).

## Deixado para quem implementa
- Nomes exatos dos tokens novos (dentro dos grupos fechados e com comentário do papel) e dos componentes, e em que
  camada do Atomic Design cada um mora.
- Valores finos de espaçamento, raio e sombra, desde que batam com as maquetes aprovadas.
- Como dividir cada PR em commits.

## Lembretes para o fim da fase 2
- NAV-02, com o designer e o Claude Design. Esse é o lembrete mais importante.
- Avaliar se o padrão de mensagens de erro desta fase basta, ou se vale padronizar no Claude Design.
- Briefing curto do CON-01 (conjunto de ícones) para o Claude Design.
- Lista de textos que mudaram (TXT-02), mais a proposta de tradução das classes, para o dono do produto ver com o
  designer.
- Sinal para a sessão de encerrar partida começar o front (depois dos PRs 1 e 4).
