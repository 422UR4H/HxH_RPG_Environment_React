# Elevação da peça pelo WebSocket (frontend) — Plano

> **Para quem implementa:** execute tarefa por tarefa, na ordem. Leia a seção de contexto
> inteira — ela tem uma armadilha que não dá erro nenhum e some só em produção.

**Desenho de referência (leia antes de começar):**
`System_X_System/docs/superpowers/plans/2026-08-05-rest-map-board-leak.md` (repo do
backend) — a seção "O fato de arquitetura que decide tudo" explica por que a correção é
essa e não outra.

**Pré-requisito obrigatório:** o plano do backend precisa estar **concluído e commitado**
antes de começar aqui. Ele é quem coloca `z` no payload WS; sem isso este plano lê um
campo que não existe.

**Objetivo:** o cliente passa a receber a elevação da peça pelo WebSocket, em vez de
recuperá-la do mapa REST — que para jogadores passou a vir sem peça alguma.

**Branch:** `fix/rest-map-board-leak` (já criada)

**Arquivos:**
- Modificar: `src/hooks/useMatchWs.ts`
- Modificar: `src/hooks/useLobbyWs.ts`
- Modificar: `src/pages/GamePage.tsx`
- Modificar: `src/hooks/__tests__/useMatchWs.test.ts`

---

## Contexto que você precisa antes de escrever qualquer linha

### 1. São DOIS hooks que trafegam peça, não um

`useMatchWs.ts` e `useLobbyWs.ts` **ambos** serializam e desserializam peças, cada um com
sua própria cópia da conversão:

- `useMatchWs.ts` — `toPiecePayload` (envio) e `fromPiecePayload` (recebimento)
- `useLobbyWs.ts` — `sendPieceMoved` (envio) e o `case "piece_moved"` (recebimento)

**As quatro precisam mudar.** Mexer em só uma faz a elevação funcionar numa fase e zerar
na outra — sem erro no console, sem teste vermelho. A peça simplesmente vai pro chão
quando alguém a move, ou quando a partida começa.

### 2. `z` já existe no domínio do front, só não estava no fio

`PieceCoord` em `src/types/tacticalMap.ts` já é `{ slot: SlotCoord; z: number }` —
comentado como "altura virtual em metros; 0 = chão". Você não está criando conceito novo,
está parando de perdê-lo na fronteira HTTP/WS.

### 3. O backend omite `z` quando é 0

O campo é `json:"z,omitempty"`, então `z: 0` **não chega no JSON**. Ausência significa
chão. Trate com `?? 0`, nunca assuma que o campo está presente.

### 4. `visibleBoardPieces` continua existindo — não desfaça

`src/features/tactical-map/utils/boardSource.ts` é a trava do lado do cliente: mesmo com o
backend corrigido, o front não cai no payload REST para montar o tabuleiro do jogador. As
duas defesas são de camadas diferentes e ficam as duas. **Não remova.**

---

## Task 1: elevação no `useMatchWs`

**Arquivos:** `src/hooks/useMatchWs.ts`

- [ ] **Passo 1: enviar `z`**

Em `toPiecePayload`, acrescente o campo:

```ts
function toPiecePayload(p: Piece) {
  const slot = p.coord.slot;
  return {
    piece_id: p.id,
    slot:
      slot.kind === "square"
        ? { kind: "square", col: slot.col, row: slot.row }
        : { kind: "hex", q: slot.q, r: slot.r },
    character_id: p.characterId,
    visible: p.visible,
    z: p.coord.z,
  };
}
```

- [ ] **Passo 2: receber `z`**

O tipo do fio e a conversão passam a carregar elevação. Note que o **comentário muda**: a
frase "`z` is not on the wire" deixou de ser verdade e precisa sair, senão vira mentira
que o próximo leitor acredita.

```ts
/** A piece exactly as the game server serializes it (flat, snake_case). */
type WirePiece = {
  piece_id: string;
  slot: SlotCoord;
  character_id?: string;
  visible?: boolean;
  z?: number;
};

/**
 * Wire → domain. The server's piece shape is NOT the frontend's: it is flat
 * (`piece_id`/`slot`) while `Piece` nests the slot under `coord`. Handing the raw
 * payload to the renderer makes it read `piece.coord.slot` off `undefined` and crash
 * the whole Pixi tree.
 *
 * `z` is omitted by the server when it is 0, so absence means "on the ground".
 */
function fromPiecePayload(w: WirePiece): Piece {
  return {
    id: w.piece_id,
    characterId: w.character_id ?? "",
    coord: { slot: w.slot, z: w.z ?? 0 },
    visible: w.visible ?? true,
  };
}
```

---

## Task 2: elevação no `useLobbyWs`

**Arquivos:** `src/hooks/useLobbyWs.ts`

- [ ] **Passo 1: enviar `z`**

`sendPieceMoved` recebe hoje `(pieceId, slot, characterId?, visible?)`. Acrescente a
elevação como último parâmetro **opcional**, para não quebrar os chamadores existentes:

```ts
  const sendPieceMoved = useCallback(
    (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean, z?: number) => {
      const slotPayload =
        slot.kind === "square"
          ? { kind: "square", col: slot.col, row: slot.row }
          : { kind: "hex", q: slot.q, r: slot.r };
      sendMessage("piece_moved", {
        piece_id: pieceId,
        slot: slotPayload,
        ...(characterId != null && { character_id: characterId }),
        ...(visible != null && { visible }),
        ...(z != null && { z }),
      });
    },
    [sendMessage],
  );
```

- [ ] **Passo 2: receber `z`**

No `case "piece_moved"`, acrescente `z?: number` ao tipo inline do payload e propague-o
para onde a peça é montada. **Leia o corpo do case inteiro antes de editar** — ele monta o
`SlotCoord` com validação por `kind`, e você só precisa acrescentar a elevação ao objeto
final, sem tocar nessa validação.

- [ ] **Passo 3: encontrar os chamadores e passar a elevação**

```bash
grep -rn "sendPieceMoved" src/ | grep -v node_modules
```

Em cada chamador que tenha a peça em mãos, passe `piece.coord.z`. Onde a elevação não
existir no contexto, deixe sem — o parâmetro é opcional e o servidor trata ausência
como 0.

---

## Task 3: `GamePage` para de remendar a elevação

**Arquivos:** `src/pages/GamePage.tsx`

- [ ] **Passo 1: remover o remendo**

`handleMapFullState` hoje reconstrói `z` a partir do mapa REST. Esse era o remendo que só
funcionava porque o REST mandava as peças — e agora, para jogador, não manda mais.

Substitua o corpo por:

```tsx
  const handleMapFullState = useCallback((s: {
    pieces: Piece[]; walls: WallSegment[];
    visiblePolygons: Array<Array<[number, number]>>;
    fogMode: "live" | "explored";
  }) => {
    setLiveWalls(s.walls);
    setLivePieces(s.pieces);
    setFog({ fogMode: s.fogMode, visiblePolygons: s.visiblePolygons });
  }, []);
```

> A dependência `[map]` **sai junto**: ela só existia por causa do `zById`. Confirme que
> nada mais no corpo usa `map` antes de esvaziar o array.

- [ ] **Passo 2: typecheck**

```bash
npm run build 2>&1 | tail -20
```

---

## Task 4: testes

**Arquivos:** `src/hooks/__tests__/useMatchWs.test.ts`

- [ ] **Passo 1: acrescentar ao `describe("useMatchWs fog events", …)`**

```ts
  it("carries piece elevation in from the wire", () => {
    const onMapFullState = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onMapFullState }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("map_full_state", {
        pieces: [
          { piece_id: "high", slot: { kind: "square", col: 1, row: 1 }, character_id: "c", z: 3 },
          { piece_id: "ground", slot: { kind: "square", col: 2, row: 2 }, character_id: "c" },
        ],
        walls: [], visible_polygons: [], fog_mode: "explored",
      });
    });

    const pieces = onMapFullState.mock.calls[0][0].pieces;
    // The server used to send no elevation at all and the page patched it back in from
    // the REST map. That map no longer carries pieces for a player, so a dropped z here
    // means every piece silently sits on the ground.
    expect(pieces[0].coord.z).toBe(3);
    // Omitted by the server when it is 0 — absence means ground, not "unknown".
    expect(pieces[1].coord.z).toBe(0);
  });
```

- [ ] **Passo 2: acrescentar ao `describe("useMatchWs board sync", …)`**

```ts
  it("sends piece elevation so the server can hand it back", () => {
    const elevated: MatchBoardSync = {
      ...board,
      pieces: [{ ...piece, coord: { ...piece.coord, z: 2 } }],
    };
    const { rerender } = renderHook(
      (props: { board: MatchBoardSync | null }) =>
        useMatchWs({ matchUuid: "m1", token: "t", isMaster: true, board: props.board }),
      { initialProps: { board: elevated } },
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    rerender({ board: elevated });

    const syncs = syncPayloads(ws);
    expect(syncs[syncs.length - 1].pieces[0].z).toBe(2);
  });
```

- [ ] **Passo 3: rodar**

```bash
npm test -- useMatchWs
```

Esperado: PASS. Se falhar por `z` ausente, a Task 1 ficou pela metade.

---

## Verificação final

```bash
npm run build
npx eslint src/hooks/useMatchWs.ts src/hooks/useLobbyWs.ts src/pages/GamePage.tsx
npm test
```

Esperado: build limpo; eslint sem issues nesses arquivos; suíte passando **exceto** a
falha pré-existente em `NpcRosterPanel`, que já falhava antes desta branch.

> `npm run lint` no repo inteiro reporta ~120 erros pré-existentes de baseline — por isso
> lintamos só o que tocamos.

### Verificação visual (obrigatória pelo `CLAUDE.md` da raiz)

```bash
./dev-checkout.sh fix/rest-map-board-leak   # a partir de System_X_System_Project/
```

Duas janelas, mesma partida, uma como mestre e outra como jogador:

- [ ] O jogador continua vendo o tabuleiro normalmente (peças e paredes na LOS, fog liso).
- [ ] Uma peça com elevação > 0 continua desenhada elevada para o **jogador** — não só
      para o mestre. Se achatou no chão, a elevação está se perdendo em algum dos quatro
      pontos de conversão.
- [ ] Mover uma peça mantém a elevação dela.
- [ ] O mestre continua vendo tudo.

### Prova de que o vazamento fechou

Com o token de um **jogador**, no devtools ou no terminal:

```bash
curl -s -H "Authorization: Bearer $PLAYER_TOKEN" http://localhost:5000/maps/$MAP_ID | python3 -m json.tool | head -30
```

`pieces` e `walls` devem vir `[]`. Era isto o que o jogador conseguia ler antes.
