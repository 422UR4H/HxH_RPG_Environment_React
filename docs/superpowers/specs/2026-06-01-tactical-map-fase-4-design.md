# Tactical Map — Fase 4: Editor de Peças (NPCs)

**Data:** 2026-06-01
**Status:** Aprovado — pronto para implementação
**Escopo:** Frontend apenas (`System_X_System_React`)
**Branch:** `feat/tactical-map-fase-4` (a criar a partir de `feat/tactical-map-fase-3`)
**Fase anterior:** [Fase 3 — Imagem de Fundo](../../../System_X_System_React/docs/superpowers/specs/2026-06-01-tactical-map-fase-3-design.md)
**Spec master:** [Tactical Map — Design Geral](./2026-05-31-tactical-map-design.md)

---

## 1. Visão geral

O mestre pode colocar **NPCs** no mapa antes de iniciar uma sessão. Cada NPC é representado por uma peça (token) no canvas Pixi, com visual inspirado nas peças de Gungi. O mestre arrasta ou clica-para-colocar NPCs da lista lateral para um slot da grade; pode movê-los, ajustar altura virtual (Z) e removê-los.

**Fora do escopo desta fase:**
- Personagens de jogador — são adicionados no **lobby da partida** (Fases 6-7), onde o mapa já está compartilhado via WS.
- Movimento in-game (diálogo de opções de movimento) — Fases 6-7.
- Tipos genéricos de NPC (soldado, agente etc.) com N instâncias — ver seção 7.

---

## 2. Princípio de design: seguir VTTs de referência

> **Regra:** Toda decisão de UX/interação do mapa tático deve primeiro verificar como FoundryVTT e outros VTTs de qualidade resolvem o mesmo problema. Se a solução deles for boa, usar. Se houver motivo claro para divergir, documentar o motivo.

Este princípio deve ser mantido ao longo das 12 fases. FoundryVTT é a referência principal por ser open-source, amplamente testado em produção e respeitar exatamente o mesmo modelo turn-based com mestre + jogadores.

---

## 3. O que muda na Fase 4

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/components/molecules/NpcRosterPanel.tsx` | Painel da aba "Peças": busca, lista de NPCs disponíveis, zona de drop |
| `src/components/molecules/PiecePropertyPanel.tsx` | Painel de propriedades da peça selecionada |

### Arquivos modificados

| Arquivo | O que muda |
|---|---|
| `src/components/organisms/TacticalMapStage.tsx` | Upgrade do `PieceSprite`: visual gungi + sombra correta; interação de seleção e drag |
| `src/components/organisms/MapEditorToolbar.tsx` | Habilitar aba "Peças", wiring do `NpcRosterPanel` e `PiecePropertyPanel` |
| `src/features/tactical-map/TacticalMapEditor.tsx` | Gerenciar `placingNpcId` e `selectedPieceId` como estado local; passar callbacks ao Stage |

---

## 4. Modelo de interação

### 4.1 Colocar NPC no campo (roster → canvas)

Implementado com **pointer events** (`pointerdown`/`pointermove`/`pointerup`) — funciona em mouse e touch sem ramificação de plataforma.

```
pointerdown no card do NPC
  ├─ movimento > 4px antes de pointerup → DRAG
  │     Ghost element segue o cursor
  │     Sidebar destaca como drop zone (ativo)
  │     pointerup sobre slot vazio no canvas → placePiece() → card some
  │     pointerup sobre slot ocupado → flash vermelho no slot, drag cancela (peça não colocada)
  │     pointerup em zona neutra (nem canvas, nem sidebar) → drag cancela silenciosamente
  └─ pointerup sem movimento → CLICK-SELECT
        NPC card fica destacado (borda laranja)
        Cursor no canvas muda para crosshair
        Click em slot vazio → placePiece() → card some
        Click em slot ocupado → flash vermelho, mantém modo colocar
        Click em outro NPC card → cancela seleção anterior, inicia com o novo
        Click em qualquer outra coisa → cancela (deselect)
```

### 4.2 Mover peça já colocada (canvas → canvas)

```
pointerdown em sprite de peça existente
  ├─ movimento > 4px → DRAG dentro do canvas
  │     Sprite segue o cursor localmente (sem re-render React)
  │     Slot alvo destacado ao passar por ele (verde se livre, vermelho se ocupado)
  │     pointerup sobre slot vazio → movePiece(pieceId, slot)
  │     pointerup sobre slot ocupado → flash vermelho, peça volta à posição original
  │     pointerup em zona neutra → peça volta à posição original
  └─ pointerup sem movimento → SELECT
        setSelection({ kind: 'piece', id })
        Painel de propriedades aparece no sidebar (sobre a lista)
        Click em outro lugar do canvas → auto-deselect
```

### 4.3 Remover peça (canvas → sidebar)

```
Drag de sprite de peça → em direção ao sidebar
  Sidebar (área de roster) destaca como drop zone
  pointerup sobre sidebar → removePiece(pieceId) → card reaparece na lista
```

Alternativa por botão: painel de propriedades tem botão "✕ Remover do mapa" → mesmo efeito.

### 4.4 Auto-deselect

Click em qualquer área vazia do canvas, ou em fundo da cena Pixi → `setSelection(null)` → painel de propriedades fecha, lista de NPCs volta a aparecer.

---

## 5. Visual dos tokens (Pixi)

### 5.1 Estrutura de camadas por token

Dentro de `PiecesLayer`, cada peça é um `pixiContainer` com esta ordem (back → front):

```
pixiContainer (piece-{id})
├─ shadowGraphics   ← círculo escuro, blur, offset ↓
├─ avatarSprite     ← textura da avatarUrl (carregamento async)
│   └─ gungiMaskGraphics ← máscara circular (clip)
├─ gungiFrameSprite ← gungi.svg sobreposto
└─ badgeText        ← "+Xm" (só quando z > 0)
```

Quando `avatarUrl` falha ou está ausente: `avatarSprite` é substituído por um `circleGraphics` colorido + `pixiText` com a inicial do nickName. Cor gerada via hash do `piece.id` → HSL(hue, 55%, 40%).

### 5.2 Sombra

A peça representa um token **deitado sobre o mapa** (como uma moeda de Gungi), não uma figura em pé. A sombra deve contornar o token com deslocamento mínimo para baixo — seguindo a convenção de luz vindo ligeiramente de cima/frente em jogos 2D.

```
z = 0:
  shadowRadius = tokenRadius + 2
  shadowOffsetY = +2px        ← quase imperceptível, só segue a direção da luz
  shadowOffsetX = 0
  shadowAlpha   = 0.50
  shadowBlur    = 4px

z > 0:
  shadowRadius = tokenRadius + 2 + z * 2   ← sombra cresce com altitude
  shadowOffsetY = +2px                      ← mesma regra; não muda com z
  shadowAlpha   = 0.40                      ← mais difusa
  shadowBlur    = 4 + z * 2
  tokenOffsetY  = -z * 10px                ← token sobe; sombra fica no slot real
```

**Nunca achatar a sombra em elipse.** Sombra elíptica dá aparência de peça em pé (perspectiva isométrica incorreta para top-down).

### 5.3 Seleção

A peça selecionada **cresce** — como se estivesse suspensa acima do board. Escala aplicada ao container inteiro (`pixiContainer.scale`), não ao raio do círculo — isso mantém a sombra e o frame escalando juntos sem recalcular geometrias individuais.

```
selected = false:
  containerScale = 1.0
  shadowRadius   = tokenRadius + 2
  shadowAlpha    = 0.50
  shadowBlur     = 4

selected = true:
  containerScale = 1.35           ← peça fica ~35% maior
  shadowRadius   = tokenRadius + 8 ← sombra cresce mais (elevação maior)
  shadowAlpha    = 0.30           ← mais diluída nas bordas (luz mais distante)
  shadowBlur     = 10             ← mais suave/difusa

  + anel branco externo:
  strokeCircle(center, tokenRadius + 6, { color: 0xffffff, width: 2, alpha: 0.85 })
```

A sombra mais larga e difusa quando selecionado reforça a ilusão de que a peça está "levitando" acima das demais. Implementado ajustando apenas valores de `Graphics.draw` no re-render — sem filtros externos, sem risco de bug de performance.

### 5.4 Carregamento da avatarUrl

Mesmo padrão do `BgLayer` (já existente no projeto):
- `blob:` URL → carrega via `HTMLImageElement` + `ImageSource` (evita problema de parser do Assets)
- URL regular → `Assets.load(url)` com `.catch` → fallback para círculo colorido

---

## 6. Componentes

### 6.1 `NpcRosterPanel`

```tsx
// src/components/molecules/NpcRosterPanel.tsx
type Props = {
  campaignId: string;
  placedCharacterIds: Set<string>;    // IDs dos NPCs já no campo
  placingNpcId: string | null;        // NPC em "modo colocar" (click-select)
  isDropTarget: boolean;              // dragging peça de volta → highlight
  onPointerDownNpc: (npc: CharacterPrivateSummary, e: React.PointerEvent) => void;
};
```

Responsabilidades:
- Busca NPCs via `useCampaignDetails(token, campaignId)` → filtra `characterSheets` onde `!playerUuid`
- Campo de busca (filtra por `nickName`)
- Renderiza `CharacterSidebarItem` para cada NPC **não** em `placedCharacterIds`
- Quando `isDropTarget`: borda laranja + fundo levemente destacado na área
- `onPointerDownNpc`: delegado ao `TacticalMapEditor` que gerencia o estado de drag/placing

### 6.2 `PiecePropertyPanel`

```tsx
// src/components/molecules/PiecePropertyPanel.tsx
type Props = {
  piece: Piece;
  npc: CharacterPrivateSummary;      // dados do NPC para exibir nome/avatar
  onZChange: (z: number) => void;
  onRemove: () => void;
};
```

Layout:
```
┌─────────────────────────────────┐
│ [avatar 32px] Nome do NPC       │
│              NPC · no campo     │
├─────────────────────────────────┤
│ ▶ mais configurações            │  ← collapsible, fechado por padrão
│   ┌─────────────────────────┐   │
│   │ ALTURA (Z)              │   │  ← só aparece quando expandido
│   │ ────────●──── [2.0m]   │   │
│   └─────────────────────────┘   │
├─────────────────────────────────┤
│ [✕ Remover do mapa]             │
│  ou arraste para a lista        │
└─────────────────────────────────┘
```

O collapsible "mais configurações" usa `<details>`/`<summary>` nativo (acessível, zero JS extra) ou um `useState` com animação de altura. Preferir `<details>` pela simplicidade. Fechado por padrão — a altura Z é raramente ajustada. Novos controles menos usados (visibilidade, label, cor do token no futuro) entram neste mesmo grupo.

### 6.3 `MapEditorToolbar` — aba Peças

```tsx
// Aba "pieces" passa a ter enabled: true
// Quando activeTool === 'pieces':
{activeTool === 'pieces' && (
  <>
    {selectedPiece ? (
      <PiecePropertyPanel
        piece={selectedPiece}
        npc={npcById[selectedPiece.characterId]}
        onZChange={(z) => setPieceZ(selectedPiece.id, z)}
        onRemove={() => { removePiece(selectedPiece.id); setSelection(null); }}
      />
    ) : null}
    <NpcRosterPanel
      campaignId={campaignId}
      placedCharacterIds={placedIds}
      placingNpcId={placingNpcId}
      isDropTarget={isDraggingPieceToRoster}
      onPointerDownNpc={handleNpcPointerDown}
    />
  </>
)}
```

O `PiecePropertyPanel` aparece acima do roster quando há seleção, e some com auto-deselect — sem botão "voltar", sem contador de peças no rodapé.

### 6.4 Estado local no `TacticalMapEditor`

```tsx
const [placingNpcId, setPlacingNpcId] = useState<string | null>(null);
const [isDraggingPieceToRoster, setIsDraggingPieceToRoster] = useState(false);
```

O `selectedPieceId` já vive na store (`selection`). O `placingNpcId` é UI-only (não vai para a store nem para o localStorage — não faz sentido persistir "qual NPC estava sendo arrastado").

---

## 7. TODOs — Tipos genéricos de NPC (futuro)

Atualmente, cada NPC é uma `CharacterSheet` única — 1 instância no mapa por NPC. Em versão futura, o sistema vai suportar **tipos genéricos** (ex: "Soldado Zoldyck", "Agente da IHA") que podem ser adicionados ao mapa múltiplas vezes, gerando instâncias independentes.

```ts
// TODO(generic-npc-types): quando tipos genéricos existirem, a CharacterPrivateSummary
// ganhará um campo como `isGenericType: boolean`. NPCs genéricos:
//   - NÃO somem da lista ao serem colocados (permitem N instâncias)
//   - Cada instância recebe um `Piece.id` único mas compartilham o mesmo `characterId`
//   - O painel de propriedades mostrará "Instância #N de [Tipo]"
// Por ora, todos os NPCs são únicos: card some ao colocar, reaparece ao remover.
```

```ts
// TODO(generic-npc-types): a função que filtra placedCharacterIds precisará
// excluir NPCs genéricos do Set para que seus cards permaneçam na lista.
```

---

## 8. Persistência

`Piece[]` já é salvo no JSONB `maps.pieces` pelo backend. A Fase 4 não muda o contrato REST — o save já inclui peças desde a Fase 1/3.

O draft em `localStorage` (já implementado) persiste automaticamente via `useEffect([map, isDirty])` no `TacticalMapEditor`.

---

## 9. Movimento in-game (contexto para Fases 6-7)

Documentado aqui para não ser esquecido ao projetar o lobby.

**Player com 1 ficha:** não precisa pré-selecionar sua peça. Toca diretamente no campo → abre diálogo de movimento ("como você quer se mover?"). Opções variam por proximidade: slots adjacentes têm custo diferente de slots distantes.

**Mestre (ou player com 2 fichas):** precisa selecionar a peça primeiro → depois clica no campo (mover) ou em outra peça (alvejar). Mesmo diálogo de movimento.

O diálogo de movimento é **Fase 8** (tap-to-move intent). A Fase 4 não implementa isso — apenas o arrastar livre do mestre no editor.

---

## 10. Testes

| Camada | O que testar | Como |
|---|---|---|
| `NpcRosterPanel` | Filtra só NPCs, exclui colocados, busca funciona | Testing Library + msw (mock `useCampaignDetails`) |
| `PiecePropertyPanel` | Slider chama `onZChange`, botão chama `onRemove` | Testing Library |
| `editorStore` | `placePiece`, `movePiece`, `setPieceZ`, `removePiece` | Vitest unit (já existem actions) |
| `TacticalMapStage` — PieceSprite | Renderiza shadow + token + badge; seleção mostra anel | Mock `@pixi/react`; assert JSX |
| Visual/manual | Drag & drop, auto-deselect, sombra, gungi frame | Rota `/dev/tactical-map-demo` |

---

## 11. Critério de pronto

O mestre abre o editor, vai para a aba "Peças", vê a lista de NPCs da campanha. Arrasta (ou clica) um NPC para um slot — card some da lista, token aparece no canvas. Clica o token — painel mostra nome + slider Z + botão remover. Arrasta o token para outro slot — move. Arrasta de volta para o sidebar — card reaparece. Salva — recarrega — peças persistem.
