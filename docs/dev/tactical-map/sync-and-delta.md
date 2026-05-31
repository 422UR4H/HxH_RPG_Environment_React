# Sync, WebSocket e deltas

> Como o mestre e os jogadores ficam alinhados em tempo real. Por que reaproveitamos `Action`/`MasterAction` em vez de inventar protocolo novo. O que é "delta" e por que ele é importante.

## O modelo: turn-based discreto, não streaming

A primeira ideia óbvia em multiplayer é: "toda mudança vai pela rede imediatamente". É como funciona um jogo de tiro online. Mas RPG é **turn-based** — as ações são discretas e pontuais. Não tem motivo pra mestre arrastar uma peça pro ajuste fino e cada pixel intermediário ir pela rede.

Nosso modelo:

```
Mestre edita rascunho local           ← nada vai pela rede
Mestre clica "Publicar movimento"     ← UMA mensagem WS sai
Backend valida + persiste + broadcast
Jogadores recebem + aplicam + animam
```

Resultado:

- Quase zero tráfego WS (uma mensagem por ação publicada)
- Mestre tem liberdade total no rascunho (até desfazer sem ninguém ver)
- Estado público dos jogadores muda só com intenção explícita

## Action e MasterAction — já existem no backend

Olhando o backend Go em `internal/domain/match/entity/action/`:

```go
// Action.go (já existe)
type Action struct {
  id           uuid.UUID
  actorID      uuid.UUID         // quem fez (jogador)
  TargetID     []uuid.UUID
  Move         *Move             // contém Position [3]int
  Attack       *Attack
  Defense      *Defense
  Dodge        *Dodge
  // ... lifecycle: openedAt, confirmedAt
}

// MasterAction.go (já existe)
type MasterAction struct {
  TargetID    []uuid.UUID
  Move        *Move
  Attack      *Attack
  ActionSpeed *RollCheck
  happenedAt  time.Time
}

// Turn.go agrega
type Turn struct {
  action        Action
  reactions     []Action
  masterActions []MasterAction
  finishedAt    *time.Time
}
```

E o `Move` tem o famoso `Position [3]int` que vocês (o mestre da casa) deixaram ambíguo de propósito — funciona pra `(col, row, z)` ou `(q, r, z)` dependendo do contexto.

**O insight**: essas entidades **já são o nosso delta**. Quando o mestre publica "movi a peça p1 pra (6, 5)", o que vai pela rede é literalmente um `MasterAction.Move{ Position: [6, 5, 0] }` (mais o `piece_id` e `slot_kind`). Quando o backend persiste isso no `Turn` ou `Round` apropriado, ele **automaticamente cria o histórico**. Quando broadcasta pros outros, é a mesma estrutura.

Uma representação, três usos:
- **Comunicação WS** (mestre → server → jogadores)
- **Persistência** (no banco, dentro do Turn)
- **Replay / histórico** (replay das actions reconstrói o estado)

Por isso a decisão: **não inventamos um "protocolo de delta" separado**. Reusamos o que já existe.

## "Delta" — em palavras simples

**Delta** = a diferença entre dois estados. Se o estado é o mapa antes da ação e depois, o delta descreve só o que mudou — não o mapa inteiro.

Comparação prática:

```jsonc
// Mestre move uma peça de (5,5) pra (6,5).

// ❌ Sem delta: 3KB pela rede
{
  "name": "Floresta da Morte",
  "grid": { /* tudo */ },
  "bg": { /* tudo */ },
  "pieces": [
    { "id": "p1", "characterId": "...", "coord": { "slot": {"col": 6, "row": 5}, "z": 0 } },
    { "id": "p2", "characterId": "...", "coord": { "slot": {"col": 7, "row": 3}, "z": 2 } }
  ],
  "walls": [],
  "decorations": [],
  "items": []
}

// ✅ Com delta: 40 bytes
[
  { "op": "replace", "path": "/pieces/0/slot/col", "value": 6 }
]
```

40 bytes em 3G no celular = milissegundos. 3KB = engasgo.

## JSON Patch (RFC 6902)

O formato padrão de delta. Cada operação é um objeto pequeno:

| Operação | Pra quê | Exemplo |
|---|---|---|
| `replace` | Troca um valor existente | `{ "op": "replace", "path": "/pieces/0/visible", "value": true }` |
| `add` | Adiciona em array ou objeto | `{ "op": "add", "path": "/pieces/-", "value": {...nova peça...} }` |
| `remove` | Remove um caminho | `{ "op": "remove", "path": "/pieces/0" }` |
| `move`, `copy`, `test` | Menos comuns | (raramente usados pra delta de UI) |

`-` em `/pieces/-` significa "append" — adiciona no fim do array. `/pieces/0` é o primeiro item.

## immer gera o JSON Patch — você não monta na mão

Aqui o immer brilha. Quando você usa `produce` numa action do Zustand, ele pode gerar o patch automaticamente:

```ts
import { produceWithPatches } from 'immer';

const [nextState, patches, inversePatches] = produceWithPatches(currentState, draft => {
  draft.pieces[0].coord.slot.col = 6;
});

// patches = [{ op: "replace", path: ["pieces", 0, "coord", "slot", "col"], value: 6 }]
// inversePatches = [{ op: "replace", path: [...], value: 5 }]  ← reverte
```

Quando vamos publicar a mudança via WS, **mandamos a `MasterAction` (representação semântica) — não o patch cru.** O patch fica útil internamente: pra fazer reconciliação local, pra undo, pra auditoria.

## Fluxo prático — Fase 7

```
1. Mestre move uma peça no rascunho
   → store.movePiece(pieceId, slot) → estado local atualiza
   → renderiza no Pixi → mestre vê

2. Mestre clica "Publicar"
   → frontend serializa como MasterAction.Move com piece_id + slot_kind + from + to
   → manda via WebSocket: { type: "master_action_executed", payload: {...} }

3. Backend recebe
   → valida (mestre da partida? mapa anexado? slot dentro do grid?)
   → instancia MasterAction e adiciona ao Round (ou Turn, se marcado)
   → broadcasta pra todos da sala: { type: "master_action_broadcast", payload: {...} }

4. Jogadores recebem
   → useMatchMapWs.ts decodifica a MasterAction
   → aplica via immer no store local (gera patch implícito)
   → Pixi anima a transição A→B em ~300ms (lerp)
```

## Hook `useMatchMapWs.ts`

Análogo a `useLobbyWs` que você já conhece:

```ts
export function useMatchMapWs(opts: {
  matchUuid: string;
  token: string;
  enabled: boolean;
  onMasterAction: (ma: MasterAction) => void;
}) {
  // monta WebSocket; reconnect com backoff; map_full_state ao reconectar
  // chama opts.onMasterAction pra cada master_action_broadcast recebida
}
```

E o componente `TacticalMapViewer` consome:

```tsx
useMatchMapWs({
  matchUuid: match.uuid,
  token,
  enabled: !!token,
  onMasterAction: (ma) => applyMasterActionToStore(ma),
});
```

## Reconexão — `map_full_state`

WebSocket é frágil. Mobile com 3G perde conexão a toda hora. Estratégia:

1. Cliente detecta desconexão
2. Reconnect com backoff (1s, 2s, 4s, 8s, max 30s)
3. Ao reconectar, **servidor envia `map_full_state`** — o estado completo do mapa naquele instante
4. Cliente substitui o estado local pelo full state
5. Volta a receber broadcasts normalmente

Vantagem: a gente nunca acumula "delta divergente" — se algo der errado, o full state corrige.

## Visibilidade — Fase 7

`Piece.visible: boolean` no modelo. Mestre pode "ocultar" uma peça (NPC escondido, emboscada). Quando `visible = false`:

- **Mestre vê a peça** com indicador de "oculta" (ícone, opacidade reduzida)
- **Jogadores não veem** (peça é filtrada antes de renderizar)

Cuidado de segurança: **o filtro acontece no backend**. Mestre não tem como acidentalmente vazar uma peça oculta pelo cliente; o servidor envia, pra cada jogador, apenas peças visíveis a ele. Quando a feature avançar pra "visibilidade por jogador" (`visibleTo: 'all' | UserId[]`), mesmo princípio.

## Sobre `slot_kind` no payload

O backend tem `Move.Position [3]int` — não sabe se `[5, 3, 0]` significa `(col=5, row=3, z=0)` ou `(q=5, r=3, z=0)`. Foi deliberado pelo design do mestre (ele leu RedBlobGames antes).

Resolução no payload WS: campo `slot_kind` explícito.

```json
{
  "type": "master_action_executed",
  "payload": {
    "kind": "move_piece",
    "piece_id": "...",
    "from": { "slot_kind": "square", "x": 5, "y": 3, "z": 0 },
    "to":   { "slot_kind": "square", "x": 6, "y": 3, "z": 0 }
  }
}
```

Backend lê `slot_kind`, interpreta os 3 inteiros corretamente, persiste como `Move.Position [3]int` (mantendo `slot_kind` em campo auxiliar pra deserialização posterior).

## Variantes novas de `MasterAction` na Fase 7

O `MasterAction` hoje tem `Move`, `Attack`, `Skills`, `ActionSpeed`. Falta:

| Variante | Pra quê | Payload simplificado |
|---|---|---|
| `AddPiece` | Mestre coloca peça em jogo | `{ character_id, coord, z, visible }` |
| `RemovePiece` | Mestre tira peça | `{ piece_id }` |
| `SetVisibility` | Revela/oculta peça | `{ piece_id, visible }` |

Modelagem no Go: provavelmente um campo `*AddPieceOp`, `*RemovePieceOp`, `*SetVisibilityOp` na struct `MasterAction`. Detalhe da implementação fica pro plan da Fase 7.

## MasterAction: `Round` vs `Turn` — relembrar

(Detalhado no spec mestre.)

- **`Round`-level (default)**: ações gerais do mestre (`AddPiece`, `RemovePiece`, `SetVisibility`, `Move` de NPC).
- **`Turn`-level (explícito)**: quando a ação acontece dentro de um turno específico. Mestre marca no frontend; backend confia.

Quando o frontend manda, inclui no payload qual será (`scope: 'round' | 'turn'`).

## Action override — NÃO é MasterAction

Importante reforçar (porque é fácil confundir):

> **Modificar a `Action` de um jogador** (mestre ajusta roll, penaliza após narração) é um fluxo **separado**. Vira uma nova `Action` modificada, vinculada à original. NÃO vira `MasterAction`.

Esse fluxo não existe ainda no backend. É clean slate quando a hora chegar.

## Limites do modelo turn-based

- **Não funciona pra ações simultâneas em tempo real** (ex: 2 jogadores se movem ao mesmo tempo no ataque). Se isso surgir como necessidade, esticamos pra fila com ordenação por timestamp do servidor.
- **Mestre pode "engasgar" os jogadores** se não publicar nada por muito tempo. Solução é UX (notificar quando mestre está ausente), não técnica.

## Referências

- JSON Patch (RFC 6902): [tools.ietf.org/html/rfc6902](https://tools.ietf.org/html/rfc6902)
- immer `produceWithPatches`: [immerjs.github.io/immer/patches](https://immerjs.github.io/immer/patches)
- Padrão de Action no backend: `internal/domain/match/entity/action/` no repo Go
