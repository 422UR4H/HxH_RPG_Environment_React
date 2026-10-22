# Plano: mapa no toque, mesa no celular e telas de formulário (2026-10-22)

Origem: `handover-front-mapa-tablet.md` (raiz do projeto, fora de git) + bugs que o dono do produto viu num
tablet **Android + Chrome**. Sem spec: as decisões de produto estão neste plano (seção "Decisões").

## Contexto global

- Repo: `System_X_System_React/`, branch `fix/mobile-tablet-ux`, **no checkout principal** (sem worktree).
- Leia `CLAUDE.md` do repo e `src/components/CLAUDE.md` antes de mexer em componente.
- A camada Pixi (`src/features/tactical-map/stage/**`, `ViewportInner`) **não tem teste**: o `@pixi/react` é
  mockado. Toda lógica nova que der para tirar do Pixi vai para um módulo puro com teste (padrão:
  `src/features/tactical-map/hooks/tapGesture.ts` + `hooks/__tests__/tapGesture.test.ts`). O controlador
  verifica o resto no navegador.
- No jsdom (`src/test/setup.ts`) `matchMedia` devolve sempre `matches: false`: query `min-width` = tela
  estreita; query `max-width` = tela larga. Não mude esse mock; teste de largura específica sobrescreve
  `window.matchMedia` no próprio arquivo (exemplo: `setWidth` em
  `src/features/match/combat/__tests__/useStageOverlays.test.ts`).

## Restrições globais (valem para toda tarefa)

1. TypeScript strict, `verbatimModuleSyntax` (`import type` para tipos), `styled-components` só, cores só
   por token de `src/styles/tokens.ts`. Não tocar a zona pixel-tuned (`src/components/CLAUDE.md`).
2. Comentários e textos de UI em **português**. Comentário só para o porquê não óbvio.
3. Antes de commitar: `npm run typecheck && npm run lint && npm test` (o lint é `--max-warnings 0`; exceção
   só com `// eslint-disable-next-line <regra> -- <motivo>`).
4. Git: só `git add` dos seus arquivos + `git commit`. Nada de `stash`, `checkout`, `reset`, `rebase`, `push`.
   Mensagem no estilo do repo (`fix(map): …`), terminando com a linha
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
5. Não suba, mate nem reinicie servidores (Vite 5173, API 5000, game 8081). Não rode `dev-checkout.sh`.
6. Teste de página segue o padrão de `src/pages/__tests__/` (MSW). Ajustar teste antigo que quebrou por causa
   de uma mudança de comportamento **pedida neste plano** é esperado: ajuste pelo caminho real do usuário
   (clicar na aba, abrir o painel), nunca afrouxando a asserção.

## Decisões (tomadas com o dono do produto)

- D1. Na mesa, em tela estreita (abaixo de `railUp`, 1024 px), a partida **abre com o painel fechado**; o
  véu continua existindo quando um painel é aberto. Em tela larga nada muda.
- D2. Na mesa não existe zoom da página: só o mapa dá zoom.
- D3. Aba Ficha do mestre: com a Ficha visível, **tocar numa peça mostra a ficha daquele personagem**. A
  alternativa (abrir a gaveta em Personagens) não é implementada.
- D4. Formulários de campanha e partida (criar e editar) recolhem a coluna de regras como a página de
  visualização já faz: aba "REGRAS" na borda e gaveta.

---

### Task 1: O pan do mapa obedece a um ponteiro só (pinça no toque)

**Bug:** no tablet, a pinça dá zoom no canto superior esquerdo (ou some para o inferior direito) em vez do
centro dos dedos, e o mapa pisca durante o gesto. No desktop (roda do mouse) funciona.

**Causa (reproduzida no navegador):** `src/features/tactical-map/stage/ViewportInner.tsx`, efeito
"Viewport pan via DOM events". Os handlers de `pointerdown`/`pointermove`/`pointerup` na `window` tratam
**todo** ponteiro como se fosse o mesmo: com dois dedos, cada `pointermove` (de qualquer dedo) faz
`vp.x = panStartVp.x + (e.clientX - panStartClient.x)`. A câmera pula entre a posição do dedo 1 e a do
dedo 2 a cada evento (o "pisca") e desfaz a correção de centro que o plugin `pinch` do pixi-viewport aplica,
então o zoom fica ancorado na origem do mundo. Medido: numa pinça simulada, `vp.x` alternou
−55/+57/−71/+73…, `vp.y` ficou preso e o ponto que estava sob o centro dos dedos terminou a 1.685 px dali.
Com os nossos handlers bloqueados, a mesma pinça desviou 2–25 px, sem pulos. O plugin `pinch`
(`vp.pinch()`, já ligado) faz zoom no centro e arrasta com dois dedos sozinho; o nosso pan só precisa sair
da frente.

**Comportamento exigido:**
1. O pan pertence a **um** ponteiro: o `pointerId` do `pointerdown` que o armou. `pointermove` de outro
   `pointerId` não mexe na câmera.
2. Um segundo ponteiro que desce enquanto outro está pressionado (pinça) **encerra o pan** e impede que um
   pan ainda pendente (o armado no `requestAnimationFrame`) comece. A pinça fica com o plugin.
3. Quando a pinça termina e sobra **exatamente um** dedo pressionado, o pan **volta** com esse dedo,
   reancorado na posição atual dele e na câmera atual (`vp.x`/`vp.y` no momento) — sem pulo.
4. Todos os ponteiros soltos → estado limpo; o próximo gesto começa do zero.
5. Tudo o que o efeito já respeita continua igual: só `button === 0`, só alvo `=== canvas`,
   `placingNpcId`, `pieceDragActiveRef`, `bgDragState`, `wallGestureActiveRef`, o toque rápido que solta
   antes do quadro não arma pan, `(e.buttons & 1) === 0` encerra o pan, `userMovedRef.current = true` ao
   mover. Mouse (um ponteiro) se comporta exatamente como hoje. O ramo de `bgDragState` do `pointermove`
   não muda.

**Como fazer:** tire a contabilidade dos ponteiros para um módulo puro, no molde de `createTapTracker`:
`src/features/tactical-map/hooks/panGesture.ts` exportando `createPanTracker()`. Interface sugerida
(ajuste nomes se ficar mais claro, mantendo a semântica):

```ts
type Point = { x: number; y: number };
createPanTracker(): {
  down(pointerId: number, at: Point): void;            // registra o ponteiro; 2º ponteiro = pinça (encerra o pan)
  arm(pointerId: number, camera: Point): boolean;       // no rAF: arma o pan se este ponteiro ainda está pressionado e é o único
  move(pointerId: number, at: Point): Point | null;     // nova posição da câmera, ou null se este ponteiro não move a câmera
  up(pointerId: number, camera: Point): void;           // solta/cancela; se sobrou 1 depois de pinça, reancora nele
  isPanning(): boolean;
  reset(): void;                                        // cleanup do efeito
}
```

`move` também atualiza a última posição conhecida do ponteiro (é dela que sai a reancoragem do item 3).
O `ViewportInner` guarda o tracker num ref, chama-o dos handlers que já existem e aplica o `Point` devolvido
em `vp.x`/`vp.y`. Os refs `isPanningRef`, `pointerHeldRef`, `panStartClientRef`, `panStartVpRef` somem se o
tracker os substituir.

**Testes** (`src/features/tactical-map/hooks/__tests__/panGesture.test.ts`), no mínimo:
- um ponteiro: `down` → `arm` → `move` devolve câmera inicial + delta;
- `move` de outro `pointerId` devolve `null`;
- segundo `down` durante o pan: `move` de qualquer ponteiro devolve `null`;
- segundo `down` antes do `arm`: `arm` devolve `false`;
- ponteiro que soltou antes do `arm`: `arm` devolve `false`;
- fim da pinça com um dedo restante: o `move` seguinte desse dedo parte da câmera passada no `up` e da
  última posição desse dedo (sem pulo);
- depois de soltar tudo, um gesto novo de um dedo funciona normalmente.

**Fora do escopo:** `PiecesLayer`, `WallsLayer`, o plugin `pinch` em si, `decelerate`/`drag` do
pixi-viewport (continuam desligados de propósito — ver comentário em `vpCallback`).

**Commit:** `fix(map): pan do mapa segue um ponteiro só — a pinça fica com o pixi-viewport`.

---

### Task 2: Mesa sem zoom de página e painel fechado ao abrir em tela estreita

**Bug:** no início da partida, no tablet em pé, a pinça em cima do mapa dava zoom **na página**, e o mapa
parecia "não selecionado" até o primeiro toque.

**Causa (reproduzida, largura 820 px):** a partida abre com o painel (aba Fila) aberto, e abaixo de `railUp`
o véu do painel (`PanelScrim`, `data-testid="panel-scrim"`) cobre o palco inteiro. O toque no centro do mapa
cai no véu, que tem `touch-action: auto` assim como todos os ancestrais até o `<html>` → o Chrome faz zoom
da página. O primeiro toque fecha o painel (é o papel do véu) e só então o canvas (`touch-action: none`,
posto pelo Pixi) recebe a pinça.

**Mudanças:**
1. `src/components/templates/MatchStageTemplate.tsx`, `Shell`: `touch-action: pan-x pan-y;` — a mesa
   inteira (barra, rail, painel, gaveta, véus) rola mas não dá zoom de página nem zoom por toque duplo. O
   canvas mantém o `none` dele. Comentário curto com o porquê (D2).
2. `src/features/match/combat/useStageOverlays.ts`: estado inicial `panel: !panelIsSheet` (D1). A gaveta
   continua `!asideIsDrawer`. Atualize o docblock do hook. Vale para as duas páginas (mestre e jogador),
   que usam o mesmo hook.
3. Testes:
   - `useStageOverlays.test.ts`: o caso "começa com o painel aberto e a gaveta fechada" (tela estreita)
     passa a afirmar painel **fechado** e gaveta fechada; confira o caso de tela larga (painel aberto).
   - `GameMasterPage.test.tsx` e `GamePlayerPage.test.tsx` (e `GamePage.test.tsx`, se for o caso): o jsdom é
     "tela estreita" para `min-width`, então testes que contavam com o painel aberto no início vão quebrar.
     Corrija abrindo o painel como o usuário faz (clique na aba do rail). Um teste novo por página: a mesa
     abre com o painel fechado (`data-testid="match-panel"` com `data-open="false"`) e sem
     `panel-scrim`.
4. Docs: `docs/dev/match/combate-polimento-mesa.md`, seção "Véu": troque "Estado inicial: painel aberto,
   gaveta aberta só em tela larga" pelo novo estado inicial e registre o `touch-action` do `Shell` (uma ou
   duas frases cada).

**Commit:** `fix(mesa): sem zoom de página e painel fechado ao abrir em tela estreita`.

---

### Task 3: Aba Ficha do mestre — tocar na peça mostra a ficha

**Bug:** na mesa do mestre, a aba Ficha sem ficha escolhida diz "Toque num personagem para ver a ficha.", mas
tocar numa peça não mostra ficha nenhuma: sem ator, tocar num NPC escolhe o ator e pula para a aba Agir;
tocar em outro personagem só o destaca. Abaixo de `railUp` é pior: a Ficha tem véu
(`masterPanelDismissible` devolve `true` para "ficha"), e o véu cobre o mapa.

**Comportamento exigido (D3)** — em `src/pages/GameMasterPage.tsx`. "Ficha visível" =
`panelOpen && !arranging && railActive === "ficha"`:
1. Com a Ficha visível, `handlePieceTap` mostra a ficha do personagem da peça: `setSheetId(charId)` e
   `setInspectedId(charId)` (o anel de inspeção marca de quem é a ficha). Não escolhe ator, não alimenta o
   compositor — com ou sem ator escolhido. O ator e o rascunho do compositor ficam como estavam.
2. Com a Ficha visível, segurar uma peça (`handlePieceHold`) e tocar num slot vazio (`handleSlotTap`) não
   fazem nada (o compositor está escondido; o toque no mapa é da ficha). Tocar numa parede continua como
   hoje (leva ao Agir).
3. `masterPanelDismissible` (`src/features/match/combat/useStageOverlays.ts`): a Ficha passa a pedir toque no
   mapa → só a Fila tem véu. Atualize docstring e testes (`useStageOverlays.test.ts`).
4. Dicas:
   - `MatchSheetPanel` ganha uma prop opcional para o texto vazio (o padrão atual fica para o jogador, que
     não muda). O mestre passa: "Toque numa peça no mapa ou num personagem em Personagens para ver a ficha."
   - `mapHint` do mestre: com a Ficha visível, "Toque numa peça para ver a ficha." no lugar de "Toque num
     NPC para agir por ele.". As dicas dos modos (fuga, onde cai, Arrumar) e a dica de reação continuam
     na frente, na ordem de hoje.
5. Testes em `GameMasterPage.test.tsx` (o mock de `TacticalMapViewer` já tem um botão por peça que chama
   `onPieceSelect`): com a Ficha aberta, tocar na peça de um NPC mostra `match-sheet` desse personagem e
   **não** escolhe ator (a aba Agir não fica ativa, nenhum ator no painel); idem com um ator já escolhido
   (o alvo não entra no compositor); a dica do mapa vira a da ficha; o texto vazio do painel é o do mestre.
   `MatchSheetPanel.test.tsx`: a prop do texto vazio.
6. Docs: `docs/dev/match/combate-polimento-mesa.md` — a regra do `masterPanelDismissible` (seção "Onde mora
   a regra") e uma frase sobre o toque na peça com a Ficha aberta.

**Fora do escopo:** a página do jogador; a gaveta/aba Personagens (o `AsideTabs` continua não controlado).

**Commit:** `fix(mesa): com a Ficha aberta, tocar numa peça mostra a ficha dela`.

---

### Task 4: Scroll da página no celular e coluna de regras nos formulários

**Bug A (scroll):** no celular, rolar até o fim "trava" antes do fim de verdade (precisa de um segundo
arraste), e ao voltar para cima o header fica escondido atrás da barra do navegador.

**Causa A:** `src/styles/ResetStyle.ts` declara `height: 100dvh; height: 100vh;` em `html, body` — a última
vence, então vale `100vh`. No celular `100vh` é a altura com a barra do navegador recolhida, maior que a
área visível. O documento vira um segundo scroller (mais alto que a tela pela altura da barra) por fora do
`#root`, que já é scroller (`overflow-x: hidden` força `overflow-y: auto`). O `#root` chega ao fim, e o resto
só aparece num novo gesto que rola o documento; na volta, o documento continua rolado e o topo do `#root`
(o header) fica fora da tela. Todos os outros lugares do repo já usam a ordem certa (`100vh` e depois
`100dvh`).

**Mudança A:** inverter a ordem (`height: 100vh;` como fallback, depois `height: 100dvh;`), com um comentário
curto dizendo que a ordem importa e por quê. O `#root` continua sendo o scroller —
`SheetBottomActions` e outros leem `document.getElementById("root").scrollTop`.

**Bug B (regras):** em criar/editar campanha e criar/editar partida, a coluna de regras (`RulesSidebar`,
400 px, `flex-shrink: 0`) fica sempre ao lado do formulário (`CreateFormTemplate` renderiza `rulesContent`
cru). No celular ela ocupa a tela e não dá para editar nada.

**Mudança B (D4):** `src/components/templates/CreateFormTemplate.tsx` recolhe o `rulesContent` com o **mesmo
comportamento e visual** da coluna direita de `DetailPageTemplate.tsx`: abaixo de
`useMediaQuery("(max-width: 1149px)")`, a coluna some e aparece a aba "REGRAS" na borda direita; tocar abre
a gaveta (backdrop, X, Esc fecha, toque no backdrop fecha) e a gaveta fecha sozinha quando a tela volta a
ser larga.
- **Promova, não duplique** (`src/components/CLAUDE.md`): extraia de `DetailPageTemplate` a peça
  reutilizável — aba de borda + backdrop + painel da gaveta com o X + Esc — para
  `src/components/molecules/` (ex.: `EdgeDrawer.tsx`, com `side: "left" | "right"`, `label`, `open`,
  `onOpen`, `onClose`, `width`, `children`; ajuste se ficar mais claro). `DetailPageTemplate` passa a usá-la
  nos dois lados, preservando exatamente: larguras (300 esquerda / 400 direita), animações, z-index
  (200/201/202), posição e tamanho do X, estilos da aba, a regra "abrir um lado fecha o outro" e o
  fechamento automático ao sair do colapso. `CreateFormTemplate` usa a mesma peça para o lado direito
  (o `PageBody` dele precisa de `position: relative`).
- Testes: em `src/pages/__tests__/CreateCampaignPage.test.tsx`, com `matchMedia` respondendo à
  `(max-width: 1149px)`, as regras não aparecem, a aba "REGRAS" aparece, clicar abre a gaveta com o conteúdo
  das regras, e Esc fecha. Um teste equivalente em `CampaignPage.test.tsx` protege o refactor do
  `DetailPageTemplate` (se não houver um que já cubra). Os testes existentes dessas páginas continuam
  passando sem mudança.

**Commits:** um por bug — `fix(ui): altura da página pela área visível no celular` e
`fix(ui): regras recolhem em gaveta nos formulários de campanha e partida`.

---

### Task 5: Botões flutuantes da ficha não se atropelam no celular

**Bug:** na ficha (visualização), quando os botões flutuam, "⚙ Gerenciar" e "Procurar Campanhas" se
sobrepõem no celular (Gerenciar fica por baixo). Com "Ver Campanha" (texto menor) não acontece.

**Causa:** `src/features/sheet/SheetBottomActions.tsx`: no estado flutuante, `FloatingLeft` e
`FloatingRight` são dois `position: fixed` independentes (um ancorado à esquerda, o outro à direita), sem
nada que impeça um de invadir o outro quando a soma das larguras passa a largura da tela.

**Mudança:** no estado flutuante, os dois botões ficam numa **única** faixa `position: fixed` no rodapé (o
padrão que `src/components/molecules/BottomActions.tsx` já usa com `FloatingGroup`), com espaço garantido
entre eles; a faixa não pode bloquear toques fora dos botões (`pointer-events: none` nela, `auto` nos
botões). Em tela estreita os dois diminuem (fonte, padding, ícone) para caber. Critérios, medidos no
navegador pelo controlador às larguras 320, 360, 390, 412 e 600 px:
- nenhuma sobreposição; espaço entre os botões ≥ 12 px; margem lateral ≥ 16 px;
- texto em uma linha; altura de toque de cada botão ≥ 44 px;
- em tela larga (≥ 610 px) o visual atual não muda; o estado ancorado (não flutuante) não muda.

Se mexer em `ManageButton` (variante flutuante), `BottomActions` (campanha e partida) também a usa: o visual
dela lá não pode piorar. O menu de Gerenciar continua abrindo acima do botão.

Sem teste automatizado novo (é só layout; o jsdom não mede). Os testes da ficha continuam passando.

**Commit:** `fix(sheet): botões flutuantes da ficha cabem lado a lado no celular`.

---

### Task 6: Pendências do handover (seção 1)

1. **`npcMap` velho no início do arrasto** — `src/features/tactical-map/stage/PiecesLayer.tsx`. O efeito
   dos handlers de ponteiro (deps na linha ~312) lê `npcMap` sem tê-lo nas dependências. Hoje o bug não
   aparece só por acaso: `TacticalMapEditor` e `TacticalMapPlacer` passam `onPieceDragStart` como arrow
   inline, que muda a cada render do pai e re-executa o efeito. Correção: `npcMapRef` atualizado a cada
   render (no padrão `onViewportTransformRef` de `ViewportInner.tsx`) e o handler lê `npcMapRef.current`.
   Remova o `eslint-disable` da linha ~311. Não acrescente `npcMap` às dependências.
2. **`handleSave` recriada a cada render** — `src/features/tactical-map/TacticalMapEditor.tsx` (~273).
   `useCallback` com as dependências reais (`askTruncConfirm` também vira `useCallback`; ela só usa ref e
   setter). Remova o `eslint-disable`. Se `onSave`/`onSaveSuccess` chegam como arrow inline de
   `CreateMapPage`/`EditMapPage`, estabilize lá também, senão o `useCallback` não serve para nada.
3. **Bundle de ~1,4 MB num chunk só** — `src/App.tsx`. `GamePage` e `LobbyPage` (as que puxam o Pixi) viram
   `React.lazy` com `Suspense`, no mesmo molde das rotas de mapa que já são lazy. Rode `npm run build` antes
   e depois e registre no relatório o tamanho do `index-*.js` e se o `pixi.js` saiu dele. Se outra página
   importada de forma estática ainda puxar o Pixi para o chunk principal (ex.: um preview de mapa em
   `MatchPage`/`CampaignPage`), descubra pelo build e trate do mesmo jeito; liste o que fez.

Testes: os existentes continuam passando (`EditMapPage.test.tsx`, `CreateMapPage.test.tsx`,
`GamePage.test.tsx`, `LobbyPage.test.tsx`).

**Commits:** um por item — `fix(map): npcMap lido por ref no arrasto da peça`,
`perf(map): handleSave estável no editor`, `perf(build): mesa e lobby carregam sob demanda`.
