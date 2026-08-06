# Refactor do mapa tático — Fase 1: higiene e baseline verde (frontend)

> **Para quem implementa:** execute tarefa por tarefa, na ordem. Cada passo é uma ação
> de 2–5 minutos. Não pule os passos de "rodar e ver".

**Spec de referência (leia a §2 e a §4 antes de começar):**
`docs/superpowers/specs/2026-08-06-tactical-map-refactor-design.md`

**Objetivo:** deixar a suíte verde e confiável, corrigir um vazamento de listener, e
remover código morto — **sem nenhuma mudança de comportamento visível ao usuário**.

**Branch:** `refactor/tactical-map-fase-1-higiene`

**Repo:** `System_X_System_React` apenas. (A Fase 1-B, no backend, é um PR separado e
independente — pode ser feita antes, depois ou em paralelo.)

**Arquivos:**
- Modificar: `src/components/organisms/TacticalMapStage.tsx`
- Modificar: `src/features/tactical-map/store/editorStore.ts`
- Modificar: `src/features/tactical-map/store/__tests__/editorStore.test.ts`
- Modificar: `src/features/tactical-map/utils/__tests__/fogDraw.test.ts`
- Modificar: `src/features/tactical-map/utils/__tests__/fixtures/realFogPayload.json`
- Modificar: `src/features/tactical-map/TacticalMapEditor.tsx`
- Modificar: `src/features/tactical-map/TacticalMapPlacer.tsx`
- Modificar: `eslint.config.js`
- Modificar: `CLAUDE.md`

---

## Estado de partida — leia antes de tudo

O bug A1 do spec (teste do `NpcRosterPanel`) **já foi corrigido** em 2026-08-06, em
`src/components/molecules/__tests__/NpcRosterPanel.test.tsx` e
`src/test/fixtures/campaign.ts` (fixture nova `npcListFixture`). Essa mudança pode
estar **não commitada** na árvore de trabalho quando você começar.

**Primeira coisa a fazer:** `git status`. Se essas duas modificações estiverem lá,
elas pertencem a esta fase — inclua-as no primeiro commit. Não as desfaça, não as
refaça.

Rode `npm test` antes de qualquer edição e anote o número. **Deve ser 334 testes
passando, 41 arquivos.** Se der 333 com 1 falha, a correção do A1 não está na árvore —
nesse caso avise e pare, não tente adivinhar a correção.

---

## Task 1 — Corrigir o vazamento de listener `pointercancel`

**Arquivo:** `src/components/organisms/TacticalMapStage.tsx`, dentro de `PiecesLayer`,
no `useEffect` que começa por volta da linha 923 com o comentário
"Resolve empty-slot click on pointerup".

**O código hoje** (linhas ~936-940):

```ts
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", () => { emptySlotPendingRef.current = null; });
    return () => {
      window.removeEventListener("pointerup", handleUp);
    };
```

**O defeito:** o handler de `pointercancel` é uma arrow function anônima. Para remover
um listener é preciso passar exatamente a mesma referência de função — uma função
anônima é irrepetível, então esse listener nunca sai. O effect depende de
`onEmptySlotClick`, que em `TacticalMapPlacer` é um `useCallback` com `pieces` nas
dependências: muda de identidade a cada peça movida, o effect reexecuta, e mais um
listener fica pendurado.

**A correção:** dar nome à função e removê-la no cleanup.

```ts
    const handleCancel = () => { emptySlotPendingRef.current = null; };
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
```

**Não faça mais nada neste effect.** Em particular, não mexa nas dependências e não
tente "otimizar" o `useCallback` do `TacticalMapPlacer` — isso é escopo da Fase 3.

**Verificar:** `npx tsc -b` limpo.

---

## Task 2 — Remover `addWallSegments` do store

**Contexto:** `mergeWalls` substituiu `addWallSegments` quando a resolução de
sobreposição entrou. Nenhum código de produção chama `addWallSegments` — só os testes,
e lá ele é usado como *helper de setup*, não como sujeito do teste.

### 2.1 Remover do store

**Arquivo:** `src/features/tactical-map/store/editorStore.ts`

Apague a linha da declaração de tipo (~linha 42):

```ts
  addWallSegments: (segments: WallSegment[]) => void;
```

E a implementação (~linhas 117-118):

```ts
        addWallSegments: (segments) =>
          set((s) => { s.map.walls.push(...segments); s.isDirty = true; }),
```

### 2.2 Ajustar os testes que o usavam como setup

**Arquivo:** `src/features/tactical-map/store/__tests__/editorStore.test.ts`

Três testes o usam (por volta das linhas 128, 138, 147):

1. **`"addWallSegments appends and marks dirty"`** — este teste existe só para testar a
   função que está sendo removida. **Apague o teste inteiro.** Não o converta para
   `mergeWalls`: já existe cobertura de `mergeWalls` em outro lugar do arquivo — confirme
   com `grep -n "mergeWalls" src/features/tactical-map/store/__tests__/editorStore.test.ts`
   antes de apagar. Se **não** houver nenhum teste de `mergeWalls`, então em vez de
   apagar, reescreva este como `"mergeWalls appends and marks dirty"` usando `mergeWalls`.

2. **`"updateWallSegment patches by id"`** e **`"removeWallSegment removes by id"`** —
   nestes o `addWallSegments` é só setup. Troque a chamada por `mergeWalls`:

   ```ts
   store.getState().mergeWalls([mockWall()]);
   ```

   **Atenção:** `mergeWalls` passa por `resolveOverlaps`. Com o store vazio não há nada
   para sobrepor, então o segmento entra intacto e o `id` `"w1"` é preservado. Isso é o
   esperado — mas **rode o teste e confirme**. Se o `id` não for preservado, pare e
   avise: significa que `resolveOverlaps` mudou de comportamento e isso é achado novo,
   fora do escopo desta fase.

**Verificar:** `npx vitest run src/features/tactical-map/store/__tests__/editorStore.test.ts`
— todos passando.

---

## Task 3 — Limpar sobras de `explored_cells`

**Contexto:** `explored_cells` saiu do contrato na 10-E (ver
`System_X_System/docs/superpowers/specs/2026-08-05-tactical-map-wall-memory-design.md`
§5). O código de produção já não o lê. Sobrou só em teste.

### 3.1 Tipo local no teste

**Arquivo:** `src/features/tactical-map/utils/__tests__/fogDraw.test.ts`

No `type Payload` (~linha 12), apague a linha:

```ts
  explored_cells: Array<[number, number]>;
```

Confirme que nada mais no arquivo lê `payload.explored_cells`
(`grep -n "explored_cells" nesse arquivo`). Se ler, **pare e avise** — significa que há
um teste ativo dependendo do campo removido, e isso muda o escopo.

### 3.2 Fixture

**Arquivo:** `src/features/tactical-map/utils/__tests__/fixtures/realFogPayload.json`

Remova a chave `"explored_cells"` e todo o array gigante dela. Mantenha
`"visible_polygons"`, `"grid"` e `"fog_mode"` **exatamente como estão** — os dois
primeiros são lidos pelo teste, e `fog_mode` documenta o payload real.

É um JSON de uma linha só. Edite com cuidado para não quebrar a sintaxe; rode
`npx vitest run src/features/tactical-map/utils/__tests__/fogDraw.test.ts` logo depois
para confirmar que o parse continua válido e os testes passam.

---

## Task 4 — Tornar `npm run lint` utilizável

**O problema:** `eslint.config.js` só ignora `dist`. Existem worktrees git órfãs de
fases anteriores dentro do repo — `.claude/worktrees/`, `.worktrees/`, mais um
diretório `.local/`. O ESLint linta todas elas, ou seja, linta o codebase inteiro 3–4
vezes. Por isso `npm run lint` reporta **120 erros em 107 arquivos** quando o número
real, só em `src/`, é **23 erros e 6 warnings**.

Enquanto isso for verdade, o lint não serve como sinal: uma regressão nova se perde no
meio do ruído duplicado.

### 4.1 Ignorar o que não é código do projeto

**Arquivo:** `eslint.config.js`, primeira entrada do array.

Hoje:

```js
  { ignores: ["dist"] },
```

Passa a ser:

```js
  // Worktrees de fases anteriores e diretórios locais vivem dentro do repo. Sem
  // ignorá-los, o ESLint linta o codebase inteiro 3–4 vezes e o mesmo erro aparece
  // multiplicado — o que tornava `npm run lint` inútil como sinal de regressão.
  { ignores: ["dist", ".worktrees", ".claude", ".local"] },
```

**Números esperados** (medidos em 2026-08-06, antes da Task 4.2):

- `npx eslint src` → **23 erros**
- `npm run lint` → **24 erros** — os 23 de `src/` mais **um** em `vite.config.ts`
  (`no-explicit-any`), que é arquivo legítimo do projeto e fica.

Se `npm run lint` ainda reportar muito mais que isso, sobrou diretório no `ignores`.
Descubra quais arquivos fora de `src/` ainda entram com:

```
npx eslint . -f json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d);r.filter(f=>f.messages.some(m=>m.severity===2)&&!f.filePath.includes('/src/')).forEach(f=>console.log(f.filePath))})"
```

O único caminho esperado nessa saída é `vite.config.ts` na raiz.

### 4.2 Corrigir os 3 erros de lint da superfície do mapa

São todos do padrão `_` (variável intencionalmente descartada) que a config do
`typescript-eslint` não reconhece por padrão.

**`src/features/tactical-map/TacticalMapEditor.tsx:409`** — dois erros na mesma linha:

```ts
const { originX: _ox, originY: _oy, ...gridForApi } = mapToSave.grid;
```

**`src/features/tactical-map/TacticalMapPlacer.tsx:128`**:

```ts
(npc: CharacterPrivateSummary, _e: React.PointerEvent) => {
```

O código está certo — o `_` já é a convenção. Quem está errado é a config. Acrescente
a regra em `eslint.config.js`, dentro do bloco `rules`:

```js
      // O `_` como prefixo já é a convenção do projeto para descarte intencional
      // (destructuring que remove campos, parâmetro de callback não usado).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
```

**Não renomeie as variáveis** e não apague o destructuring — ele existe para remover
`originX`/`originY` do objeto enviado à API (o backend rejeita propriedades
inesperadas). É comportamento, não estilo.

**`src/components/organisms/TacticalMapStage.tsx:95`** — `no-namespace`, no bloco:

```ts
declare module "react" {
  namespace JSX {
    interface IntrinsicElements { pixiViewport: {...} }
  }
}
```

Este é legítimo: é a forma de declarar o elemento customizado do `pixi-viewport` para o
JSX. Não dá para reescrever sem `namespace`. Adicione um disable pontual **com o
motivo**, imediatamente acima do `declare module`:

```ts
// eslint-disable-next-line @typescript-eslint/no-namespace -- augmentação de JSX.IntrinsicElements
// para o elemento customizado <pixiViewport>; não há forma de declarar isso sem namespace.
```

Se o disable na linha errada não silenciar (o erro é reportado na linha do `namespace`,
não do `declare module`), mova o comentário para imediatamente acima do `namespace JSX`.

**Não toque nos outros 20 erros de `src/`** — `no-explicit-any` em
`utils/caseConverter.ts`, `hooks/useForm.ts`, `types/` e páginas de formulário. São
fora da superfície do mapa, pré-existentes, e estão registrados no spec como C8. Mexer
neles aqui infla o PR e mistura escopos.

### 4.3 Relatar as worktrees órfãs (não apagar)

Rode:

```
git worktree list
```

Devem aparecer três worktrees além da principal (fases 10, 10b e walls-10c). O
`CLAUDE.md` da raiz diz que worktrees devem ser deletadas antes de encerrar o trabalho —
essa disciplina falhou nessas fases.

**Não as remova.** `git worktree remove` é destrutivo e a decisão é do dono do
repositório. Apenas **liste as três no corpo do PR**, com uma linha dizendo que
`git worktree remove <path>` preserva a branch e só apaga o diretório de trabalho.

---

## Task 5 — Corrigir o `CLAUDE.md`

**Arquivo:** `CLAUDE.md` (raiz de `System_X_System_React`)

Na seção `## Commands`, a linha abaixo está errada:

```
No test runner configured. Vercel SPA rewrite in `vercel.json`.
```

Vitest **está** configurado. Substitua o bloco de comandos por:

```
- `npm run dev` — Vite dev server (HMR)
- `npm run build` — `tsc -b && vite build` (TS errors fail the build)
- `npm run lint` — `eslint .`
- `npm test` — `vitest run` (suíte completa)
- `npm run test:watch` — vitest em watch
- `npm run test:coverage` — vitest com cobertura
- `npm run preview` — serve production build locally

Vercel SPA rewrite in `vercel.json`.
```

E acrescente, logo abaixo desse bloco, uma nota curta — ela evita que uma sessão futura
refatore a camada Pixi achando que tem rede:

```
> **Cobertura:** `src/test/setup.ts` mocka `@pixi/react` (tudo vira `<div>`) e
> `ResizeObserver` com dimensão zero, então `TacticalMapStage` e toda a camada Pixi
> (`MapHandlesLayer`, `WallsLayer`, `PieceSprite`) **não são cobertos por teste**.
> Mudança nessa camada exige verificação visual no browser.
```

**Não mexa em mais nada do `CLAUDE.md`.**

---

## Task 6 — Verificação final

Nesta ordem:

1. `npx tsc -b` — limpo.
2. `npm run lint` — **não fica limpo, e não deve ficar.** O esperado após a Task 4 é:
   - nenhum arquivo de `.worktrees/`, `.claude/` ou `.local/` na saída;
   - **~21 erros** (24 do baseline pós-ignore, menos os 3 do mapa resolvidos na
     Task 4.2), todos `no-explicit-any` / `no-unused-expressions` /
     `no-empty-object-type` **fora** da superfície do mapa;
   - **zero** erros em qualquer arquivo com `tactical-map`, `Map*` ou `Walls*` no nome.

   Confira o último ponto com:
   ```
   npx eslint src -f json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d);for(const f of r){const e=f.messages.filter(m=>m.severity===2);if(e.length&&/tactical-map|Map[A-Z]|Walls/.test(f.filePath))console.log(f.filePath,e.length)}})"
   ```
   Saída vazia = ok.
3. `npm test` — **verde, com 333 testes** (334 do baseline menos o
   `"addWallSegments appends and marks dirty"` que foi apagado na Task 2.1; se você
   precisou reescrevê-lo como `mergeWalls` em vez de apagar, então continuam 334).
   Nenhum teste pode **falhar** em nenhum cenário.

Se a contagem der diferente disso, pare e explique a diferença antes de seguir.

---

## Entrega

Siga o `CLAUDE.md` da raiz do projeto:

1. `./dev-checkout.sh refactor/tactical-map-fase-1-higiene` a partir de
   `System_X_System_Project/`.
2. **Verificação visual** no browser em `http://localhost:5173`. Esta fase toca a
   camada Pixi (Task 1), então o roteiro mínimo é: abrir o editor de um mapa, ir na aba
   **Peças**, arrastar um NPC do roster para o canvas, mover a peça pelo canvas, e —
   em um lobby de partida como **jogador** — clicar num slot vazio e confirmar que a
   caixinha "Adicionar aqui?" ainda aparece e ainda coloca a peça. É exatamente o
   caminho que a Task 1 tocou.
3. Só então abrir o PR.

**Título do PR:** `refactor(tactical-map): fase 1 — higiene e baseline verde`

No corpo, liste: A1 (já corrigido), A2, C1, C3, C4, C7, C8 do spec; as três worktrees
órfãs (Task 4.3); e o número de erros de lint antes/depois. Cross-link com o PR da
Fase 1-B (backend) se ele já existir.

---

## O que NÃO fazer nesta fase

- Não toque em `MapHandlesLayer.tsx` — em particular, **não remova os blocos
  comentados `OCULTO POR ORA`**. Eles ficam por decisão do dono do produto.
- Não comece nenhuma extração de lógica pura — é Fase 2.
- Não mexa nas props do `MapEditorToolbar` — é Fase 5.
- Não toque no backend — é a Fase 1-B, PR separado.
- Não "aproveite para" arrumar mais nada que encontrar pelo caminho. Se achar algo,
  anote no corpo do PR como observação e siga.
