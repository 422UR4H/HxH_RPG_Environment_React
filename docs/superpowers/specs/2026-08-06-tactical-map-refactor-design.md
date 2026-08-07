# Refactor do mapa tático (Fases 1–10-E) — Spec de Design

> **Status:** aprovado em 2026-08-06. Cobre todas as fases do refactor.
> Cada fase = uma sessão + um PR. Os planos de execução ficam em
> `docs/superpowers/plans/2026-08-06-tactical-map-refactor-fase-N-*.md`.

**Contexto de origem:** revisão de código de toda a implementação do mapa tático
(Fases 1 → 10-E) pedida pelo dono do produto, com o objetivo explícito de chegar ao
MVP **sem débito técnico conhecido**. As Fases 11 e 12 foram adiadas justamente para
que este refactor entre antes.

**Spec mestre da feature (não deste refactor):**
`System_X_System/docs/superpowers/specs/2026-05-31-tactical-map-design.md`

---

## 1. Diagnóstico

Baseline medido em 2026-08-06, antes de qualquer mudança:

| | |
|---|---|
| Backend Go | `go vet` limpo, 1228 testes passando em 69 pacotes |
| Frontend | `tsc -b` limpo, 41 arquivos de teste, 334 testes passando |
| Frontend lint | **vermelho** — `npm run lint` reporta 120 erros / 107 arquivos, mas o número é falso (ver C7). Só em `src/`: **23 erros, 6 warnings** |

> **Atenção:** `npm run lint` **não** está limpo no baseline e não ficará limpo ao fim
> deste refactor. Nenhum plano de fase deve exigir "lint limpo" — a instrução correta é
> "o lint em `src/` não pode ter **mais** erros do que o baseline da fase".

O **backend está saudável e fora do escopo deste refactor**. Maior arquivo Go da
superfície de mapa: 128 linhas. DDD-lite respeitado, invariantes documentadas
(`filter_map_state.go` é um bom exemplo do padrão a seguir). Não há nada a fazer lá
além de uma nota de documentação (Fase 1-B).

O problema está concentrado em **quatro arquivos da camada Pixi do frontend**:

| Arquivo | Linhas | Diagnóstico |
|---|---|---|
| `components/organisms/TacticalMapStage.tsx` | 1249 | 6 componentes num arquivo, 40 props, caches de textura em escopo de módulo |
| `features/tactical-map/TacticalMapEditor.tsx` | 641 | orquestração + normalização de save + atalhos de teclado + ghosts DOM |
| `components/organisms/MapHandlesLayer.tsx` | 625 | `BgHandles`/`GridHandles` duplicam ~90 linhas |
| `components/organisms/WallsLayer.tsx` | 599 | 3 cópias do mesmo loop de stipple, 8 refs-espelho, defaults duplicados |

### 1.1 O que está bom — preservar

Não mexer, e usar como referência de estilo:

- `features/tactical-map/utils/coords.ts` e `utils/hex.ts` — puros, testados,
  comentários que explicam *por quê* (não *o quê*).
- `features/tactical-map/store/editorStore.ts` — enxuto, decisões de `zundo`
  (partialize/equality/debounce) documentadas na origem.
- `components/organisms/LosSplit.tsx` — o JSDoc dele impede um bug real (listener
  duplicado). É o padrão a imitar.
- Toda a superfície Go.

### 1.2 A descoberta que ordena o refactor

`src/test/setup.ts` mocka `ResizeObserver` devolvendo **dimensão zero**, e
`TacticalMapStage` só renderiza sob `width > 0 && height > 0`. Somado ao mock de
`@pixi/react` (tudo vira `<div>`, `useApplication()` devolve `{ app: null }`), o
resultado é:

> **Toda a camada Pixi tem cobertura de teste ZERO.** Nenhum teste monta
> `TacticalMapStage`, `MapHandlesLayer`, `WallsLayer`, `PieceSprite`, `GridLayer` ou
> `BgLayer`. O único teste que chega perto (`LobbyPage.test.tsx:276`) apenas afirma
> que o wrapper do placer aparece.

Isso **não é** um convite a montar Pixi em jsdom — seria caro e frágil. É a razão
pela qual a ordem do refactor precisa ser:

**Primeiro tirar a lógica pura de dentro dos componentes e cobri-la com teste.
Só depois mover arquivo.**

Há bastante lógica pura presa lá dentro, hoje sem nenhum teste:

- `computeNewBgFromDrag` (`MapHandlesLayer.tsx:288-367`) — ~80 linhas de matemática
  de resize com preservação de aspect ratio e rotação. Oito casos (`TL`…`BR`) e
  nenhum teste.
- `findNearestWall` / `ptSegDist` (`WallsLayer.tsx:583-599`) — hit-testing puro.
- Os defaults de parede (`HP_DEFAULTS`, `RESISTANCE_DEFAULTS` + o objeto de atributos).
- A geometria de stipple (tracejado/pontilhado/destruído).
- A comparação de ocupação de slot, hoje `JSON.stringify` em 6 lugares.

Uma vez extraída e testada, essa lógica vira a rede de segurança que torna a quebra
do `TacticalMapStage` (Fase 4) uma operação de baixo risco em vez de um salto no escuro.

---

## 2. Achados completos

### 2.1 Bugs

| # | Onde | O quê |
|---|---|---|
| A1 | `components/molecules/__tests__/NpcRosterPanel.test.tsx:57` | Teste procurava o campo de busca, mas `NpcRosterPanel.tsx:37` só o renderiza acima de 15 personagens e a fixture tinha 2. **Já corrigido em 2026-08-06** (fixture longa + teste novo cobrindo o gate). Suíte foi de 333 para 334. |
| A2 | `TacticalMapStage.tsx:936-940` | `pointercancel` registrado com arrow anônima; o cleanup só remove o `pointerup`. Como a função não tem nome, não há como removê-la. O effect depende de `onEmptySlotClick`, que muda de identidade a cada mudança em `pieces` — os listeners acumulam durante a sessão de lobby. |
| A3 | `fog_mode` | **Não é bug — é pendência de produto.** Ver §3. |

### 2.2 Duplicação

| # | Onde | O quê |
|---|---|---|
| B1 | `TacticalMapEditor.tsx:602-641` e `TacticalMapPlacer.tsx:348-386` | `ghostStyle` + `PieceDragGhost` copiados **verbatim**, comentário incluso (~50 linhas). |
| B2 | mesmos dois arquivos | Estado de ghost drag (4 `useState` + 2 refs) e dois `useEffect` de `pointermove` duplicados. `TacticalMapPlacer.tsx:66` admite: `// TODO: extract to useRosterDrag() when a 3rd consumer appears (YAGNI now)` — **o 2º consumidor já chegou**, e `src/components/CLAUDE.md` manda "Promote, don't duplicate". |
| B3 | 6 ocorrências | `JSON.stringify(p.coord.slot) === JSON.stringify(slot)`. Além de repetido, é frágil: depende da ordem de serialização das chaves. |
| B4 | `TacticalMapStage.tsx:744-756` (`GridLayer`) | Geometria hex reimplementada à mão em vez de usar `hexToPixel`. **Confere numericamente** (verificado), mas a conversão offset↔axial (`col = q + floor(r/2)`) vive implícita ali e explícita em `isSlotInBounds`, sem helper nomeado. Mudar a orientação do hex exigiria acertar três lugares. |
| B5 | `WallsLayer.tsx:109-121` e `:225-239` | O objeto de atributos default da parede montado duas vezes. Se um default mudar, o outro fica para trás em silêncio. |
| B6 | `WallsLayer.tsx:428-480` e `:548-581` | `drawDashedLine`, `drawDottedLine` e `drawDestroyedWall` são o mesmo loop de stipple com `(dotLen, gapLen, alpha)` diferentes. |
| B7 | `MapHandlesLayer.tsx` | `BgHandles` e `GridHandles` duplicam o `startDrag` (registro/limpeza de listeners de janela), o rastreamento de Shift, e o desenho do marcador (`BgResizeHandle` ≡ `GridCornerHandle`, verbatim). |

### 2.3 Menores

| # | O quê |
|---|---|
| C1 | `editorStore.addWallSegments` é morto em produção — só testes o usam, como *setup helper*. `mergeWalls` o substituiu. |
| C2 | `MapResponse.Bg/Pieces/Decorations/Items` são `any` no Go, enquanto `Walls` é tipado. O schema OpenAPI desses campos sai vazio. |
| C3 | `System_X_System_React/CLAUDE.md` afirma "No test runner configured". Vitest está configurado com 334 testes. Um doc errado assim faz uma sessão futura não rodar a suíte. |
| C4 | Sobras de `explored_cells` (removido do produto na 10-E) em `utils/__tests__/fogDraw.test.ts:14` e na fixture `realFogPayload.json`. |
| C5 | `MapEditorToolbar` tem **45 props** — repasse puro do editor para 6 painéis. |
| C6 | Indentação de 4 espaços em `drawDestroyedWall` (resto do arquivo usa 2). |
| C7 | **`eslint.config.js` só ignora `dist`.** Existem três worktrees git órfãs de fases anteriores no disco (`.claude/worktrees/feat+tactical-map-fase-10`, `.worktrees/feat-walls-10c`, `.worktrees/feature/tactical-map-fase-10b`), mais `.claude/worktrees/responsive-sidebars`, `.claude/worktrees/tactical-map-fase-1-persistence` e `.local/`. O ESLint linta todas — o codebase inteiro, 3–4 vezes. Daí "120 erros"; o número real em `src/` é 23. Isso torna `npm run lint` inútil como sinal e mascara regressão de verdade. |
| C8 | 23 erros reais de lint em `src/`: 16 `no-explicit-any` (concentrados em `utils/caseConverter.ts`, `hooks/useForm.ts` e páginas de formulário — fora da superfície do mapa), 3 `no-unused-vars`, 2 `no-unused-expressions`, 1 `no-namespace`, 1 `no-empty-object-type`. **Na superfície do mapa são só 3**, todos do padrão `_` de descarte intencional que a config não reconhece: `TacticalMapEditor.tsx:409` (`_ox`, `_oy`) e `TacticalMapPlacer.tsx:128` (`_e`). Mais `TacticalMapStage.tsx:95` (`no-namespace`, na declaração de tipo do `pixiViewport` — legítimo, precisa de disable pontual). |

### 2.4 Decisões explícitas de NÃO mexer

- **Blocos `OCULTO POR ORA` em `MapHandlesLayer`** (~30 linhas comentadas, esfera de
  rotação do grid): **mantidos por decisão do dono do produto.** Não remover, não
  "limpar", não converter em flag. Se um refactor mover o código ao redor, mover os
  comentários junto, intactos.
- **`fog_mode`**: mantido. Ver §3.
- **Zona pixel-tuned** (`src/components/CLAUDE.md`): inalterada por este refactor —
  nenhum arquivo dela está no escopo.

---

## 3. `fog_mode` — pendência de produto, não débito técnico

Investigado a fundo, porque à primeira vista parece fiação morta. **Não é.**

`docs/superpowers/specs/2026-08-05-tactical-map-wall-memory-design.md:137` (repo do
backend) é explícito:

> `fog_mode` **permanece** e continua significativo: `live` = sem memória nenhuma
> (paredes somem ao sair da LOS); `explored` = memória de estrutura ativa.

E o código confirma — `internal/domain/match/service/filter_map_state.go:115`:

```go
if !seen && fogMode == fog.FogModeExplored {
    seen = memory.Has(fog.FeatureWall, w.ID)
}
```

Esse `if` é a única coisa que separa os dois modos. Remover `FogMode` eliminaria o
modo `live` do produto.

O que **está** incompleto é a ligação: `internal/app/game/room.go:176` e `:318`
passam `FogModeExplored` fixo para `SyncPlayerMemories`, então `GetFogMode()`
(`room.go:1094`) devolve sempre o hardcode e nunca o valor persistido no mapa. E
nenhum request/response REST carrega o campo.

**Decisão do dono do produto (2026-08-06):** `fog_mode` será uma **configuração de
partida (match)**, escolhida pelo mestre ao criar/editar a partida. O mecanismo de
configurações de campanha/partida **ainda não existe no backend** (só há espaço e um
template inicial no frontend). Portanto:

- **Não remover** nada de `FogMode`, da coluna `maps.fog_mode`, do `ValidateFogMode`
  nem do mapper.
- **Não terminar a fiação agora** — ela pertence à feature de configurações de
  partida, não a este refactor.
- **Documentar** de forma que ninguém (humano ou agente) volte a achar que é código
  morto. Escopo da Fase 1-B.

---

## 4. Invariantes que o refactor NÃO pode quebrar

Cada item abaixo está documentado em comentário na origem e resolve um bug real que
já aconteceu ou aconteceria. **Se um refactor mover o código, o comentário vai junto.**
Se um refactor tornar o comentário mentira, o refactor está errado.

**Eventos e ordem de execução**

1. Os listeners de pan ficam em `window`, **não** no canvas. `app.renderer` (e
   portanto `app.canvas`) pode não estar pronto na hora do effect; como `app` é
   sempre a mesma referência, o effect nunca reexecuta para registrar o listener
   perdido. (`TacticalMapStage.tsx:394-407`)
2. `pieceDragActiveRef` é lido dentro de um `requestAnimationFrame` para que o
   `onPointerDown` da peça tenha rodado antes de o pan decidir se começa.
   (`TacticalMapStage.tsx:422-426`)
3. `bgDragState` é setado **sincronamente** pelo `onPointerDown` do Pixi do `BgLayer`,
   que dispara antes do handler de `window` no mesmo tick. É isso que permite o pan
   pular quando o sprite de fundo foi o alvo. (`TacticalMapStage.tsx:427-430`)
4. O viewport **não** usa `decelerate()`. O pan é dirigido pelos handlers próprios, e
   o plugin de inércia faria o mapa deslizar após soltar — UX que o dono do produto
   rejeitou explicitamente. (`TacticalMapStage.tsx:364-367`)
5. `useLayoutEffect` (não `useEffect`) para o estado de loading do fundo: precisa
   rodar antes do paint, senão `blob:` URLs em cache disparam `onload` antes do React
   fazer flush e o overlay nunca aparece. (`TacticalMapStage.tsx:229-235`)

**Renderização Pixi**

6. Os filhos de `<LosSplit>` precisam ser **puramente apresentacionais** (só
   `<pixiGraphics>`/`<pixiSprite>`, zero hooks/effects/refs). Eles montam **duas
   vezes**. Um filho que registra listener registraria duas vezes — cada clique em
   porta dispararia duplo, sem nada no console. (JSDoc de `LosSplit.tsx`)
7. Cada container mascarado precisa da **própria** `Graphics`: um display object não
   pode ser máscara de dois containers ao mesmo tempo. E a máscara **nunca**
   `visible={false}` — o `StencilMaskPipe` já a mantém fora do render, e escondê-la
   esvazia a máscara e quebra os dois passes em silêncio. (`LosSplit.tsx:62-65`)
8. As linhas do grid são desenhadas em espaço de **mundo**, com `applyTransform`
   aplicado a cada extremidade — e não via container Pixi com skew, que escalaria a
   espessura do traço de forma não-uniforme e faria linhas sumirem em certas
   combinações de skew/zoom. (`TacticalMapStage.tsx:715-719`)
9. `BlurFilter.padding = 80` fixo na sombra da peça: previne artefato de canto
   quadrado em qualquer intensidade de blur ou nível de zoom.
   (`TacticalMapStage.tsx:1097-1102`)
10. Avatares de R2 passam por `getAvatarBlobUrl`, que faz `fetch(..., {mode:"cors"})`
    com sufixo `?pixi=1`. O sufixo cria uma entrada de cache de CDN separada cuja
    primeira requisição vem sempre deste fetch CORS — garantindo
    `Access-Control-Allow-Origin` na resposta cacheada. Blob URL é same-origin, logo
    seguro para textura WebGL. (`TacticalMapStage.tsx:23-43`)

**Estado e histórico**

11. O `zundo` usa `partialize` só em `map`, `equality` por referência de `map`, e
    `handleSet` com debounce trailing de 400ms. Mexer em qualquer um dos três muda o
    comportamento de undo de forma não-óbvia. (`editorStore.ts:150-163`)
12. No save, `grid.originX/originY` são **dobrados** na posição do fundo, para o grid
    persistido ficar ancorado em (0,0) — o contrato do backend não tem campo de
    origem. Grid, fundo e peças mantêm o alinhamento relativo.
    (`TacticalMapEditor.tsx:350-362`)
13. `bg.r2Url` substitui `bg.url` na persistência: `url` pode ser `blob:` (workaround
    de exibição same-origin). (`TacticalMapEditor.tsx:412-416`)

---

## 5. Faseamento

Ordem escolhida por risco crescente, com a rede de segurança sendo construída antes
do trabalho perigoso.

| Fase | Repo | Conteúdo | Risco |
|---|---|---|---|
| **1** | React | Higiene: bug A2, mortos C1/C4, doc C3, lint utilizável C7/C8 | baixo |
| **1-B** | Go | Documentar `fog_mode` como pendência (§3). Sem mudança de comportamento | nenhum |
| **2** | React | Extrair lógica pura + **cobrir com teste**: B3, B4, B5, B6, e `computeNewBgFromDrag`/`findNearestWall` | baixo, alto retorno |
| **3** | React | Deduplicar UI: `useRosterDrag` + `PieceDragGhost` compartilhados (B1, B2) | médio |
| **4** | React | Quebrar `TacticalMapStage` em arquivos; deduplicar `MapHandlesLayer` (B7) | alto — protegido pela Fase 2 |
| **5** | React | `MapEditorToolbar`: 45 props → assinatura do store (C5) | médio |

**Fases 1 e 1-B são independentes** e podem ir em paralelo (repos diferentes).
**Fase 2 é pré-requisito obrigatório da Fase 4.**

C2 (`any` no `MapResponse`) fica fora: é backend, mexe em contrato REST, e o backend
está saudável. Registrado aqui para não se perder; tratar junto da próxima mudança de
contrato de mapa.

### Por que a Fase 5 não é a Fase 2

As 45 props do `MapEditorToolbar` são o sintoma mais visível, mas o menos perigoso: é
repasse mecânico, o TypeScript pega qualquer erro, e o arquivo já tem teste
(`MapEditorToolbar.test.tsx`). A correção certa é o toolbar assinar o `editorStore`
direto em vez de receber tudo por prop — e isso conversa com as Fases 11/12, que ainda
vão adicionar painéis. Fazer por último evita refazer.

---

## 6. Critérios de aceite do refactor inteiro

Ao fim da Fase 5:

- [ ] `npm run build` (`tsc -b && vite build`) limpo.
- [ ] `npm run lint` **linta só o código real** (worktrees órfãs ignoradas) e reporta
      **zero** erros na superfície do mapa. Os `no-explicit-any` de
      `caseConverter`/`useForm`/páginas de formulário ficam — são fora de escopo, e
      registrados aqui para não se perderem.
- [ ] `npm test` verde, com **contagem de testes maior** que os 334 do baseline.
- [ ] `go vet ./...` e `go test ./...` verdes no backend.
- [ ] Nenhum arquivo de `src/` do mapa acima de ~400 linhas, salvo justificativa
      escrita no próprio arquivo.
- [ ] Zero duplicação verbatim entre `TacticalMapEditor` e `TacticalMapPlacer`.
- [ ] `computeNewBgFromDrag` e `findNearestWall` com teste unitário.
- [ ] Os 13 invariantes da §4 continuam verdadeiros, com os comentários no lugar.
- [ ] Verificação visual no browser (§7) feita a cada fase que toca em Pixi.

## 7. Verificação — obrigatória a cada fase

O `CLAUDE.md` da raiz exige, antes de abrir PR:

1. `./dev-checkout.sh <branch>` a partir de `System_X_System_Project/`.
2. Verificação visual no browser (front) — `http://localhost:5173`.

**Para este refactor a verificação visual não é substituível por teste automatizado**
nas fases 3, 4 e 5. A camada Pixi não é coberta por jsdom (§1.2); o único jeito de
saber que arrastar uma peça, redimensionar o fundo, desenhar uma parede e ver o fog
continuam funcionando é abrir e usar. Roteiro mínimo:

- **Editor de mapa** (`/campanhas/:id/mapas/novo` ou editar um existente):
  aba Fundo (arrastar imagem, redimensionar por handle de canto, redimensionar com
  Shift, rotacionar), aba Grade (redimensionar por canto, Shift em TC/BC para
  perspectiva), aba Peças (arrastar NPC do roster pro canvas, mover peça no canvas,
  arrastar peça de volta pro roster, setas do teclado, Ctrl+Z / Ctrl+Shift+Z),
  aba Paredes (desenhar polilinha, Escape, botão direito, desenhar porta, selecionar,
  arrastar extremidade, Delete).
- **Lobby** (partida com mapa anexado): mestre arrasta peça; jogador clica em slot
  vazio e coloca o próprio personagem.
- **Partida ao vivo**: fog aparece, paredes vistas ficam nítidas e as lembradas
  esmaecidas, clique em porta abre/fecha **uma** vez.
