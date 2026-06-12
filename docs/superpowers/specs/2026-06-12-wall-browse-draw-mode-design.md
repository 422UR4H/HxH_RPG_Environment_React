# Tactical Map — Paredes: Browse/Draw mode + seleção e edição de paredes

**Data:** 2026-06-12
**Status:** Aprovado — pronto para writing-plans
**Escopo:** Frontend apenas (`System_X_System_React`)
**Branch:** `feat/tactical-map-fase-10` (continuação — mesma branch, novo PR ou adição ao #48)
**Spec master:** `2026-05-31-tactical-map-fase-1-design.md`
**Fase anterior:** Fase 10 (WallsLayer, WallTypeChips, WallConfigPanel, save)

---

## 1. Visão geral

A aba Paredes hoje entra diretamente em modo de criação ao ser selecionada, o cursor já
mostra o preview de snap e o arrastar do mapa fica travado. Esta fase corrige isso com
dois modos explícitos: **Browse** (navegar, selecionar, editar) e **Draw** (criar paredes).

### O que "pronto" significa

- Entrar na aba Paredes → Browse mode (arrastar o mapa funciona normalmente)
- Clicar em tipo de parede na sidebar → Draw mode (chip ativo, badge âmbar)
- Criar paredes funciona igual ao atual (snap, Shift livre, auto-finish de portas)
- Esc ×1 (em construção): consolida segmentos feitos, cancela o pendente, permanece em Draw
- Esc ×2 (sem construção): retorna ao Browse
- Btn direito (em construção): mesmo comportamento do Esc ×1 (já funciona assim)
- Clicar no chip ativo na sidebar: retorna ao Browse
- Clicar em parede existente no Browse: seleciona (highlight + painel na sidebar)
- Painel de seleção: editar tipo e material via chips explícitos + Aplicar + Deletar
- Delete key com parede selecionada: remove a parede
- Todo texto visível ao usuário em PT-BR

---

## 2. Modos

### Browse mode (padrão)

Badge: ponto cinza + texto `SELECIONAR`

| Ação no canvas | Resultado |
|---|---|
| Arrastar com btn esquerdo | Move o viewport (pan) |
| Clicar em parede existente | Seleciona a parede |
| Clicar em área vazia | Deseleciona |

Nenhum chip de tipo ativo na sidebar. O `drawingEnabled` prop de `WallsLayer` é `false` —
nenhum handler de drawing consome eventos, tudo passa pro viewport.

### Draw mode

Badge: ponto âmbar (glow) + texto `DESENHANDO · <TipoAtivo>`

| Ação | Resultado |
|---|---|
| Clicar em snap point | Coloca ponto / finaliza segmento |
| Shift + clicar | Posição livre (sem snap) |
| Auto-finish de porta/janela | Consolida, permanece em Draw |
| Duplo-clique | Consolida polyline, permanece em Draw |
| Esc (em construção) | `finishPolyline()` — consolida, permanece em Draw |
| Esc (sem construção em andamento) | Retorna ao Browse |
| Btn direito (em construção) | `finishPolyline()` (igual ao atual) |
| Clicar no chip ativo na sidebar | Retorna ao Browse |
| Clicar fora de snap area | Não consome evento (viewport pan funciona) |

---

## 3. Arquitetura de estado

### `editorStore.ts` — novos campos

```ts
// Adicionar ao WallsState (dentro do editorStore):
wallsDrawMode: "browse" | "draw";

// Ações:
enterWallsDrawMode: (type: WallType) => void;   // ativa Draw, seta activeWallType
exitWallsDrawMode: () => void;                   // volta a Browse, não muda activeWallType
```

`activeWallType` e `activeMaterial` continuam existindo — `enterWallsDrawMode` seta ambos.
Ao sair do Draw, `activeWallType` não é limpo (facilita re-entrar no mesmo tipo).

### `WallsLayer.tsx` — nova prop

```ts
drawingEnabled: boolean   // false = Browse (sem preview, sem drawing handlers ativos)
```

Quando `drawingEnabled = false`:
- `onMove` não atualiza `previewPoint`
- `onDown` só executa a lógica de seleção (`findNearestWall`) — não inicia drawing
- Todos os eventos não-seleção passam através (viewport recebe pan)

O callback de Escape muda: `WallsLayer` recebe `onExitDrawMode: () => void`, chamado quando
`polylinePoints.length === 0` e o usuário pressiona Esc.

---

## 4. Componentes

### `WallTypeChips.tsx` (modificar)

- Prop `activeType: WallType | null` — chip ativo tem estilo filled + outline de foco
- Clicar em chip inativo → `enterWallsDrawMode(type)` via store
- Clicar em chip ativo → `exitWallsDrawMode()` via store
- Hint visual abaixo dos chips:
  - Browse: `"Clique em um tipo para começar a desenhar"`
  - Draw: `"Clique no tipo ativo para sair do modo Desenho"`

### Novo badge de modo (dentro de `WallConfigPanel` ou `MapEditorToolbar`)

```
Browse:  ● SELECIONAR
Draw:    ● (glow âmbar) DESENHANDO · Porta
```

Posição: topo do painel da aba Paredes, acima dos chips de tipo.

### Painel de seleção de parede (Browse mode com `selectedWallId`)

Exibido em lugar do `WallConfigPanel` de criação quando `wallsDrawMode === "browse"` e
há uma parede selecionada. Pode ser um componente novo `WallSelectionPanel` ou o
`WallConfigPanel` existente com um modo `"selection"`.

Conteúdo:
- Badge `▶ PAREDE SELECIONADA`
- Chips de **Tipo** (todos os WallType) — chip do tipo atual ativo, clicável
- Chips de **Material** (stone/wood/iron/magical) — chip do material atual ativo, clicável
- Botão `Aplicar` → chama `updateWallSegment(id, { wallType, material })`
- Botão `Deletar` → chama `removeWallSegment(id)`, deseleciona

Delete key global (quando `wallsDrawMode === "browse"` e `selectedWallId !== null`):
→ `removeWallSegment(selectedWallId)` + `onWallSelect(null)`

### Labels PT-BR obrigatórios

| Contexto | Texto |
|---|---|
| Badge Browse | `SELECIONAR` |
| Badge Draw | `DESENHANDO · <Tipo>` |
| Hint Browse | `Clique em um tipo para começar a desenhar` |
| Hint Draw | `Clique no tipo ativo para sair do modo Desenho` |
| Hint Esc Draw | `Esc para sair` |
| Badge seleção | `PAREDE SELECIONADA` |
| Seção tipo (seleção) | `Tipo` |
| Seção material (seleção) | `Material` |
| Botão aplicar | `Aplicar` |
| Botão deletar | `Deletar` |
| WallType nomes | `Parede`, `Porta`, `Janela`, `Porta Secreta`, `Terreno` |
| Material nomes | `Pedra`, `Madeira`, `Ferro`, `Mágico` |

---

## 5. Fluxo de dados resumido

```
Usuário clica chip "Porta"
  → enterWallsDrawMode("door")          [store]
  → wallsDrawMode = "draw"
  → TacticalMapEditor passa drawingEnabled=true para WallsLayer
  → WallsLayer ativa handlers de drawing

Usuário pressiona Esc sem construção em andamento
  → WallsLayer chama onExitDrawMode()
  → exitWallsDrawMode()                 [store]
  → wallsDrawMode = "browse"
  → drawingEnabled = false

Usuário clica em parede no Browse
  → WallsLayer chama onWallSelect(id)
  → TacticalMapEditor seta selectedWallId
  → WallSelectionPanel exibe tipo/material da parede selecionada

Usuário altera tipo/material e clica Aplicar
  → updateWallSegment(id, { wallType, material }) [store]
  → editorStore marca dirty → debounce → PUT /maps/:id
```

---

## 6. Fora de escopo

- Edição de HP, resistência, locked, open — visível na futura fase de propriedades avançadas
- Arrastar endpoints de paredes existentes (endpoint drag) — planejado em fase posterior
- Multi-seleção de paredes
- Undo/redo de edições via painel de seleção (zundo já captura via beginGesture/endGesture)
