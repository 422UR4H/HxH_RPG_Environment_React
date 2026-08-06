# Refactor do mapa tático — Fase 3: deduplicar o ghost de arraste

> **Para quem implementa:** execute tarefa por tarefa, na ordem.

**Spec de referência (leia a §2.2 antes de começar):**
`docs/superpowers/specs/2026-08-06-tactical-map-refactor-design.md`

**Pré-requisito:** Fases 1 e 2 concluídas e mergeadas.

**Branch:** `refactor/tactical-map-fase-3-dedup-ghost`

**Arquivos:**
- Criar: `src/features/tactical-map/PieceDragGhost.tsx`
- Criar: `src/features/tactical-map/hooks/useRosterDrag.ts`
- Criar: `src/features/tactical-map/hooks/__tests__/useRosterDrag.test.tsx`
- Modificar: `src/features/tactical-map/TacticalMapEditor.tsx`
- Modificar: `src/features/tactical-map/TacticalMapPlacer.tsx`

---

## O problema

`TacticalMapEditor.tsx` e `TacticalMapPlacer.tsx` têm ~90 linhas **idênticas**:

- `ghostStyle(size)` — `TacticalMapEditor.tsx:602-612` ≡ `TacticalMapPlacer.tsx:348-358`,
  comentário de 4 linhas incluso, caractere por caractere.
- `PieceDragGhost({avatarUrl})` — `TacticalMapEditor.tsx:618-641` ≡
  `TacticalMapPlacer.tsx:363-386`.
- O estado de arraste: `placingNpcId`, `placingNpcData`, `isDraggingPieceToRoster`,
  `draggingCanvasPieceNpc`, `ghostRef`, `canvasDragGhostRef`, mais **dois `useEffect`
  de `pointermove`** que posicionam os ghosts.
  (`TacticalMapEditor.tsx:91-145` ≡ `TacticalMapPlacer.tsx:67-99`)

`TacticalMapPlacer.tsx:66` já reconhece:

```
// TODO: extract to useRosterDrag() when a 3rd consumer appears (YAGNI now).
```

O 2º consumidor já existe, e `src/components/CLAUDE.md` é explícito: *"Promote, don't
duplicate. Segunda feature precisa do componente? Promova. Nunca copie."* O TODO estava
esperando o 3º consumidor; a regra do projeto dispara no 2º.

**Onde os arquivos novos moram:** ambos os consumidores estão em
`src/features/tactical-map/`, e nada fora dessa feature usa o ghost. Pela tabela de
`src/components/CLAUDE.md`, isso é código de **uma única feature** → fica em
`src/features/tactical-map/`, **não** em `src/components/`. Não promova para
`components/molecules/`; seria promoção prematura.

---

## Task 1 — Extrair `PieceDragGhost` + `ghostStyle`

**Crie** `src/features/tactical-map/PieceDragGhost.tsx` movendo as duas funções de
`TacticalMapEditor.tsx` (versão do editor; as duas são idênticas, escolha uma).

**Preserve os comentários inteiros** — eles explicam por que o ghost é 1.2× e por que a
sombra escala com o tamanho.

Exporte `PieceDragGhost` como default e `ghostStyle` como named export. Os imports que
vêm junto: `CSSProperties` de `react`, `avatarPlaceholderUrl` e `gungiFrameUrl` (ajuste
os caminhos relativos — o arquivo novo está um nível **acima** de onde os assets eram
referenciados nos dois consumidores; confira com `tsc`).

Enquanto move, aproveite para eliminar o terceiro literal: o portal do ghost aparece
**quatro** vezes entre os dois arquivos, sempre no mesmo formato. Acrescente ao módulo
novo:

```tsx
// Portal do ghost que segue o cursor. O posicionamento é imperativo (style.left/top
// via ref, ver useRosterDrag) e não por state: um setState por pointermove derrubaria
// o framerate do arraste.
export function PieceDragGhostPortal({
  ghostRef, size, avatarUrl,
}: {
  ghostRef: React.RefObject<HTMLDivElement | null>;
  size: number;
  avatarUrl: string | null | undefined;
}) {
  return createPortal(
    <div ref={ghostRef} style={ghostStyle(size)}>
      <PieceDragGhost avatarUrl={avatarUrl} />
    </div>,
    document.body,
  );
}
```

Apague as duas cópias de `ghostStyle` e as duas de `PieceDragGhost` dos consumidores e
importe do módulo novo.

**Cuidado:** em `TacticalMapPlacer.tsx`, `PieceDragGhost` também é usado **dentro** do
`PlacementTokenBtn` (~linha 306), fora de portal. Esse uso continua — só troque o
import.

**Verificar:** `npx tsc -b` limpo, `npm test` verde.

---

## Task 2 — Extrair `useRosterDrag`

### 2.1 Escrever o teste primeiro

**Crie** `src/features/tactical-map/hooks/__tests__/useRosterDrag.test.tsx`.

Use `renderHook` de `@testing-library/react` (o padrão do projeto — veja
`src/features/tactical-map/hooks/__tests__/useEditorHistory.test.tsx` antes de escrever).

Casos:

1. Estado inicial: `placingNpcId === null`, `placingNpcData === null`,
   `isDraggingPieceToRoster === false`, `draggingCanvasPieceNpc === null`.
2. `startPlacing(npc)` → `placingNpcId === npc.uuid` e `placingNpcData === npc`.
3. `cancelPlacing()` → volta os dois para `null`.
4. `startCanvasDrag(npc)` → `draggingCanvasPieceNpc === npc` e
   `isDraggingPieceToRoster === true`.
5. `startCanvasDrag(undefined)` → `draggingCanvasPieceNpc === null`, mas
   `isDraggingPieceToRoster` continua `true` (é o comportamento atual: a sidebar vira
   alvo de drop mesmo sem dados do NPC).
6. `endCanvasDrag()` → zera os dois.
7. **`enableRosterDrop: false`** (o modo jogador do placer) → `startCanvasDrag(npc)`
   define `draggingCanvasPieceNpc` mas deixa `isDraggingPieceToRoster` em `false`.
8. **Listener de `pointermove` é removido no unmount.** Espione com
   `vi.spyOn(window, "removeEventListener")`, monte com `placingNpcId` ativo,
   desmonte, e afirme que houve `removeEventListener("pointermove", ...)`. Este teste
   existe porque o bug A2 da Fase 1 foi exatamente um listener não removido.

**Rode e veja falhar.**

### 2.2 Implementar

**Crie** `src/features/tactical-map/hooks/useRosterDrag.ts`.

Ele passa a ser dono de:

```ts
export function useRosterDrag(opts: { enableRosterDrop: boolean }) {
  // placingNpcId, placingNpcData, isDraggingPieceToRoster, draggingCanvasPieceNpc
  // ghostRef, canvasDragGhostRef
  // os dois useEffect de pointermove
  return {
    placingNpcId, placingNpcData, isDraggingPieceToRoster, draggingCanvasPieceNpc,
    ghostRef, canvasDragGhostRef,
    startPlacing, cancelPlacing, startCanvasDrag, endCanvasDrag,
  };
}
```

Sobre `enableRosterDrop`: hoje o placer faz `if (isMaster) setIsDraggingPieceToRoster(...)`
e o editor sempre seta. Modelar isso como uma **opção do hook** (o editor passa `true`,
o placer passa `isMaster`) mantém os dois comportamentos sem `if` no chamador.

**Detalhes que precisam sobreviver, palavra por palavra:**

- Os dois `useEffect` de `pointermove` usam `{ passive: true }`. Mantenha — o handler
  não chama `preventDefault` e passive dá framerate melhor no arraste.
- O posicionamento é `ghost.style.left/top` direto no ref, **não** via `setState`.
  Um `setState` por `pointermove` derruba o arraste. Escreva o porquê num comentário no
  hook — hoje isso está implícito e é exatamente o tipo de coisa que uma refatoração
  futura "melhora" e quebra.
- Cada `useEffect` faz early-return quando não há arraste ativo (`if (!placingNpcId) return;`),
  então o listener só existe durante o arraste.
- **Todo `addEventListener` tem `removeEventListener` no cleanup, com a mesma
  referência nomeada.** É a lição da Fase 1.

`startPlacing` recebe só `(npc: CharacterPrivateSummary)`. O `NpcRosterPanel` chama
`onPointerDownNpc(npc, e)` com dois argumentos — o segundo é ignorado, como já é hoje
no editor. Se o TS reclamar no placer, ajuste o wrapper no chamador, não a assinatura
do hook.

**Rode e veja passar.**

### 2.3 Consumir nos dois arquivos

Em `TacticalMapEditor.tsx`:
- Apague os 4 `useState`, os 2 `useRef` de ghost e os 2 `useEffect` de `pointermove`.
- `const roster = useRosterDrag({ enableRosterDrop: true });`
- `handleNpcPointerDown` vira `roster.startPlacing`.
- `handleNpcPlacementCancel` vira `roster.cancelPlacing`.
- Em `handleNpcPlaced`, as chamadas `setPlacingNpcId(null); setPlacingNpcData(null);`
  viram `roster.cancelPlacing()`.
- `onPieceDragStart` → `roster.startCanvasDrag(npc)`; `onPieceDragEnd` → `roster.endCanvasDrag()`.
- Os dois blocos `createPortal(...)` do fim viram `<PieceDragGhostPortal .../>`.

Em `TacticalMapPlacer.tsx`, o mesmo, com `enableRosterDrop: isMaster`. Apague o TODO da
linha 66 — ele foi cumprido.

**`dragGhostSize` fica fora do hook.** Ele depende de `map.grid.cellSize` e do
`viewportScale`, que são do chamador. A fórmula é idêntica nos dois
(`Math.max(44, map.grid.cellSize * 0.9 * viewportScale)`) — deixe-a onde está, nos dois
arquivos, com o comentário que a explica. Extrair uma função de uma linha usada duas
vezes trocaria duplicação por indireção sem ganho.

---

## Task 3 — Verificação final

1. `npx tsc -b` — limpo.
2. `npm run lint` — **não fica limpo** (ver spec, C8: ~20 erros pré-existentes fora da
   superfície do mapa). Garanta **zero** erro em arquivo do mapa:
   ```
   npx eslint src -f json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d);for(const f of r){const e=f.messages.filter(m=>m.severity===2);if(e.length&&/tactical-map|Map[A-Z]|Walls/.test(f.filePath))console.log(f.filePath,e.length)}})"
   ```
   Saída vazia = ok.
3. `npm test` — verde, com ~8 testes a mais que a Fase 2.
4. `grep -rn "function ghostStyle\|function PieceDragGhost" src/` → **uma** definição de
   cada, ambas em `src/features/tactical-map/PieceDragGhost.tsx`.
5. `grep -n "useRosterDrag" src/features/tactical-map/TacticalMapPlacer.tsx` → o TODO
   antigo não aparece mais.
6. Confira o tamanho dos dois arquivos: `TacticalMapEditor.tsx` deve cair de ~641 para
   ~530 linhas, `TacticalMapPlacer.tsx` de ~453 para ~360.

---

## Entrega

1. `./dev-checkout.sh refactor/tactical-map-fase-3-dedup-ghost`.
2. **Verificação visual** em `http://localhost:5173` — esta fase mexe em arraste, que é
   puro comportamento de browser e não tem cobertura automatizada. Roteiro completo,
   nos **dois** contextos:
   - **Editor**, aba Peças: arrastar NPC do roster para o canvas (o ghost segue o
     cursor? some ao soltar?); arrastar peça do canvas de volta para o roster (a
     sidebar destaca como alvo de drop?); soltar fora da janela (cancela limpo?).
   - **Lobby como mestre**: mesmos três gestos.
   - **Lobby como jogador**: arrastar a própria peça pelo canvas — o ghost aparece,
     **mas a sidebar não vira alvo de drop** (é o `enableRosterDrop: false`). Confirme
     que o jogador não consegue remover a própria peça arrastando para a lateral.
   - Clicar em slot vazio como jogador: a caixinha "Adicionar aqui?" com os tokens
     continua funcionando (usa `PieceDragGhost` fora de portal).
3. Só então abrir o PR.

**Título do PR:** `refactor(tactical-map): fase 3 — deduplicar ghost de arraste`

---

## O que NÃO fazer

- **Não promova** `PieceDragGhost` para `src/components/`. Um único feature o usa.
- **Não** troque o posicionamento imperativo do ghost por state "para ficar mais
  React". Isso derruba o framerate do arraste.
- **Não** unifique `TacticalMapEditor` com `TacticalMapPlacer`. São fluxos diferentes
  (um edita e salva mapa, o outro sincroniza por WS); só o arraste é comum.
- **Não** toque em `TacticalMapStage.tsx` — é Fase 4.
- **Não remova os blocos `OCULTO POR ORA`** de `MapHandlesLayer`.
