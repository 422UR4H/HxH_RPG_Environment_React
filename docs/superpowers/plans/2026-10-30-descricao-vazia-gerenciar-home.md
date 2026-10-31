# Descrição vazia, "Gerenciar" no padrão do seletor e fundo azul na home — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** três pedidos do dono do produto (30/10):
1. Salvar uma descrição vazia não limpa o texto anterior — o servidor mantém o valor antigo.
2. O botão "Gerenciar" (ficha, partida e campanha) deve usar o mesmo componente de seletor da ficha (`PillSelect`).
3. A home (`/home`) ganha o mesmo fundo azul do signin/signup.

**Tech Stack:** React 19, TS strict, styled-components 6, Vitest + MSW (front); Go + huma (back, só docs/teste).

**Spec:** este documento. Diagnóstico e decisões do controlador abaixo.

## Diagnóstico (já feito pelo controlador)

- **Tópico 1 — causa raiz no front.** `src/pages/EditMatchPage.tsx` (≈ linha 142) e `src/pages/EditCampaignPage.tsx` (≈ linha 144) montam o payload com `description: form.description || undefined`. Texto vazio vira `undefined`, o axios omite a chave do JSON e o backend — corretamente, pelo contrato "todos os campos opcionais" — entende "não mexer". O mesmo defeito existe em `callLink: form.callLink || undefined` (EditCampaignPage ≈ linha 146): apagar o link da chamada também não funciona.
  - O backend já trata `""` certo nas três rotas: `PATCH /campaigns/{uuid}` e `PATCH /matches/{uuid}` gravam o valor de `*string` não-nulo direto (`""` incluso); `PATCH /charactersheets/{uuid}/profile` usa `COALESCE($n, coluna)`, e `""` não é NULL, então grava `""`. A ficha (perfil e edição completa) já envia `""` (`briefDescription ?? null`, `description ?? ""`). **Não mexer na ficha nem no backend Go.**
  - `storyCurrentAt: form.storyCurrentAt ? … : undefined` fica como está: a data corrente não pode regredir nem ser apagada (regra do backend), então omitir quando vazio é o certo.
  - Os contratos (`System_X_System/docs/dev/api/update-campaign.md`, seção `PATCH /matches/{uuid}` de `match.md`) não dizem explicitamente "ausente = mantém; `""` = limpa" — por isso o front errou. E `match.md` diz `briefInitialDescription ≤ 64 chars`, mas o código aceita 255 (`internal/application/match/update_match.go`: `> 255` → `ErrMaxBriefDescLength`).
- **Tópico 2.** Os três "Gerenciar" são o mesmo componente: `src/components/molecules/ManageButton.tsx`, usado por `src/components/molecules/BottomActions.tsx` (campanha e partida) e `src/features/sheet/SheetBottomActions.tsx` (ficha). Mudar o `ManageButton` cobre os três.
- **Tópico 3.** `src/pages/HomePage.tsx`: `PageContainer` usa `background-color: ${colors.surfaceBar}`. O signin/signup usa `background: ${gradients.signBg}` (`src/components/templates/SignPagesTemplate.tsx`, token em `src/styles/tokens.ts`).

## Decisões

- **D1 (dono do produto):** o "Gerenciar" passa a abrir como o seletor da ficha — a lista "gruda" no botão (continua a pílula: mesma largura, bordas laterais contínuas, lado do botão reto enquanto aberto), desenrola/enrola com a mesma animação, borda branca enquanto aberto, abre para cima ou para baixo conforme o espaço. **A cor continua a escura de hoje** (`colors.surfacePanel`, borda `colors.borderMuted` fechado), não o verde da ficha. Ícones de Editar/Excluir e o "Excluir indisponível" com motivo (`BlockableButton` + Tooltip) continuam.
- **D2 (controlador):** "Gerenciar" é um menu de ações, não a escolha de um valor. Usar o `PillSelect` cru como está (combobox/listbox, ✓ no selecionado, `onChange` de valor) mentiria para o leitor de tela e perderia ícone e motivo de bloqueio. O "mesmo componente" é entregue assim: **a mecânica da lista presa à pílula sai do `PillSelect` para uma peça compartilhada** (hook e/ou componente de lista em portal — posicionamento por `computeAttachedListPlacement` + anchor positioning, cópia do visual da pílula em variáveis CSS, estados open/closing/settling, animação unroll/roll, fechar ao sair da janela, clique fora) e o `PillSelect` e um novo menu (`PillMenu`, padrão WAI-ARIA *menu button*: `aria-haspopup="menu"`, `role="menu"`/`menuitem`) passam a usá-la. Uma mecânica só, dois papéis de acessibilidade. Nada duplicado.
- **D3 (controlador):** no tópico 1, a correção é enviar o valor do formulário como está (`description: form.description`, `callLink: form.callLink`). Os campos são `string` no estado do formulário (inicializados com `""` e preenchidos do servidor); confirme que nunca são `null`/`undefined` ao montar o payload — se puderem ser, normalize com `?? ""` na carga do formulário, não no payload.

## Global Constraints

- Código em inglês (identificadores, nomes de arquivo, títulos de teste); UI, comentários e mensagens de guardião em português.
- Cor só por token (`src/styles/CLAUDE.md`); nenhum token novo sem necessidade; nenhuma cor nova na palette.
- Não mexer na zona pixel-tuned: `CharacterSheetHeader.tsx` (o `CharacterClassSelect` que estiliza o `PillSelect` ali precisa continuar idêntico em aparência e comportamento), `MentalsDiagram.tsx`, `PhysicalsDiagram.tsx`, `NenPrinciplesDiagram.tsx`.
- **Sem regressão:** todo uso atual do `PillSelect` (`CharacterSheetHeader`, `ProfileInputs`/`ProficienciesList` via `ProfilePillSelect`, `MasterControls`, "Adicionar à partida") se comporta igual — teclado, typeahead, clique fora, Esc sem fechar o modal pai, lado mantido ao rolar, fechar quando não cabe, animação. Os testes existentes do `PillSelect` continuam passando **sem alterar o que afirmam**.
- Botões flutuantes (posição, flutuar, encaixar; `--manage-floating-height`, `--floating-label-size`) intactos; o "Gerenciar" fechado tem a mesma aparência e tamanho de hoje nos dois modos (flutuante e encaixado).
- Front, antes de cada commit: `npm run typecheck && npm run lint && npm test` (sem warning, sem `eslint-disable` novo). Back: `go vet ./... && go test ./...` (os testes de integração dependem de `TEST_DATABASE_URL`; se não houver, diga no relatório).
- Git: confira `git branch --show-current` — front = `fix/descricao-vazia-gerenciar-home`, back = `docs/patch-empty-string-semantics`; só `git add` dos arquivos e `git commit`; nada de stash/checkout/reset/rebase/push. Mensagem em português com prefixo convencional (`fix(ui): …`) terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Não suba servidores.

## Review Focus

1. Editar campanha e partida: apagar a descrição (e o link da chamada) e salvar → o PATCH leva `"description": ""` (`"callLink": ""`), e os outros campos continuam como antes.
2. "Gerenciar" aberto na ficha, na campanha e na partida, flutuante e encaixado: lista presa ao botão, abre para o lado com espaço, Editar e Excluir funcionam, Excluir bloqueado mostra o motivo sem disparar a exclusão.
3. Seletor de classe da ficha e os demais `PillSelect`: idênticos ao de antes.

---

### Task 1: descrição e link da chamada vazios limpam o valor (front)

**Files:** `src/pages/EditMatchPage.tsx`, `src/pages/EditCampaignPage.tsx`, testes em `src/pages/__tests__/` (`EditCampaignPage.test.tsx` existe; crie `EditMatchPage.test.tsx` se não existir, seguindo o padrão MSW dos vizinhos).

- [ ] Teste que falha primeiro: na edição de campanha, com a descrição e o link carregados do servidor, apagar os dois e salvar → o corpo do PATCH tem `description: ""` e `callLink: ""`. Na edição de partida, apagar a descrição e salvar → `description: ""`.
- [ ] Teste de não-regressão: salvar sem mexer envia a descrição e o link atuais (não vazios).
- [ ] Corrigir conforme D3. Não mexer em `storyCurrentAt`.
- [ ] typecheck + lint + test; commit `fix(campaign,match): descrição e link vazios limpam o valor salvo`.

### Task 2: "Gerenciar" no padrão do seletor da ficha (front)

**Files:** `src/components/molecules/PillSelect.tsx`, `PillSelect.styles.ts`, nova peça compartilhada (ex.: `src/components/molecules/AttachedList.tsx` e/ou `src/hooks/useAttachedList.ts` — o nome é seu), novo `src/components/molecules/PillMenu.tsx` (+ estilos), `src/components/molecules/ManageButton.tsx`, testes em `src/components/molecules/__tests__/`. Leia `src/components/CLAUDE.md` antes (camadas Atomic, promote-don't-duplicate).

- [ ] Extrair do `PillSelect` a mecânica da lista presa à pílula (D2) sem mudar o comportamento dele; os testes atuais do `PillSelect` passam sem edição de asserções.
- [ ] `PillMenu`: botão-pílula + lista de ações na mesma mecânica. Itens recebem conteúdo livre (ícone + rótulo) e podem estar bloqueados com motivo (`BlockableButton`/Tooltip, mesmo comportamento de hoje: clique no bloqueado mostra o motivo e não age — e não deve fechar o menu antes de mostrar o motivo). Teclado de menu button: Enter/Espaço/↓ abre e foca o 1º item, ↑ o último, setas navegam, Esc fecha e devolve o foco ao botão, Tab fecha. Clique fora fecha.
- [ ] `ManageButton` usa o `PillMenu`, mantendo: rótulo "⚙ Gerenciar ▾/▴" (ou a seta como chevron da pílula, desde que o tamanho fechado não mude), cores escuras de hoje (D1), borda branca (`colors.textPrimary`) enquanto aberto, os dois modos (flutuante/encaixado) com os mesmos tamanhos, `ConfirmDialog` de exclusão igual.
- [ ] Testes: menu abre/fecha, Editar chama `onEdit`, Excluir abre a confirmação, Excluir bloqueado não age; os testes de página que clicam em "Gerenciar" (`CampaignPage`, `MatchPage`, `CharacterSheetPage`) continuam passando (ajuste só seletor de papel ARIA se o papel mudou, nunca o que é afirmado).
- [ ] typecheck + lint + test; commits pequenos (extração; PillMenu; ManageButton).

### Task 3: fundo azul na home (front)

**Files:** `src/pages/HomePage.tsx` (e `src/styles/tokens.ts` só se o nome do token precisar refletir o novo uso — ver `src/styles/CLAUDE.md`).

- [ ] `PageContainer` usa o mesmo degradê do signin (`gradients.signBg`) cobrindo a altura toda da janela (o signin usa `min-height: 100vh; min-height: 100dvh`); o cabeçalho escuro e os cards ficam como estão.
- [ ] Se `HomePage.test.tsx` precisar, só ajuste; commit `feat(ui): fundo azul do signin na home`.

### Task 4: contrato explícito para campo vazio (back, repo `System_X_System`)

**Files:** `System_X_System/docs/dev/api/update-campaign.md`, `System_X_System/docs/dev/api/match.md` (seção `PATCH /matches/{uuid}`), testes de use case em `internal/application/campaign/` e `internal/application/match/` se faltar cobertura.

- [ ] Nos dois contratos: "campo ausente = mantém o valor atual; string vazia (`""`) = grava vazio (limpa)" para `briefInitialDescription`, `description` e (campanha) `callLink`; `match.md`: `briefInitialDescription` ≤ 255 (não 64).
- [ ] Conferir se há teste de use case provando que `Description = ""` (ponteiro para string vazia) chega ao repositório como `""` em campanha e partida; se não houver, adicionar (mock do repo já existe em `internal/application/testutil/`).
- [ ] `go vet ./... && go test ./...`; commit `docs(api): campo vazio limpa no PATCH de campanha e partida`.

### Task 5: nuvens subindo na home, no login e no cadastro (front) — pedido adicional do dono do produto

**Pedido (30/10):** "adicione a cloud.svg e cloud2.svg na homepage, simulando as nuvens da abertura do anime de Hunter x Hunter. Se possível, uma animação com elas subindo num ângulo um pouco inclinado. Já adicione nas páginas de login e cadastro também, com a mesma animação. Deve ficar legal em computador, tablet (vertical e horizontal) e celular. A velocidade pode ser similar à da abertura; podemos ajustar esse parâmetro depois."

**Files:** novo `src/components/atoms/RisingClouds.tsx` (+ teste em `src/components/atoms/__tests__/`), `src/components/templates/SignPagesTemplate.tsx`, `src/pages/HomePage.tsx`, novos `src/assets/images/cloud.webp` e `cloud2.webp`.

**Assets (decisão do controlador):** `cloud.svg` (1522×782) e `cloud2.svg` (730×529) são PNGs embutidos em base64 num `<image>` — 600 KB e 230 KB. Gere WebP com o mesmo tamanho e alfa:
`grep -o 'base64,[^"]*' cloud.svg | sed 's/base64,//' | base64 -d > /tmp/x.png && magick /tmp/x.png -quality 82 -define webp:alpha-quality=90 cloud.webp` (idem cloud2). Resultado esperado ≈ 74 KB e 36 KB. **Não apague nem commite os `.svg`** (são do dono; ficam fora do commit, o relatório diz por quê).

**Desenho (decisões do controlador, UI/UX):**
- Uma camada decorativa só, reaproveitada nas três telas: `position: fixed; inset: 0; overflow: hidden; pointer-events: none; aria-hidden`, entre o fundo azul e o conteúdo (o conteúdo fica acima com `position: relative; z-index`). Na home, o cabeçalho escuro e os cards ficam acima das nuvens; no login/cadastro, o cartão branco fica acima.
- **Profundidade (paralaxe):** 3 planos — longe (menores, mais lentas, `opacity` ~0.5), meio (~0.75), perto (maiores, mais rápidas, ~0.95). ~7 nuvens no total, alternando `cloud`/`cloud2` e espelhando algumas (`scaleX(-1)`) para variar. Configuração **fixa** (array de dados: imagem, coluna `left` em %, tamanho, plano, atraso, espelho) — nada aleatório no render.
- **Tamanho responsivo em `vmax`**: assim a mesma nuvem ocupa ~80% da largura no celular em pé e ~40% num monitor largo, sem media query por aparelho. Teto/piso com `clamp()` se precisar. Conferir celular em pé (390×844), tablet em pé (820×1180) e deitado (1180×820), notebook (1366×768) e monitor (1920×1080).
- **Movimento:** só `transform` (`translate3d`), nada de animar `top`/`opacity`/`filter`; `will-change: transform`. Cada nuvem entra por baixo da tela e sai por cima, com deriva horizontal constante (trajetória inclinada ~12° da vertical); loop infinito; atrasos **negativos** escalonados para a tela já abrir com nuvens espalhadas (nunca um céu vazio no primeiro quadro). Use unidades de viewport no percurso para o ângulo ser o mesmo em qualquer tela.
- **Parâmetros ajustáveis num lugar só**, no topo do arquivo, com comentário em português: duração-base de uma travessia (perto ≈ 7 s; meio e longe como múltiplos), ângulo da trajetória, sentido da deriva. O dono do produto vai ajustar a velocidade depois.
- **Acessibilidade:** com `prefers-reduced-motion: reduce`, as nuvens ficam paradas nas posições espalhadas (sem animação). Decorativas: `alt=""`, `aria-hidden`, fora da ordem de foco, sem capturar clique/toque.
- Sem rolagem extra: a camada não pode criar barra de rolagem horizontal nem vertical em nenhuma tela; o cadastro, que já rola em telas baixas, continua rolando normalmente com as nuvens fixas atrás.
- Teste: renderiza decorativo (`aria-hidden`, imagens `alt=""`), quantidade de nuvens, e não intercepta clique (pointer-events) — o visual é verificado no navegador pelo controlador.
- [ ] typecheck + lint + test; commit `feat(ui): nuvens subindo na home, no login e no cadastro`.

### Task 6: nuvens como câmera subindo por um céu parado (retorno do dono do produto)

**Retorno do dono (30/10), sobre a Task 5:** "As nuvens precisam subir na mesma velocidade. A cloud.svg que está passando no fundo, à direita, ficou muito legal: ela é referência por conta do seu aspecto de profundidade. O efeito que deve parecer é que as nuvens estão paradas e a câmera está subindo filmando o céu. Mas não mexa no degradê do fundo. As nuvens subindo de forma estática vão proporcionar melhor esse efeito. Evite uma nuvem na frente da outra. Pode usar isso mais nos cantos da tela. Não precisa ter uma densidade de nuvens tão grande; pode reduzir um pouco."

**Files:** `src/components/atoms/RisingClouds.tsx` e o teste dele. Nada fora disso (o fundo azul, `SignPagesTemplate` e `HomePage` ficam como estão).

**A referência** é a nuvem `{ image: "cloud", left: 60, plane: "far", phase: 0.75, mirror: true }` da Task 5: `cloud.webp` espelhada, 22 vmax de largura, opacidade 0.5, uma travessia a cada 7 × 2.4 = 16.8 s.

**Decisões do controlador:**
- **Sem paralaxe.** Todas as nuvens com a **mesma velocidade em px/s** e a mesma trajetória inclinada (12°, mesmo sentido): o conjunto se move como um bloco rígido, sem posições relativas mudando. Isso garante que duas nuvens que não se sobrepõem num quadro nunca se sobreponham.
  - Cuidado: velocidade igual **não** é duração igual quando o percurso depende da altura da nuvem (`100vh + altura`). Todas devem usar o **mesmo percurso** (`100vh + altura da maior nuvem`), partindo de `top: 100%`, com a mesma duração.
  - A velocidade é a da referência: a duração que dá à nuvem de referência o percurso de hoje em 16.8 s. Na prática, uma constante de segundos por travessia, por volta de 17 s, ajustável no topo do arquivo.
- **Visual de profundidade da referência para todas:** opacidade ~0.5 e largura em torno de 22 vmax. Uma variação pequena de tamanho (±15%) é permitida para não parecerem carimbos, e a opacidade fica igual. Use `cloud` na maioria e `cloud2` no máximo em uma, espelhando algumas.
- **Menos nuvens, nos cantos:** de 4 a 5, em duas colunas, uma sangrando pela borda esquerda e outra pela direita. O meio fica livre: é onde estão o cartão de login e os cards da home.
  - Fases intercaladas, para as colunas não ficarem alinhadas na mesma altura (ex.: esquerda 0 e 0.5, direita 0.25 e 0.75).
  - Compense a deriva horizontal na coluna de partida, para que a nuvem esteja junto à borda no meio da travessia, e não só no começo.
- **Nenhuma sobreposição em momento nenhum, inclusive na volta do loop.** Numa coluna, a distância vertical entre nuvens consecutivas (fase × percurso) tem de ser maior que a altura da nuvem mais alta, e a última precisa de folga até a primeira, que volta por baixo. Entre colunas, o vão horizontal tem de ficar positivo no celular em pé (390 px), onde 22 vmax ≈ 186 px.
  - Escreva o raciocínio num comentário curto.
  - Um teste prende a regra: a configuração exportada, ou uma função pura que calcula as caixas, não tem pares sobrepostos na faixa de tela para as proporções 390×844, 820×1180, 1180×820, 1366×768 e 1920×1080.
- Continua igual: só `transform`, `will-change`, atraso negativo para abrir com o céu já povoado, reduced-motion pausado, `aria-hidden`, `pointer-events: none`, sem rolagem extra.
- Remova o que ficar sem uso (`LAYER_*`, planos), deixando os parâmetros ajustáveis no topo com comentário em português: segundos por travessia, ângulo, sentido, largura base, opacidade.
- [ ] typecheck + lint + test; commit `fix(ui): nuvens sobem juntas, como câmera subindo pelo céu`.

### Task 7: "Gerenciar" aberto sem o raio exagerado (retorno do dono do produto)

**Retorno do dono (30/10):** "O botão Gerenciar não está nada legal. O border radius está muito grande, tá realmente estranho! Melhore aquele trabalho lá, porque ficou feio."

**Causa (medida pelo controlador):** no modo flutuante, o botão fechado é uma pílula com `border-radius: 50px` (altura 58 px). A lista aberta copia esse raio (`--pill-radius`), então a forma aberta (lista de ~98 px + botão) fica com cantos de 50 px. Na lista, os cantos de cima comem a área dos itens; no botão, os de baixo viram meio-círculo, e o conjunto vira uma bolha. No seletor da ficha isso não acontece porque a lista é alta e o raio é menor (`min(5cqi, 28px)`). No modo encaixado (raio 8 px) já fica bom.

**Files:** `src/components/molecules/ManageButton.tsx`, `src/components/molecules/PillMenu.tsx` (+ estilos), `src/components/molecules/AttachedList*.ts(x)`/`useAttachedList.ts` só se precisar de uma opção nova (padrão = comportamento atual do `PillSelect`), testes.

**Decisões do controlador:**
- **Fechado: nada muda.** A pílula flutuante com 50 px e o encaixado com 8 px continuam iguais.
- **Aberto (e abrindo/fechando):** a forma inteira (lista + botão) usa um raio de canto externo `R = min(raio fechado, 16px)`.
  - Os cantos externos do botão (o lado oposto à lista) animam de 50 → 16 px junto com a abertura, na mesma duração/curva da lista (160 ms), e voltam a 50 ao fechar, como o "settling" do seletor já faz.
  - O lado colado à lista continua reto.
  - Os cantos externos da lista e o canto saliente (lista mais larga que o botão no celular) usam o mesmo R.
  - Com reduced-motion, a troca é sem animação.
- **Acabamento da lista:**
  - Os ícones dos itens alinhados com o ⚙ do botão: mesmo recuo à esquerda.
  - Itens com altura mínima de 44 px, respiro vertical igual em cima e embaixo.
  - A linha que separa a lista do botão continua.
  - Hover/foco visível só por token.
  - Nada de cor nova.
- `PillSelect` intocado. O seletor da ficha continua idêntico, com seu raio próprio e sua lista. Qualquer opção nova na peça compartilhada tem o padrão de hoje.
- Testes: o raio aberto é calculado como `min(fechado, 16px)`, e o `PillSelect` não recebe essa regra.
- [ ] typecheck + lint + test; commit `fix(ui): Gerenciar aberto com cantos de 16 px`.

### Task 8: seis nuvens diferentes, cada uma no seu tamanho (retorno do dono do produto)

**Retorno do dono (30/10):** "Pode usar o webp sim. Adicionei mais nuvens para você não precisar repeti-las em loop; pode ajustar para utilizar estas outras também. Leve em consideração o tamanho das nuvens em si, para que elas tenham mais ou menos a mesma densidade. Tem umas muito esparsas, que podem ficar estranhas se você expandi-las, tornando-as mais esparsas ainda, e outras mais sólidas. Leve isso em consideração pra ficar uma obra de arte."

**Assets (já prontos pelo controlador, em `src/assets/images/`):** `cloud.webp` e `cloud2.webp` (os de antes), mais `cloud3.webp` (274×195), `cloud4.webp` (518×186), `cloud5.webp` (1200×584, reduzido da nova nuvem de 2242×1092) e `cloud6.webp` (705×492). Os `.svg` originais estão em `src/assets/icons/` e ficam fora do git, por decisão do dono.

**Medição do controlador (canal alfa de cada original):**

| nuvem | corpo (px) | borda esfumaçada (px) | borda / largura | núcleo sólido |
|---|---|---|---|---|
| cloud (antiga, a referência) | 1467×729 | 16.7 | 1.1% | 90% |
| cloud2 | 675×474 | 14.9 | 2.2% | 85% |
| cloud5 (nova grande) | 2193×1043 | 20.7 | 0.9% | 89% |
| cloud3 | 200×138 | 14.2 | 7.1% | 57% |
| cloud4 | 455×126 | 12.7 | 2.8% | 60% |
| cloud6 | 656×443 | 20.0 | 3.1% | 78% |

**Regra de tamanho (densidade parecida):**
- A borda esfumaçada na tela (`borda/largura × largura renderizada`) não passa de **0.5 vmax**, o dobro da referência: cloud a 22 vmax dá 0.25 vmax. Isso dá um teto por nuvem, em vmax de largura do corpo: cloud3 ≈ 7, cloud4 ≈ 18, cloud6 ≈ 16, cloud2 ≈ 22, cloud ≈ 22 (mantém) e cloud5 ≈ 26, este por composição, não por nitidez.
- As esfumaçadas ficam pequenas, como nuvens mais distantes; as sólidas, maiores.
- Opacidade base 0.5. As de núcleo fraco (cloud3, cloud4) podem subir até ~0.6 para a densidade aparente se igualar. O controlador confere no navegador.
- Use a largura do **corpo** ao converter. O PNG tem ~15–35 px de margem transparente; o tamanho do `<img>` é o do arquivo inteiro.

**Composição:**
- Cada uma das 6 nuvens aparece **uma vez** no ciclo (nada de repetir a mesma imagem). Espelhar uma ou outra pode, para variar o sentido da luz.
- Continua tudo da Task 6: bloco rígido com a mesma velocidade da referência (a mesma de hoje em px/s relativos à altura da tela), 12°, duas colunas nas bordas, centro livre, **nenhuma sobreposição em momento nenhum**, inclusive na volta do loop.
- Para caberem 6 sem aumentar a densidade, o período do padrão pode passar de uma tela (ex.: ~1,6 tela), mantendo de 3 a 4 nuvens visíveis a qualquer momento, como hoje.
- As colunas alternam grandes e pequenas, para não haver duas grandes seguidas do mesmo lado.
- O teste de não sobreposição cobre o ciclo inteiro nas 5 proporções de tela (390×844, 820×1180, 1180×820, 1366×768, 1920×1080), com as caixas do **corpo**, não do arquivo.
- [ ] typecheck + lint + test; commit `feat(ui): seis nuvens diferentes, cada uma no tamanho da sua nitidez`.
