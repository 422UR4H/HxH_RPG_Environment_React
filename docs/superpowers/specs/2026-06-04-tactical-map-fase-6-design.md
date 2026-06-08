# Tactical Map — Fase 6: Viewer in-Match, Posicionamento no Lobby e GamePage

**Data:** 2026-06-04
**Status:** Aprovado — pronto para writing-plans
**Escopo:** Cross-stack (`System_X_System_React` + `System_X_System`)
**Branch frontend:** `feat/tactical-map-fase-6` (a criar a partir de `main`)
**Branch backend:** `feat/tactical-map-fase-6` (a criar a partir de `main`)
**Fase anterior:** [Fase 5 — Polish do Editor](./2026-06-03-tactical-map-fase-5-design.md)
**Spec master:** [Tactical Map — Design Geral](./2026-05-31-tactical-map-fase-1-design.md) §6 (Fase 6)

> **Sessões:** este spec é escrito por Opus. O writing-plans e a implementação serão feitos por Sonnet. O documento é detalhado e autossuficiente — não depende do transcript do brainstorm.

---

## 1. Visão geral

A Fase 6 é a primeira vez que o mapa tático aparece **em contexto de jogo real** — não mais em tela de edição isolada. Ela entrega três capacidades:

1. **Anexar mapa a uma partida** — mestre escolhe um mapa da campanha e o associa à partida.
2. **Posicionamento no lobby** — antes de iniciar a partida, mestre e jogadores posicionam peças no mapa via uma interface interativa sincronizada por WebSocket.
3. **GamePage com mapa** — após o início da partida, todos os participantes veem o mapa com as posições salvas em tela cheia.

### O que "pronto" significa para esta fase

- Mestre vê a aba "Mapas" na `MatchPage` e pode anexar/desanexar um mapa.
- No lobby, o mapa aparece no conteúdo central. Mestre pode arrastar qualquer peça. Cada jogador pode arrastar apenas a sua própria peça.
- Movimentos de peças são visíveis em tempo real para todos no lobby (via WS).
- Ao iniciar a partida, as posições atuais das peças são salvas no mapa no backend antes de disparar o `StartMatch`.
- `GamePage` exibe o mapa em tela cheia com as posições salvas; sidebar colapsável mostra participantes.

---

## 2. Princípio de design: seguir VTTs de referência

> **Regra (mantida das fases anteriores):** toda decisão de UX deve primeiro verificar como FoundryVTT e VTTs de qualidade resolvem o mesmo problema.

Aplicações nesta fase:

- **Posicionamento pré-jogo**: FoundryVTT permite que o GM posicione tokens antes de iniciar a cena. Jogadores não arrastam tokens na prep — mas este projeto adiciona essa capacidade porque combina com o modelo de lobby assíncrono. **Divergência consciente** — documentada aqui.
- **Lobby sync**: VTTs usam canais WS dedicados para sincronização de estado de cena. Reutilizamos o WS do lobby existente (simples, sem protocolo novo).
- **GamePage tela cheia**: FoundryVTT, Roll20 e Owlbear Rodeo são todos full-screen canvas com elementos de UI flutuantes/colapsáveis. Seguimos esse padrão.

---

## 3. Escopo detalhado

### 3.1 O que esta fase entrega

| Capacidade | Onde | Quem |
|---|---|---|
| Anexar/desanexar mapa à partida | `MatchPage` aba Mapas | Mestre |
| Ver mapa e peças no lobby | `LobbyPage` conteúdo central | Todos |
| Arrastar qualquer peça no lobby | `LobbyPage` | Mestre |
| Arrastar própria peça no lobby | `LobbyPage` | Cada jogador |
| Sync em tempo real de peças via WS | Lobby WS | Todos |
| Arrastar do roster para adicionar peça | `LobbyPage` | Mestre |
| Arrastar peça de volta ao roster para remover | `LobbyPage` | Mestre |
| Salvar posições ao iniciar partida | LobbyPage → backend | Mestre |
| Ver mapa em tela cheia pós-início | `GamePage` | Todos |
| Sidebar colapsável com participantes | `GamePage` | Todos |

### 3.2 Fora de escopo desta fase

- Edição de grid/bg no lobby (apenas posicionamento de peças).
- Undo/redo no lobby (sem editorStore — posição atual é o que vale).
- Sincronização WS em tempo real na `GamePage` (Fase 7).
- Toolbar do mestre na `GamePage` para editar mapa durante a partida (Fase 12).
- Autorização server-side de qual jogador pode mover qual peça (cliente restringe via `draggablePieceIds`; backend apenas faz broadcast). `// TODO: validate piece ownership per user (Phase 7+)`

---

## 4. Backend

### 4.1 Tabela `match_maps`

```sql
CREATE TABLE match_maps (
  match_id    UUID  PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  map_id      UUID  NOT NULL REFERENCES maps(id) ON DELETE RESTRICT,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `ON DELETE RESTRICT` no `map_id`: mapa não pode ser deletado enquanto estiver anexado a uma partida.
- Uma partida tem no máximo um mapa anexado (PK = `match_id`).

### 4.2 Entidade de domínio

```go
// internal/domain/matchmap/entity/match_map.go
package entity

import "time"

type MatchMap struct {
    MatchID    string
    MapID      string
    AttachedAt time.Time
}
```

Sem validação complexa de domínio: a regra "um mapa por partida" é garantida pela PK da tabela.

### 4.3 Use cases

```
internal/application/matchmap/
├── attach_match_map.go     — insere ou substitui (UPSERT) o mapa da partida
├── get_match_map.go        — retorna match_map ou nil se não há mapa
└── detach_match_map.go     — deleta a linha (partida fica sem mapa)
```

**Pré-condição de attach/detach**: partida deve ter `game_start_at IS NULL` (não pode trocar mapa depois de iniciada). Retorna 422 se partida já iniciada.

### 4.4 Repository + Handler

```
internal/gateway/pg/matchmap_repository.go
internal/app/api/matchmap/
├── api.go                  — struct Api + RegisterRoutes
├── attach_match_map.go     — POST /matches/{match_id}/map
├── get_match_map.go        — GET  /matches/{match_id}/map
└── detach_match_map.go     — DELETE /matches/{match_id}/map
```

**Auth:** JWT obrigatório. Attach/Detach: apenas o mestre da partida. Get: qualquer participante (mestre ou jogador com inscrição aceita).

### 4.5 Endpoints REST

#### `POST /matches/{match_id}/map`

```json
// Request
{ "map_id": "uuid" }

// Response 200
{ "match_map": { "match_id": "uuid", "map_id": "uuid", "attached_at": "..." } }
```

| Status | Situação |
|---|---|
| 200 | Mapa anexado (UPSERT — substitui se já havia um) |
| 401 | Sem JWT |
| 403 | Usuário não é o mestre |
| 404 | Partida ou mapa não encontrado |
| 422 | Partida já iniciada |
| 500 | Erro interno |

#### `GET /matches/{match_id}/map`

```json
// Response 200
{ "match_map": { "match_id": "uuid", "map_id": "uuid", "attached_at": "...", "map": { /* MapResponse completo */ } } }

// Response 204 — sem corpo
// Situação: nenhum mapa anexado (não é erro)
```

| Status | Situação |
|---|---|
| 200 | Mapa encontrado |
| 204 | Nenhum mapa anexado |
| 401 | Sem JWT |
| 403 | Acesso negado |
| 404 | Partida não encontrada |
| 500 | Erro interno |

#### `DELETE /matches/{match_id}/map`

| Status | Situação |
|---|---|
| 204 | Mapa desanexado |
| 401 | Sem JWT |
| 403 | Usuário não é o mestre |
| 404 | Partida ou mapa não encontrado |
| 422 | Partida já iniciada |
| 500 | Erro interno |

### 4.6 Lobby WS — `lobby_piece_moved`

O hub WS do lobby (`cmd/game/`) recebe um novo tipo de mensagem. O prefixo `lobby_` evita colisão com os futuros eventos in-game de movimento (Fase 7).

**Payload (client → server):**
```json
{
  "type": "lobby_piece_moved",
  "piece_id": "uuid",
  "slot": { "kind": "square", "col": 5, "row": 3 }
}
```

**Payload para hex:**
```json
{
  "type": "lobby_piece_moved",
  "piece_id": "uuid",
  "slot": { "kind": "hex", "q": 2, "r": -1 }
}
```

**Comportamento do backend:**
- Valida que o sender está na sala (garantido pelo hub existente).
- Faz broadcast para **todos exceto o sender** — sender já aplicou localmente.
- Sem validação de propriedade da peça nesta fase. `// TODO: validate piece ownership per user (Phase 7+)`

**Resposta de erro (sender recebe se sala não existir):**
```json
{ "type": "error", "detail": "lobby not found" }
```

### 4.7 Documentação

- `docs/dev/api/match-maps.md` — contrato REST completo (§4.5) + WS (§4.6)
- `docs/documentation-map.yaml` — registrar os novos endpoints

---

## 5. Frontend

### 5.1 Serviço e hooks

**`src/services/mapsService.ts`** — adicionar:

```ts
attachMatchMap: (token: string, matchId: string, mapId: string) => Promise<MatchMapResponse>
getMatchMap: (token: string, matchId: string) => Promise<MatchMapResponse | null>
detachMatchMap: (token: string, matchId: string) => Promise<void>
```

**`src/types/tacticalMap.ts`** — adicionar:

```ts
export type MatchMapResponse = {
  matchId: string;
  mapId: string;
  attachedAt: string;
  map?: TacticalMap; // incluído no GET
};
```

**Novos hooks React Query:**

```
src/hooks/
├── useMatchMap.ts          — GET /matches/:id/map (enabled: !!token && !!matchId)
├── useAttachMatchMap.ts    — mutation POST
└── useDetachMatchMap.ts    — mutation DELETE
```

Convenções padrão do projeto: `queryKey: ["match-map", matchId, token]`, `retry: 1`, `enabled: !!token && !!matchId`.

### 5.2 `MatchPage` — aba Mapas

A aba "Mapas" já existe (mostra `MapCard` dos mapas da campanha). Adicionar:

1. Query `useMatchMap(token, matchId)` para saber se já há mapa anexado.
2. Em cada `MapCard`, se o mapa for o atualmente anexado: badge "Anexado" + botão "Desanexar".
3. Se nenhum mapa estiver anexado: botão "Anexar" em cada card.
4. Attach/Detach habilitados apenas se `game_start_at IS NULL` (partida não iniciada).
5. Invalidar `["match-map", matchId]` após attach/detach.

### 5.3 `TacticalMapStage` — regra escoteiro

Adicionar prop:

```ts
draggablePieceIds?: Set<string>
// undefined = todos draggable (comportamento atual do editor)
// Set vazio = nenhuma peça é draggable (modo viewer puro — alternativa a piecesInteractive=false)
// Set com IDs = apenas essas peças são draggable
```

Em `PiecesLayer`, no handler de `pointerdown` de cada peça, verificar:

```ts
if (draggablePieceIds !== undefined && !draggablePieceIds.has(pieceId)) return;
```

O `TacticalMapEditor` passa `draggablePieceIds={undefined}` (todos draggable) — comportamento inalterado.

### 5.4 `useLobbyWs` — extensão

**Novas entradas (input do hook):**
```ts
onPieceMoved?: (pieceId: string, slot: SlotCoord) => void
```

**Novas saídas (retorno do hook):**
```ts
sendPieceMoved: (pieceId: string, slot: SlotCoord) => void
```

Implementação de `sendPieceMoved`: envia via a conexão WS existente o payload `lobby_piece_moved`. No-op se WS não estiver conectado.

Processamento de `lobby_piece_moved` recebido: chama `onPieceMoved?.(pieceId, slot)`.

### 5.5 `TacticalMapPlacer`

**Localização:** `src/features/tactical-map/TacticalMapPlacer.tsx`

**Props:**

```ts
type Props = {
  map: TacticalMap;
  campaignId: string;
  pieces: Piece[];                              // controlado pelo pai
  onPiecesChange: (pieces: Piece[]) => void;   // pai persiste o estado
  sendPieceMoved: (pieceId: string, slot: SlotCoord) => void;
  draggablePieceIds?: Set<string>;             // undefined = master (tudo); Set({id}) = player
};
```

**O que reusa (import direto, zero cópia):**
- `TacticalMapStage` — renderização + drag de peças
- `NpcRosterPanel` — barra lateral de personagens
- `useResizeObserver` — dimensões do canvas

**O que escreve (necessário):**
- `localPieces: Piece[]` — espelha `props.pieces` para render local imediato antes do WS round-trip
- Ghost de arrastar do roster → canvas: ~50 linhas, padrão idêntico ao `TacticalMapEditor`. Candidato a extração futura (`useRosterDrag`), mas aguarda um 3º consumidor (YAGNI).

**Fluxo de movimento de peça existente (drag no canvas):**

```
TacticalMapStage.onPieceMove(pieceId, slot)
  → placer: cria novas peças [prevPieces com peça atualizada]
  → onPiecesChange(newPieces)          // pai persiste
  → sendPieceMoved(pieceId, slot)      // WS
```

**Fluxo de adicionar peça do roster (mestre):**

```
NpcRosterPanel.onPointerDownNpc(npc)
  → placer: setPlacingNpcId + ghost
TacticalMapStage.onNpcPlaced(slot)
  → placer: cria nova Piece {id: crypto.randomUUID(), characterId: npc.uuid, ...}
  → onPiecesChange([...prevPieces, newPiece])
  → sendPieceMoved(newPiece.id, slot)  // WS — outros verão a peça aparecer
```

**Fluxo de remover peça (arrastar de volta ao roster — mestre):**

```
TacticalMapStage.onPieceDragToRoster(pieceId)
  → placer: filtra peça fora
  → onPiecesChange(filtered)
  // Remoção não tem `lobby_piece_removed` nesta fase —
  // TODO: adicionar message type `lobby_piece_removed` (Phase 7+)
  // Workaround: ao recarregar o lobby, pieces vêm do map.pieces (backend)
```

> **Limitação conhecida (Fase 6):** remoção de peça via roster não é sincronizada via WS — outros clientes não veem a remoção em tempo real. A peça desaparece para eles apenas se o lobby for recarregado. Documentado como `// TODO: add lobby_piece_removed WS event (Phase 7+)`. A adição e movimentação são sincronizadas.

**Layout do `TacticalMapPlacer`:**

```
┌─────────────────────────────────────────┐
│ canvas (TacticalMapStage)               │
│ width: 100% of container                │
│ height: 100% of container               │
└─────────────────────────────────────────┘
[NpcRosterPanel — apenas para master, draggablePieceIds === undefined]
```

O `NpcRosterPanel` é renderizado apenas quando `draggablePieceIds === undefined` (ou seja, quando é o mestre). Jogadores veem só o canvas.

**Conteúdo do roster no lobby:** igual ao editor — usa `useCampaignDetails(token, campaignId)` para mostrar todos os personagens da campanha (jogadores + NPCs). O mestre pode adicionar qualquer personagem da campanha, não apenas os inscritos na partida.

### 5.6 `LobbyPage` — integração do mapa

O lobby usa `DetailPageTemplate` (3 colunas). O mapa entra no **conteúdo central** (slot `children`), abaixo da seção de status do lobby.

**Estado adicional em `LobbyPage`:**

```ts
const { data: matchMap } = useMatchMap(token, matchId);
const [lobbyPieces, setLobbyPieces] = useState<Piece[]>([]);

// Inicializa pieces quando o mapa carrega (ou quando muda de mapa)
useEffect(() => {
  if (matchMap?.map) setLobbyPieces(matchMap.map.pieces);
}, [matchMap?.map?.id]);
```

**Callback para `onPieceMoved` do WS:**

```ts
const handleWsPieceMoved = useCallback((pieceId: string, slot: SlotCoord) => {
  setLobbyPieces(prev =>
    prev.map(p => p.id === pieceId ? { ...p, coord: { ...p.coord, slot } } : p)
  );
}, []);
```

**Passado para `useLobbyWs`:**

```ts
const { ..., sendPieceMoved } = useLobbyWs({
  ...
  onPieceMoved: handleWsPieceMoved,
});
```

**`draggablePieceIds` para cada usuário:**

```ts
const draggablePieceIds: Set<string> | undefined = isMaster
  ? undefined  // master: todos draggable
  : (() => {
      // jogador: apenas a peça do seu personagem inscrito
      const playerPiece = lobbyPieces.find(p =>
        enrollments.some(e =>
          e.player?.uuid === user?.uuid &&
          e.characterSheet.uuid === p.characterId
        )
      );
      return playerPiece ? new Set([playerPiece.id]) : new Set();
    })();
```

**Renderização do mapa no lobby:**

```tsx
{matchMap?.map && (
  <LobbyMapSection>
    <TacticalMapPlacer
      map={matchMap.map}
      campaignId={campaignId!}
      pieces={lobbyPieces}
      onPiecesChange={setLobbyPieces}
      sendPieceMoved={sendPieceMoved}
      draggablePieceIds={draggablePieceIds}
    />
  </LobbyMapSection>
)}
```

`LobbyMapSection`: styled div com altura fixa (ex: `min(60vh, 500px)`) para que o canvas tenha dimensões razoáveis dentro do layout 3 colunas. Sem alterar o `DetailPageTemplate`.

### 5.7 Save on StartMatch

O botão "Iniciar Partida" chama `sendStartMatch()` (via WS). Na Fase 6, esse botão é **wrappado** em `handleStartMatch`:

```ts
const handleStartMatch = async () => {
  if (matchMap?.map && lobbyPieces.length > 0) {
    try {
      await mapsService.updateMap(token!, matchMap.mapId, {
        pieces: lobbyPieces,
      });
    } catch {
      // Falha no save de peças — exibe erro e NÃO inicia a partida.
      // Posições erradas no GamePage são piores que não iniciar.
      setSaveError("Não foi possível salvar as posições. Tente novamente.");
      return;
    }
  }
  sendStartMatch();
};
```

**Limitação conhecida:** se o save `PUT /maps/:id` succeeds mas o `StartMatch` WS falhar, as posições já foram persistidas no mapa (mudança visível na próxima vez que alguém abrir o mapa no editor). Aceito para esta fase — pré-produção, sem usuários reais.

### 5.8 `GamePage`

**Carregamento do mapa:**

```ts
const { data: matchMap } = useMatchMap(token, matchId);   // GET /matches/:id/map
const { data: map } = useMap(token, matchMap?.mapId);     // GET /maps/:id
// useMap habilitado: !!token && !!matchMap?.mapId
```

**Layout — `GamePageTemplate`:**

```
┌─────────────────────────────┬──────────┐  ← 100vh
│                             │ Sidebar  │
│   TacticalMapViewer         │ Chars    │
│   (fills remaining width)   │ ──────── │
│                             │ [toggle] │
└─────────────────────────────┴──────────┘
```

- `GamePageTemplate.tsx`: **novo template**, não reutiliza `DetailPageTemplate`. Layout fundamentalmente diferente: sem `PageHeader`, sem header de página padrão — apenas canvas + sidebar flutuante/colapsável.
- Sidebar: `position: fixed` ou flex column; largura ~260px no desktop; colapsável via toggle.
- Mobile: sidebar fechada por padrão; botão flutuante no canto superior direito para abrir.
- Conteúdo da sidebar: lista de participantes (`useMatchParticipants`), badge de mestre.

**Sem mapa anexado:**

```tsx
// GamePage quando não há mapa (partida sem mapa):
<div>Partida em andamento — nenhum mapa anexado.</div>
```

**Sem mapa carregado (loading):**

```tsx
<LoadingContainer>Carregando mapa...</LoadingContainer>
```

**Com mapa:**

```tsx
<GamePageTemplate sidebar={<ParticipantsSidebar ... />}>
  <div ref={canvasRef} style={{ width: "100%", height: "100%" }}>
    {width > 0 && height > 0 && map && (
      <TacticalMapViewer map={map} width={width} height={height} />
    )}
  </div>
</GamePageTemplate>
```

---

## 6. Arquivos

### 6.1 Backend — novos

```
internal/domain/matchmap/entity/match_map.go
internal/application/matchmap/attach_match_map.go
internal/application/matchmap/get_match_map.go
internal/application/matchmap/detach_match_map.go
internal/gateway/pg/matchmap_repository.go
internal/app/api/matchmap/api.go
internal/app/api/matchmap/attach_match_map.go
internal/app/api/matchmap/get_match_map.go
internal/app/api/matchmap/detach_match_map.go
migrations/<timestamp>_create_match_maps.sql
docs/dev/api/match-maps.md
```

### 6.2 Backend — modificados

```
internal/app/api/api.go           — registrar matchmap.Api
cmd/game/hub.go (ou message.go)   — handler para lobby_piece_moved
docs/documentation-map.yaml       — registrar match-maps.md
```

### 6.3 Frontend — novos

```
src/features/tactical-map/TacticalMapPlacer.tsx
src/hooks/useMatchMap.ts
src/hooks/useAttachMatchMap.ts
src/hooks/useDetachMatchMap.ts
src/components/templates/GamePageTemplate.tsx
src/pages/GamePage.tsx              — substitui o placeholder
src/pages/__tests__/GamePage.test.tsx
```

### 6.4 Frontend — modificados

```
src/services/mapsService.ts        — + attachMatchMap, getMatchMap, detachMatchMap
src/types/tacticalMap.ts           — + MatchMapResponse
src/components/organisms/TacticalMapStage.tsx — + draggablePieceIds prop
src/pages/LobbyPage.tsx            — + mapa + WS pieces
src/pages/MatchPage.tsx            — + attach/detach UI na aba Mapas
src/hooks/useLobbyWs.ts            — + sendPieceMoved + onPieceMoved
src/pages/__tests__/LobbyPage.test.tsx
src/pages/__tests__/MatchPage.test.tsx
```

---

## 7. Testes

| Camada | O que testar | Como |
|---|---|---|
| `useMatchMap` | retorna null se 204; retorna MatchMapResponse se 200 | Vitest + msw |
| `useAttachMatchMap` | invalida query `match-map` no success | Vitest + msw |
| `TacticalMapPlacer` | render com pieces; drag chama onPiecesChange + sendPieceMoved | Testing Library + mock de TacticalMapStage |
| `useLobbyWs` | recebe `lobby_piece_moved` → chama onPieceMoved; sendPieceMoved envia mensagem | msw WS handler |
| `LobbyPage` | com mapa: renderiza TacticalMapPlacer; sem mapa: não renderiza | Testing Library + msw |
| `LobbyPage` handleStartMatch | com mapa: chama updateMap antes de sendStartMatch; se updateMap falha: não inicia | Testing Library + msw |
| `GamePage` | sem mapa: mensagem "nenhum mapa"; com mapa: renderiza TacticalMapViewer | Testing Library + msw |
| `MatchPage` aba Mapas | sem mapa anexado: botão "Anexar"; com mapa: badge + "Desanexar" | Testing Library + msw |
| **Backend** | attach/get/detach: status codes, auth, pré-condições (partida iniciada = 422) | `go test` unit + integration |
| **Backend WS** | lobby_piece_moved: broadcast para sala exceto sender | integration test com WS mock |

---

## 8. Critério de pronto

1. **Anexar mapa**: mestre acessa aba "Mapas" na `MatchPage`, clica "Anexar" num mapa — badge "Anexado" aparece; mapa persiste após reload.
2. **Lobby com mapa**: mestre e jogadores entram no lobby de uma partida com mapa anexado; o mapa aparece no conteúdo central com as peças do mapa.
3. **Sync de peças**: mestre arrasta uma peça → jogador conectado vê a peça mover em tempo real (< 1s). Jogador arrasta própria peça → mestre vê em tempo real.
4. **Save on start**: mestre inicia a partida → `PUT /maps/:id` é chamado com as posições atuais → `StartMatch` é enviado → todos navegam para GamePage.
5. **GamePage**: todos os participantes veem o mapa com as posições salvas; sidebar colapsável mostra participantes; em mobile, sidebar começa fechada.
6. **Sem mapa**: lobby e GamePage de partidas sem mapa não quebram — mostram mensagem adequada.

---

## 9. Limitações conhecidas e TODOs

| Limitação | Nota no código | Fase que resolve |
|---|---|---|
| Remoção de peça não sincronizada via WS | `// TODO: add lobby_piece_removed WS event` | Fase 7+ |
| Autorização de peça por jogador só no cliente | `// TODO: validate piece ownership per user` | Fase 7+ |
| Race condition save/StartMatch (ver §5.7) | Aceito — pré-produção | N/A |
| Botão voltar do navegador no lobby não guarda contra perda de posições | Limitação do BrowserRouter (mesma do NavGuard da Fase 5) | Data router |
| GamePage sem WS sync — mapa estático pós-início | Plano da Fase 7 | Fase 7 |

---

## 10. Decisões deste brainstorm

- **Novo `TacticalMapPlacer` (não reutilizar editor)**: o editor tem store Zustand com `isDirty`, undo/redo e save explícito — todos conflitam com o fluxo do lobby. Casca nova com `useState` mantém responsabilidade única.
- **Reuso máximo**: `TacticalMapPlacer` importa diretamente `TacticalMapStage`, `NpcRosterPanel` e `useResizeObserver` sem copiar. Ghost de roster é ~50 linhas duplicadas — candidato a `useRosterDrag` quando um 3º consumidor aparecer (YAGNI agora).
- **`draggablePieceIds` como prop do Stage (regra escoteiro)**: pequena melhoria que torna o Stage mais composável; editor passa `undefined` (comportamento inalterado).
- **`lobby_piece_moved` prefixo**: evita colisão com `piece_moved` in-game da Fase 7.
- **Broadcast excluindo sender**: sender já aplicou localmente; reincluir causaria double-update visual.
- **Remoção não sincronizada nesta fase**: adicionar `lobby_piece_removed` é trivial mas fora de escopo — priorizamos entregar o path principal (movimento) sem aumentar a surface de mudança no WS.
- **Save antes do StartMatch (frontend-driven)**: mais simples que modificar o handler do StartMatch no backend para receber e salvar posições. Race condition aceito em pré-produção.
- **GamePage com novo `GamePageTemplate`**: layout full-screen é fundamentalmente diferente de `DetailPageTemplate` (sem header de página, canvas ocupa tudo). Reutilizar forçaria overrides extensivos — template novo é mais limpo.
- **Mestre vs. jogador no lobby**: mestre passa `draggablePieceIds={undefined}` (todos); jogador passa `Set<string>` com o ID da própria peça. Se jogador não tiver peça no mapa, `Set` vazio (nada draggable).
- **`GET /matches/:id/map` retorna 204 (sem corpo) quando não há mapa**: não é erro, é estado válido. Front trata `null` graciosamente.
