# Tactical Map — Fase 4: Editor de Peças (NPCs)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar a aba "Peças" do editor de mapa: o mestre pode arrastar ou clicar NPCs do roster para slots na grade, mover peças, ajustar altura Z (collapsible), e remover do mapa — com visual gungi (círculo colorido + avatar + SVG frame + sombra circular correta).

**Architecture:** Dois novos componentes React (`NpcRosterPanel`, `PiecePropertyPanel`) tratam a UI do sidebar. O `PieceSprite` no Pixi é reescrito com sombra circular correta, máscara de avatar, frame gungi e anel de seleção. O `TacticalMapEditor` gerencia `placingNpcId` e `isDraggingPieceToRoster` como estado local (não persistido); a store já tem todas as ações (`placePiece`, `movePiece`, etc.). O drag dentro do canvas usa pointer events imperativo via refs para manter 60fps.

**Tech Stack:** React 18, TypeScript strict, PixiJS v8, @pixi/react v8, pixi-viewport v6, Zustand + zundo + immer (já existente), styled-components, React Query, Vitest + Testing Library + MSW.

**Spec:** `docs/superpowers/specs/2026-06-01-tactical-map-fase-4-design.md`

---

## File Structure

**Criar:**
- `src/components/molecules/NpcRosterPanel.tsx` — lista NPCs disponíveis, busca, zona de drop
- `src/components/molecules/__tests__/NpcRosterPanel.test.tsx`
- `src/components/molecules/PiecePropertyPanel.tsx` — painel seleção: nome, Z collapsible, remover
- `src/components/molecules/__tests__/PiecePropertyPanel.test.tsx`

**Modificar:**
- `src/test/fixtures/campaign.ts` — adicionar `npcFixture`, `playerSheetFixture`, `campaignWithNpcs`
- `src/components/organisms/TacticalMapStage.tsx` — reescrever `PieceSprite`; novos props para interação
- `src/components/organisms/MapEditorToolbar.tsx` — habilitar aba Peças, novos props, render dos painéis
- `src/features/tactical-map/TacticalMapEditor.tsx` — estado local de placing/drag, orquestração

---

## Task 1: Adicionar fixtures de NPC e peça

**Files:**
- Modify: `src/test/fixtures/campaign.ts`
- Modify: `src/test/fixtures/map.ts`

- [ ] **Step 1: Adicionar npcFixture, playerSheetFixture e pieceFixture**

Em `src/test/fixtures/campaign.ts`, adicione logo após os imports existentes:

```ts
import type { CharacterPrivateSummary } from "../../types/characterSheet";

const baseSheet: Omit<CharacterPrivateSummary, "uuid" | "playerUuid" | "nickName"> = {
  fullName: "Nome Completo",
  alignment: "Neutro",
  characterClass: "Transmutador",
  birthday: "1990-01-01",
  categoryName: "Transmutação",
  level: 5,
  points: 100,
  currExp: 200,
  nextLvlBaseExp: 500,
  talentLvl: 3,
  physicalsLvl: 4,
  mentalsLvl: 4,
  spiritualsLvl: 3,
  skillsLvl: 2,
  stamina: { min: 0, current: 80, max: 100 },
  health: { min: 0, current: 90, max: 100 },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

export const npcFixture: CharacterPrivateSummary = {
  ...baseSheet,
  uuid: "npc-1",
  playerUuid: undefined,   // undefined = NPC
  nickName: "Soldado Zoldyck",
};

export const npc2Fixture: CharacterPrivateSummary = {
  ...baseSheet,
  uuid: "npc-2",
  playerUuid: undefined,
  nickName: "Guarda Kiriko",
};

export const playerSheetFixture: CharacterPrivateSummary = {
  ...baseSheet,
  uuid: "player-1",
  playerUuid: "user-player-1", // defined = player character
  nickName: "Gon Freecss",
};

export const campaignWithNpcs = (
  npcs: CharacterPrivateSummary[],
  players: CharacterPrivateSummary[] = [],
): CampaignMaster => ({
  ...campaignFixture,
  characterSheets: [...npcs, ...players],
});
```

Em `src/test/fixtures/map.ts`, adicione após o `mapFixture`:

```ts
import type { Piece } from "../../types/tacticalMap";

export const pieceFixture: Piece = {
  id: "piece-1",
  characterId: "npc-1",
  coord: { slot: { kind: "square", col: 2, row: 3 }, z: 0 },
  visible: true,
};

export const mapWithPieces = (pieces: Piece[]) => ({
  ...mapFixture,
  pieces,
});
```

- [ ] **Step 2: Verificar que as fixtures compilam**

```bash
cd System_X_System_React && npm run build 2>&1 | tail -20
```

Esperado: sem erros de tipo nos fixtures.

- [ ] **Step 3: Commit**

```bash
git add src/test/fixtures/campaign.ts src/test/fixtures/map.ts
git commit -m "test: add NPC, player sheet, and piece fixtures for fase 4"
```

---

## Task 2: NpcRosterPanel — componente e testes

**Files:**
- Create: `src/components/molecules/NpcRosterPanel.tsx`
- Create: `src/components/molecules/__tests__/NpcRosterPanel.test.tsx`

- [ ] **Step 1: Escrever o teste (failing)**

```tsx
// src/components/molecules/__tests__/NpcRosterPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "../../../test/render";
import NpcRosterPanel from "../NpcRosterPanel";
import {
  npcFixture,
  npc2Fixture,
  playerSheetFixture,
  campaignWithNpcs,
} from "../../../test/fixtures/campaign";
import { server } from "../../../test/server";

const noop = vi.fn();
const baseProps = {
  campaignId: "campaign-1",
  placedCharacterIds: new Set<string>(),
  placingNpcId: null,
  isDropTarget: false,
  onPointerDownNpc: noop,
};

beforeEach(() => {
  server.use(
    http.get("http://localhost:5000/campaigns/:id", () =>
      HttpResponse.json({
        campaign: campaignWithNpcs([npcFixture, npc2Fixture], [playerSheetFixture]),
      }),
    ),
  );
});

describe("NpcRosterPanel — lista", () => {
  it("exibe apenas NPCs (não jogadores)", async () => {
    renderWithProviders(<NpcRosterPanel {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("Soldado Zoldyck")).toBeInTheDocument();
      expect(screen.getByText("Guarda Kiriko")).toBeInTheDocument();
    });
    expect(screen.queryByText("Gon Freecss")).not.toBeInTheDocument();
  });

  it("não exibe NPCs já colocados no campo", async () => {
    renderWithProviders(
      <NpcRosterPanel
        {...baseProps}
        placedCharacterIds={new Set(["npc-1"])}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Guarda Kiriko")).toBeInTheDocument();
    });
    expect(screen.queryByText("Soldado Zoldyck")).not.toBeInTheDocument();
  });

  it("campo de busca filtra por nickName (case-insensitive)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NpcRosterPanel {...baseProps} />);
    await waitFor(() => screen.getByText("Soldado Zoldyck"));
    await user.type(screen.getByPlaceholderText(/buscar/i), "kiriko");
    expect(screen.getByText("Guarda Kiriko")).toBeInTheDocument();
    expect(screen.queryByText("Soldado Zoldyck")).not.toBeInTheDocument();
  });

  it("dispara onPointerDownNpc ao pressionar card do NPC", async () => {
    const onPointerDownNpc = vi.fn();
    renderWithProviders(
      <NpcRosterPanel {...baseProps} onPointerDownNpc={onPointerDownNpc} />,
    );
    await waitFor(() => screen.getByText("Soldado Zoldyck"));
    const card = screen.getByTestId("npc-card-npc-1");
    card.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onPointerDownNpc).toHaveBeenCalledWith(
      npcFixture,
      expect.any(Object),
    );
  });

  it("isDropTarget adiciona borda laranja na área", async () => {
    renderWithProviders(<NpcRosterPanel {...baseProps} isDropTarget={true} />);
    await waitFor(() => screen.getByText("Soldado Zoldyck"));
    expect(screen.getByTestId("npc-roster-drop-zone")).toHaveAttribute(
      "data-drop-target",
      "true",
    );
  });
});
```

- [ ] **Step 2: Executar o teste — deve falhar**

```bash
npx vitest run src/components/molecules/__tests__/NpcRosterPanel.test.tsx 2>&1 | tail -20
```

Esperado: FAIL — `Cannot find module '../NpcRosterPanel'`

- [ ] **Step 3: Implementar NpcRosterPanel**

```tsx
// src/components/molecules/NpcRosterPanel.tsx
import { useState } from "react";
import styled from "styled-components";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import { useToken } from "../../contexts/TokenContext";
import { useCampaignDetails } from "../../hooks/useCampaignDetails";
import CharacterSidebarItem from "./CharacterSidebarItem";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  campaignId: string;
  placedCharacterIds: Set<string>;
  placingNpcId: string | null;
  isDropTarget: boolean;
  onPointerDownNpc: (npc: CharacterPrivateSummary, e: React.PointerEvent) => void;
};

export default function NpcRosterPanel({
  campaignId,
  placedCharacterIds,
  placingNpcId,
  isDropTarget,
  onPointerDownNpc,
}: Props) {
  const { token } = useToken();
  const { data: campaign } = useCampaignDetails(token, campaignId);
  const [search, setSearch] = useState("");

  const npcs = (campaign?.characterSheets ?? []).filter((cs) => !cs.playerUuid);
  const available = npcs.filter(
    (npc) =>
      !placedCharacterIds.has(npc.uuid) &&
      npc.nickName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DropZone
      data-testid="npc-roster-drop-zone"
      data-drop-target={isDropTarget ? "true" : "false"}
      $isDropTarget={isDropTarget}
    >
      <SearchInput
        placeholder="Buscar NPC..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <List>
        {available.map((npc) => (
          <CardWrapper
            key={npc.uuid}
            data-testid={`npc-card-${npc.uuid}`}
            $isPlacing={placingNpcId === npc.uuid}
            onPointerDown={(e) => onPointerDownNpc(npc, e)}
          >
            <CharacterSidebarItem
              character={npc}
              isMaster={true}
              onClick={() => {}}
            />
          </CardWrapper>
        ))}
        {available.length === 0 && (
          <EmptyHint>
            {npcs.length === 0 ? "Nenhum NPC na campanha." : "Todos os NPCs estão no campo."}
          </EmptyHint>
        )}
      </List>
    </DropZone>
  );
}

const DropZone = styled.div<{ $isDropTarget: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 2px solid ${({ $isDropTarget }) => ($isDropTarget ? colors.brandAccent : "transparent")};
  border-radius: 6px;
  background: ${({ $isDropTarget }) => ($isDropTarget ? `${colors.brandAccent}0d` : "transparent")};
  transition: border-color 0.15s, background 0.15s;
`;

const SearchInput = styled.input`
  font-family: ${fonts.sans};
  font-size: 12px;
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 5px;
  padding: 5px 8px;
  margin-bottom: 6px;
  outline: none;
  width: 100%;

  &::placeholder {
    color: ${colors.textPlaceholder};
  }
  &:focus {
    border-color: ${colors.brandAccentBright};
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
`;

const CardWrapper = styled.div<{ $isPlacing: boolean }>`
  border-radius: 6px;
  border: 2px solid ${({ $isPlacing }) => ($isPlacing ? colors.brandAccent : "transparent")};
  cursor: grab;
  touch-action: none;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${colors.brandAccent};
  }
  &:active {
    cursor: grabbing;
  }
`;

const EmptyHint = styled.p`
  font-family: ${fonts.sans};
  font-size: 11px;
  color: ${colors.textPlaceholder};
  text-align: center;
  padding: 16px 0;
`;
```

- [ ] **Step 4: Executar o teste — deve passar**

```bash
npx vitest run src/components/molecules/__tests__/NpcRosterPanel.test.tsx
```

Esperado: todos os testes PASS.

- [ ] **Step 5: Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

Esperado: nenhum erro.

- [ ] **Step 6: Commit**

```bash
git add src/components/molecules/NpcRosterPanel.tsx \
        src/components/molecules/__tests__/NpcRosterPanel.test.tsx
git commit -m "feat(pieces): NpcRosterPanel com busca, drop zone e filtro de colocados"
```

---

## Task 3: PiecePropertyPanel — componente e testes

**Files:**
- Create: `src/components/molecules/PiecePropertyPanel.tsx`
- Create: `src/components/molecules/__tests__/PiecePropertyPanel.test.tsx`

- [ ] **Step 1: Escrever o teste (failing)**

```tsx
// src/components/molecules/__tests__/PiecePropertyPanel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/render";
import PiecePropertyPanel from "../PiecePropertyPanel";
import { npcFixture } from "../../../test/fixtures/campaign";
import { pieceFixture } from "../../../test/fixtures/map";

const baseProps = {
  piece: pieceFixture,
  npc: npcFixture,
  onZChange: vi.fn(),
  onRemove: vi.fn(),
};

describe("PiecePropertyPanel", () => {
  it("exibe o nome do NPC", () => {
    renderWithProviders(<PiecePropertyPanel {...baseProps} />);
    expect(screen.getByText("Soldado Zoldyck")).toBeInTheDocument();
  });

  it("Z slider está dentro do collapsible (fechado por padrão)", () => {
    renderWithProviders(<PiecePropertyPanel {...baseProps} />);
    const details = screen.getByTestId("mais-configs");
    expect(details).not.toHaveAttribute("open");
    // slider deve existir mas não ser visível enquanto fechado
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("slider chama onZChange ao mudar valor", async () => {
    const user = userEvent.setup();
    const onZChange = vi.fn();
    renderWithProviders(
      <PiecePropertyPanel {...baseProps} onZChange={onZChange} />,
    );
    const details = screen.getByTestId("mais-configs");
    // abrir collapsible
    await user.click(within(details).getByRole("button", { name: /mais configurações/i }));
    const slider = screen.getByRole("slider");
    await user.type(slider, "{ArrowRight}");
    expect(onZChange).toHaveBeenCalled();
  });

  it("botão Remover chama onRemove", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithProviders(<PiecePropertyPanel {...baseProps} onRemove={onRemove} />);
    await user.click(screen.getByRole("button", { name: /remover do mapa/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Executar o teste — deve falhar**

```bash
npx vitest run src/components/molecules/__tests__/PiecePropertyPanel.test.tsx 2>&1 | tail -10
```

Esperado: FAIL — `Cannot find module '../PiecePropertyPanel'`

- [ ] **Step 3: Implementar PiecePropertyPanel**

```tsx
// src/components/molecules/PiecePropertyPanel.tsx
import styled from "styled-components";
import type { Piece } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  piece: Piece;
  npc: CharacterPrivateSummary;
  onZChange: (z: number) => void;
  onRemove: () => void;
};

export default function PiecePropertyPanel({ piece, npc, onZChange, onRemove }: Props) {
  const initial = npc.nickName[0]?.toUpperCase() ?? "?";

  return (
    <Panel>
      <NpcHeader>
        <Avatar>{npc.avatarUrl ? <img src={npc.avatarUrl} alt="" /> : initial}</Avatar>
        <NpcInfo>
          <NpcName>{npc.nickName}</NpcName>
          <NpcMeta>NPC · no campo</NpcMeta>
        </NpcInfo>
      </NpcHeader>

      <details data-testid="mais-configs">
        <Summary role="button">mais configurações</Summary>
        <ConfigBody>
          <FieldLabel>Altura (Z)</FieldLabel>
          <ZRow>
            <ZSlider
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={piece.coord.z}
              onChange={(e) => onZChange(Number(e.target.value))}
            />
            <ZValue>{piece.coord.z.toFixed(1)}m</ZValue>
          </ZRow>
        </ConfigBody>
      </details>

      <Divider />

      <RemoveButton type="button" onClick={onRemove}>
        ✕ Remover do mapa
      </RemoveButton>
      <DragHint>ou arraste a peça de volta para a lista</DragHint>
    </Panel>
  );
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 10px;
  border-bottom: 1px solid ${colors.borderInput};
`;

const NpcHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: ${colors.surfaceInput};
  border-radius: 6px;
  border: 1px solid ${colors.borderInput};
  margin-bottom: 10px;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${colors.brandAccent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 700;
  color: ${colors.textPrimary};
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const NpcInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const NpcName = styled.span`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textPrimary};
`;

const NpcMeta = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px;
  color: ${colors.textSecondary};
`;

const Summary = styled.summary`
  font-family: ${fonts.sans};
  font-size: 11px;
  color: ${colors.textSecondary};
  cursor: pointer;
  padding: 4px 0;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: "▶";
    font-size: 9px;
    transition: transform 0.15s;
  }

  details[open] &::before {
    transform: rotate(90deg);
  }
`;

const ConfigBody = styled.div`
  padding: 8px 0 4px;
`;

const FieldLabel = styled.div`
  font-family: ${fonts.sans};
  font-size: 10px;
  color: ${colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

const ZRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ZSlider = styled.input`
  flex: 1;
  accent-color: ${colors.brandAccent};
`;

const ZValue = styled.span`
  font-family: ${fonts.sans};
  font-size: 12px;
  color: ${colors.brandAccent};
  font-weight: 700;
  min-width: 32px;
  text-align: right;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${colors.borderInput};
  margin: 10px 0;
`;

const RemoveButton = styled.button`
  width: 100%;
  padding: 8px;
  border: 1px solid ${colors.danger}55;
  background: ${colors.danger}11;
  color: ${colors.danger};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: background 0.15s;

  &:hover {
    background: ${colors.danger}22;
    border-color: ${colors.danger};
  }
`;

const DragHint = styled.p`
  font-family: ${fonts.sans};
  font-size: 10px;
  color: ${colors.textPlaceholder};
  text-align: center;
  margin-top: 4px;
`;
```

- [ ] **Step 4: Executar o teste**

```bash
npx vitest run src/components/molecules/__tests__/PiecePropertyPanel.test.tsx
```

Esperado: PASS todos os testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/PiecePropertyPanel.tsx \
        src/components/molecules/__tests__/PiecePropertyPanel.test.tsx
git commit -m "feat(pieces): PiecePropertyPanel com Z collapsible e botão remover"
```

---

## Task 4: Upgrade visual do PieceSprite (TacticalMapStage)

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

O `PieceSprite` atual é um placeholder laranja. Esta task o reescreve com:
- Sombra circular correta (BlurFilter, offsetY mínimo, escala com z)
- Avatar com máscara circular (carregamento async, mesmo padrão de BgLayer)
- Frame gungi SVG sobreposto
- Badge +Xm quando z > 0
- Anel de seleção branco

- [ ] **Step 1: Adicionar imports e a função utilitária de cor**

No topo de `TacticalMapStage.tsx`, substituir:

```ts
import { Assets, Container, Graphics, ImageSource, Sprite, Text, Texture } from "pixi.js";
import type { EventSystem, FederatedPointerEvent } from "pixi.js";
```

Por:

```ts
import { Assets, BlurFilter, Container, Graphics, ImageSource, Sprite, Text, Texture } from "pixi.js";
import type { EventSystem, FederatedPointerEvent } from "pixi.js";
import type { Graphics as PixiGraphics, Sprite as PixiSprite } from "pixi.js";
import gungiFrameUrl from "../../assets/icons/gungi.svg";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import type { Selection } from "../../features/tactical-map/store/editorStore";
```

Adicione a função de cor após os imports (antes do `extend`):

```ts
// Gera uma cor HSL determinística a partir do ID da peça (hash simples).
function npcColor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(hash) % 360;
  // HSL(hue, 55%, 40%) → RGB → hex
  const h = hue / 360;
  const s = 0.55;
  const l = 0.4;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const rgb = [h + 1 / 3, h, h - 1 / 3].map((t) => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  });
  return ((rgb[0]! * 255) << 16) | ((rgb[1]! * 255) << 8) | (rgb[2]! * 255 & 0xff);
}
```

- [ ] **Step 2: Adicionar novos props a TacticalMapStage e ViewportInner**

Adicionar ao `type Props`:

```ts
type Props = {
  map: TacticalMap;
  width: number;
  height: number;
  clampToGrid?: boolean;
  bgInteractive?: boolean;
  onBgPositionChange?: (x: number, y: number) => void;
  // Fase 4
  piecesInteractive?: boolean;
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  onPieceSelect?: (pieceId: string) => void;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  onPieceDragToRoster?: (pieceId: string) => void;
  onStageDeselect?: () => void;
};
```

Propagar todos os novos props através do `TacticalMapStage` → `ViewportInner` → `PiecesLayer`.

- [ ] **Step 3: Reescrever PieceSprite — visual estático (sem drag ainda)**

Substituir a função `PieceSprite` inteira (linhas 291-330) por:

```tsx
type PieceSpriteProps = {
  piece: Piece;
  grid: GridShape;
  npc?: CharacterPrivateSummary;
  isSelected: boolean;
  onPointerDown: (piece: Piece, e: FederatedPointerEvent) => void;
};

function PieceSprite({ piece, grid, npc, isSelected, onPointerDown }: PieceSpriteProps) {
  const center = useMemo(() => slotToWorld(piece.coord.slot, grid), [piece.coord.slot, grid]);
  const tokenRadius = grid.cellSize / 3;
  const z = piece.coord.z;
  const zOffsetPx = z * 10;

  // Avatar texture
  const [avatarTexture, setAvatarTexture] = useState<Texture | null>(null);
  useEffect(() => {
    if (!npc?.avatarUrl) { setAvatarTexture(null); return; }
    let cancelled = false;
    if (npc.avatarUrl.startsWith("blob:")) {
      const img = new Image();
      img.onload = () => { if (!cancelled) setAvatarTexture(new Texture({ source: new ImageSource({ resource: img }) })); };
      img.onerror = () => { if (!cancelled) setAvatarTexture(null); };
      img.src = npc.avatarUrl;
    } else {
      Assets.load(npc.avatarUrl).then((t: Texture) => { if (!cancelled) setAvatarTexture(t); }).catch(() => { if (!cancelled) setAvatarTexture(null); });
    }
    return () => { cancelled = true; };
  }, [npc?.avatarUrl]);

  // Gungi frame texture (SVG bundled por Vite)
  const [frameTexture, setFrameTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    Assets.load(gungiFrameUrl).then((t: Texture) => { if (!cancelled) setFrameTexture(t); }).catch(() => { if (!cancelled) setFrameTexture(null); });
    return () => { cancelled = true; };
  }, []);

  const fallbackColor = useMemo(() => npcColor(piece.id), [piece.id]);
  const initial = npc?.nickName?.[0]?.toUpperCase() ?? "?";

  // Shadow values — sombra circular, não elíptica
  const shadowRadius = z > 0 ? tokenRadius + 2 + z * 2 : tokenRadius + 2;
  const shadowAlpha = z > 0 ? 0.45 : 0.58;
  const shadowBlurStrength = z > 0 ? 2 + z : 2;
  const shadowFilter = useMemo(() => new BlurFilter({ strength: shadowBlurStrength }), [shadowBlurStrength]);

  const drawShadow = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0x000000, alpha: shadowAlpha });
      g.circle(0, 2, shadowRadius); // offsetY=2px (luz vem levemente de cima)
      g.fill();
    },
    [shadowRadius, shadowAlpha],
  );

  // Fallback circle quando avatarUrl ausente ou falha
  const drawFallback = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: fallbackColor });
      g.circle(0, -zOffsetPx, tokenRadius);
      g.fill();
    },
    [fallbackColor, tokenRadius, zOffsetPx],
  );

  // Máscara circular para o avatarSprite
  const avatarSpriteRef = useRef<PixiSprite | null>(null);
  const maskRef = useRef<PixiGraphics | null>(null);
  const drawMask = useCallback(
    (g: PixiGraphics) => {
      maskRef.current = g;
      g.clear();
      g.setFillStyle({ color: 0xffffff });
      g.circle(0, -zOffsetPx, tokenRadius);
      g.fill();
      // Aplicar máscara imperativamente após ambos montados
      if (avatarSpriteRef.current) avatarSpriteRef.current.mask = g;
    },
    [tokenRadius, zOffsetPx],
  );

  // Anel de seleção branco
  const drawSelection = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!isSelected) return;
      g.setStrokeStyle({ color: 0xffffff, width: 2, alpha: 0.9 });
      g.circle(0, -zOffsetPx, tokenRadius + 5);
      g.stroke();
      g.setStrokeStyle({ color: 0xffffff, width: 3, alpha: 0.2 });
      g.circle(0, -zOffsetPx, tokenRadius + 8);
      g.stroke();
    },
    [isSelected, tokenRadius, zOffsetPx],
  );

  return (
    <pixiContainer
      label={`piece-${piece.id}`}
      x={center.x}
      y={center.y}
      eventMode="static"
      cursor="pointer"
      onPointerDown={(e: FederatedPointerEvent) => onPointerDown(piece, e)}
    >
      {/* Sombra — fica no slot de origem mesmo durante drag (tratado em Task 5) */}
      <pixiGraphics draw={drawShadow} filters={[shadowFilter]} />

      {/* Avatar circular ou fallback */}
      {avatarTexture ? (
        <>
          <pixiGraphics draw={drawMask} />
          <pixiSprite
            ref={(s) => {
              avatarSpriteRef.current = s;
              if (s && maskRef.current) s.mask = maskRef.current;
            }}
            texture={avatarTexture}
            x={-tokenRadius}
            y={-zOffsetPx - tokenRadius}
            width={tokenRadius * 2}
            height={tokenRadius * 2}
          />
        </>
      ) : (
        <>
          <pixiGraphics draw={drawFallback} />
          <pixiText
            text={initial}
            x={0}
            y={-zOffsetPx}
            anchor={{ x: 0.5, y: 0.5 }}
            style={{ fontSize: Math.round(tokenRadius * 0.85), fill: 0xffffff, fontWeight: "bold" }}
          />
        </>
      )}

      {/* Frame gungi SVG sobreposto */}
      {frameTexture && (
        <pixiSprite
          texture={frameTexture}
          x={-tokenRadius}
          y={-zOffsetPx - tokenRadius}
          width={tokenRadius * 2}
          height={tokenRadius * 2}
        />
      )}

      {/* Anel de seleção */}
      <pixiGraphics draw={drawSelection} />

      {/* Badge de altura */}
      {z > 0 && (
        <pixiText
          text={`+${z}m`}
          x={tokenRadius + 2}
          y={-zOffsetPx - tokenRadius - 12}
          style={{ fontSize: 12, fill: 0xffffff, dropShadow: { color: 0x000000, blur: 2, distance: 1 } }}
        />
      )}
    </pixiContainer>
  );
}
```

- [ ] **Step 4: Atualizar PiecesLayer para passar os novos props**

```tsx
function PiecesLayer({
  map, selection, npcMap, onPieceSelect, onPieceMove, onPieceDragToRoster, onStageDeselect,
}: {
  map: TacticalMap;
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  onPieceSelect?: (pieceId: string) => void;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  onPieceDragToRoster?: (pieceId: string) => void;
  onStageDeselect?: () => void;
}) {
  return (
    <pixiContainer label="pieces-layer">
      {map.pieces.map((p) => (
        <PieceSprite
          key={p.id}
          piece={p}
          grid={map.grid}
          npc={npcMap?.get(p.characterId)}
          isSelected={selection?.kind === "piece" && selection.id === p.id}
          onPointerDown={(piece, _e) => onPieceSelect?.(piece.id)}
        />
      ))}
    </pixiContainer>
  );
}
```

(A lógica de drag completa fica na Task 5.)

- [ ] **Step 5: Verificar build**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Esperado: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "feat(pieces): PieceSprite visual — sombra circular, avatar, gungi frame, seleção"
```

---

## Task 5: PieceSprite — drag dentro do canvas

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

A peça arrastada fica maior (+18%) e sobe 8px. A sombra permanece no slot de origem. O slot alvo fica verde (livre) ou vermelho (ocupado) durante o hover.

- [ ] **Step 1: Adicionar imports de SlotCoord e worldToSlot**

Verificar que `worldToSlot` já está importado de `utils/coords`:

```ts
import { slotToWorld, worldToSlot } from "../../features/tactical-map/utils/coords";
```

Adicionar o tipo `SlotCoord` ao import de `tacticalMap` se ainda não estiver:

```ts
import type { TacticalMap, GridShape, Piece, SlotCoord } from "../../types/tacticalMap";
```

- [ ] **Step 2: Definir o tipo de estado de drag local no PiecesLayer**

Adicionar type antes de `PiecesLayer`:

```ts
type PieceLocalDragState = {
  pieceId: string;
  startScreen: { x: number; y: number };
  isDragging: boolean;
  currentSlot: SlotCoord | null;
  containerRef: React.MutableRefObject<import("pixi.js").Container | null>;
} | null;
```

- [ ] **Step 3: Adicionar drag state e pointermove ao PiecesLayer**

O `PiecesLayer` precisa de acesso ao `vpRef` (viewport) para converter coordenadas. Passar `vpRef` como prop de `ViewportInner` para `PiecesLayer`.

Em `ViewportInner`, adicionar `vpRef` como prop descendente:

```tsx
<PiecesLayer
  map={map}
  vpRef={vpRef}
  selection={selection}
  npcMap={npcMap}
  onPieceSelect={onPieceSelect}
  onPieceMove={onPieceMove}
  onPieceDragToRoster={onPieceDragToRoster}
  onStageDeselect={onStageDeselect}
/>
```

Atualizar `PiecesLayer` para usar `vpRef`:

```tsx
function PiecesLayer({ map, vpRef, selection, npcMap, onPieceSelect, onPieceMove, onPieceDragToRoster, onStageDeselect }: {
  map: TacticalMap;
  vpRef: React.MutableRefObject<Viewport | null>;
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  onPieceSelect?: (pieceId: string) => void;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  onPieceDragToRoster?: (pieceId: string) => void;
  onStageDeselect?: () => void;
}) {
  const { app } = useApplication();
  const localDrag = useRef<PieceLocalDragState>(null);
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<SlotCoord | null>(null);

  // Registrar listeners de pointermove e pointerup na stage global
  useEffect(() => {
    const stage = app?.stage;
    if (!stage) return;

    const handleMove = (e: FederatedPointerEvent) => {
      const drag = localDrag.current;
      if (!drag) return;

      const dx = e.global.x - drag.startScreen.x;
      const dy = e.global.y - drag.startScreen.y;

      if (!drag.isDragging && Math.hypot(dx, dy) > 4) {
        drag.isDragging = true;
        // Pausar o pan do viewport enquanto arrasta peça
        vpRef.current?.plugins.pause("drag");
        setDraggingPieceId(drag.pieceId);
      }

      if (!drag.isDragging) return;

      // Mover container da peça imperativamente (sem re-render React)
      const vp = vpRef.current;
      if (vp && drag.containerRef.current) {
        const world = vp.toWorld(e.global.x, e.global.y);
        drag.containerRef.current.position.set(world.x, world.y);
        drag.currentSlot = worldToSlot(world, map.grid);
        setHoverSlot(drag.currentSlot);
      }
    };

    const handleUp = (e: FederatedPointerEvent) => {
      const drag = localDrag.current;
      if (!drag) return;

      vpRef.current?.plugins.resume("drag");
      localDrag.current = null;
      setDraggingPieceId(null);
      setHoverSlot(null);

      if (!drag.isDragging) {
        onPieceSelect?.(drag.pieceId);
        return;
      }

      // Verificar se o pointer terminou sobre o sidebar (fora do canvas)
      // Usamos e.target: se não é dentro do stage, é drag-to-roster
      const isOverSidebar = !app.canvas.contains(e.nativeEvent?.target as Node | null);
      if (isOverSidebar) {
        onPieceDragToRoster?.(drag.pieceId);
        return;
      }

      const slot = drag.currentSlot;
      if (!slot) return;

      // Verificar se slot está ocupado
      const occupied = map.pieces.some(
        (p) =>
          p.id !== drag.pieceId &&
          JSON.stringify(p.coord.slot) === JSON.stringify(slot),
      );
      if (!occupied) {
        onPieceMove?.(drag.pieceId, slot);
      }
      // Se ocupado: a peça volta ao slot original (a store não foi chamada)
    };

    stage.on("pointermove", handleMove);
    stage.on("pointerup", handleUp);
    stage.on("pointerupoutside", handleUp);

    return () => {
      stage.off("pointermove", handleMove);
      stage.off("pointerup", handleUp);
      stage.off("pointerupoutside", handleUp);
    };
  }, [app, vpRef, map.grid, map.pieces, onPieceSelect, onPieceMove, onPieceDragToRoster]);

  // Highlight de slot alvo
  const drawHoverSlot = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!hoverSlot || !draggingPieceId) return;
      const occupied = map.pieces.some(
        (p) =>
          p.id !== draggingPieceId &&
          JSON.stringify(p.coord.slot) === JSON.stringify(hoverSlot),
      );
      const center = slotToWorld(hoverSlot, map.grid);
      const r = map.grid.cellSize / 2 - 4;
      g.setFillStyle({ color: occupied ? 0xff3030 : 0x30ff80, alpha: 0.25 });
      if (map.grid.kind === "square") {
        g.rect(center.x - r, center.y - r, r * 2, r * 2);
      } else {
        g.circle(center.x, center.y, r);
      }
      g.fill();
    },
    [hoverSlot, draggingPieceId, map.pieces, map.grid],
  );

  return (
    <pixiContainer
      label="pieces-layer"
      eventMode="static"
      onPointerDown={(e: FederatedPointerEvent) => {
        // Click no fundo do layer (não em peça) → deselect
        if (e.target === e.currentTarget) onStageDeselect?.();
      }}
    >
      <pixiGraphics draw={drawHoverSlot} />
      {map.pieces.map((p) => (
        <PieceSprite
          key={p.id}
          piece={p}
          grid={map.grid}
          npc={npcMap?.get(p.characterId)}
          isSelected={selection?.kind === "piece" && selection.id === p.id}
          isDragging={draggingPieceId === p.id}
          localDrag={localDrag}
          onPointerDown={(_piece, e) => {
            if (localDrag.current) return;
            const containerRef: React.MutableRefObject<import("pixi.js").Container | null> = { current: null };
            localDrag.current = {
              pieceId: p.id,
              startScreen: { x: e.global.x, y: e.global.y },
              isDragging: false,
              currentSlot: null,
              containerRef,
            };
            e.stopPropagation();
          }}
        />
      ))}
    </pixiContainer>
  );
}
```

- [ ] **Step 4: Atualizar PieceSprite para estado de drag**

Adicionar `isDragging` e `containerRef` ao `PieceSpriteProps`:

```ts
type PieceSpriteProps = {
  piece: Piece;
  grid: GridShape;
  npc?: CharacterPrivateSummary;
  isSelected: boolean;
  isDragging: boolean;
  localDrag: React.MutableRefObject<PieceLocalDragState>;
  onPointerDown: (piece: Piece, e: FederatedPointerEvent) => void;
};
```

Dentro de `PieceSprite`, conectar o `containerRef` ao container e aplicar escala/offset:

```tsx
// Ref do container para drag imperativo
const containerRef = useRef<import("pixi.js").Container | null>(null);
// Registrar ref no localDrag quando o drag começa nessa peça
useEffect(() => {
  if (isDragging && localDrag.current?.pieceId === piece.id) {
    localDrag.current.containerRef.current = containerRef.current;
  }
}, [isDragging, piece.id, localDrag]);

// Shadow values — drag tem valores diferentes
const shadowRadius = isDragging
  ? tokenRadius + 6
  : z > 0 ? tokenRadius + 2 + z * 2 : tokenRadius + 2;
const shadowAlpha = isDragging ? 0.38 : z > 0 ? 0.45 : 0.58;
const shadowBlurStrength = isDragging ? 5 : z > 0 ? 2 + z : 2;
```

No JSX do `pixiContainer` principal:

```tsx
<pixiContainer
  ref={containerRef}
  label={`piece-${piece.id}`}
  x={center.x}
  y={isDragging ? center.y - 8 : center.y}  // offset visual durante drag
  scale={isDragging ? 1.18 : 1.0}
  eventMode="static"
  cursor="pointer"
  onPointerDown={(e: FederatedPointerEvent) => onPointerDown(piece, e)}
>
  {/* A sombra sempre fica na posição do slot (y=center.y), não acompanha drag.
      Como o container inteiro se move, precisamos compensar o offset no shadow: */}
  <pixiGraphics
    draw={drawShadow}
    filters={[shadowFilter]}
    y={isDragging ? 8 : 0}   // contra-offset para shadow ficar no chão
    scale={isDragging ? 1 / 1.18 : 1}  // contra-escala
  />
  {/* ... resto do JSX sem mudança ... */}
```

- [ ] **Step 5: Verificar build sem erros**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Esperado: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "feat(pieces): PieceSprite drag — escala 1.18, lift -8px, sombra na origem, slot highlight"
```

---

## Task 6: TacticalMapEditor — orquestração de colocação de NPCs

**Files:**
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

O editor gerencia `placingNpcId` (card clicado aguardando click no canvas) e o drag de card para canvas (ghost HTML que segue o cursor).

- [ ] **Step 1: Adicionar estado e imports ao TacticalMapEditor**

Adicionar ao topo do arquivo:

```ts
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid"; // já instalado como dep
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import { useCampaignDetails } from "../../hooks/useCampaignDetails";
import { useToken } from "../../contexts/TokenContext";
import type { SlotCoord } from "../../types/tacticalMap";
```

Dentro de `TacticalMapEditor`, adicionar:

```ts
const { token } = useToken();
const { data: campaign } = useCampaignDetails(token, campaignId === "_campaignId" ? undefined : campaignId);
// Nota: campaignId era usado como _campaignId porque não havia uso; agora é usado.

// Estado local de UI (não persistido na store)
const [placingNpcId, setPlacingNpcId] = useState<string | null>(null);
const [placingNpcData, setPlacingNpcData] = useState<CharacterPrivateSummary | null>(null);
const [isDraggingPieceToRoster, setIsDraggingPieceToRoster] = useState(false);

// Dados da store para peças
const pieces = store((s) => s.map.pieces);
const selection = store((s) => s.selection);
const placePiece = store((s) => s.placePiece);
const movePiece = store((s) => s.movePiece);
const setPieceZ = store((s) => s.setPieceZ);
const removePiece = store((s) => s.removePiece);
const setSelection = store((s) => s.setSelection);

// Set de IDs de personagens já colocados no campo
const placedCharacterIds = useMemo(
  () => new Set(pieces.map((p) => p.characterId)),
  [pieces],
);

// Map de uuid → NPC para lookup rápido (usado pelo PieceSprite)
const npcMap = useMemo(() => {
  const m = new Map<string, CharacterPrivateSummary>();
  (campaign?.characterSheets ?? []).forEach((cs) => m.set(cs.uuid, cs));
  return m;
}, [campaign]);
```

Adicionar `useMemo` ao import do React se não estiver.

- [ ] **Step 2: Handlers de colocação por click-select**

```ts
const handleNpcPointerDown = (npc: CharacterPrivateSummary, e: React.PointerEvent) => {
  e.preventDefault();
  setPlacingNpcId(npc.uuid);
  setPlacingNpcData(npc);
};

// Chamado pelo TacticalMapStage quando slot é clicado em modo "placing"
const handleNpcPlaced = (slot: SlotCoord) => {
  if (!placingNpcData) return;
  const occupied = pieces.some((p) => JSON.stringify(p.coord.slot) === JSON.stringify(slot));
  if (occupied) return; // flash vermelho é responsabilidade do Stage
  placePiece({
    id: uuidv4(),
    characterId: placingNpcData.uuid,
    coord: { slot, z: 0 },
    visible: true,
  });
  setPlacingNpcId(null);
  setPlacingNpcData(null);
};

const handlePieceDragToRoster = (pieceId: string) => {
  removePiece(pieceId);
  if (selection?.kind === "piece" && selection.id === pieceId) {
    setSelection(null);
  }
};

const handleStageDeselect = () => setSelection(null);
```

- [ ] **Step 3: Atualizar o JSX para passar os novos props**

No JSX, remover o `_` do `campaignId` (o prop agora é usado):

```tsx
export default function TacticalMapEditor({
  campaignId,  // era campaignId: _campaignId
  initialMap,
  onSave,
  onSaveSuccess,
  saveLabel = "Salvar",
}: Props) {
```

Atualizar o `<TacticalMapStage>`:

```tsx
<TacticalMapStage
  map={map}
  width={width}
  height={height}
  bgInteractive={activeTool === "bg"}
  piecesInteractive={activeTool === "pieces"}
  selection={selection}
  npcMap={npcMap}
  placingNpcId={placingNpcId}
  onNpcPlaced={handleNpcPlaced}
  onBgPositionChange={(x, y) => setBg(bg ? { ...bg, x, y } : null)}
  onPieceSelect={(id) => setSelection({ kind: "piece", id })}
  onPieceMove={movePiece}
  onPieceDragToRoster={handlePieceDragToRoster}
  onStageDeselect={handleStageDeselect}
/>
```

Atualizar o `<MapEditorToolbar>`:

```tsx
<MapEditorToolbar
  activeTool={activeTool}
  onToolChange={setActiveTool}
  grid={map.grid}
  onGridChange={setGrid}
  bg={map.bg}
  onBgChange={setBg}
  mapId={map.id}
  mapName={map.name}
  mapDescription={map.description ?? ""}
  onNameChange={setName}
  onDescriptionChange={setDescription}
  onSave={handleSave}
  isSaving={isSaving}
  saveLabel={saveLabel}
  nameError={nameError}
  saveError={saveError}
  // Fase 4
  campaignId={campaignId}
  placedCharacterIds={placedCharacterIds}
  placingNpcId={placingNpcId}
  isDraggingPieceToRoster={isDraggingPieceToRoster}
  selectedPiece={selection?.kind === "piece" ? pieces.find((p) => p.id === selection.id) ?? null : null}
  npcMap={npcMap}
  onPointerDownNpc={handleNpcPointerDown}
  onZChange={setPieceZ}
  onRemovePiece={(id) => { removePiece(id); setSelection(null); }}
/>
```

- [ ] **Step 4: Adicionar `placingNpcId` ao TacticalMapStage para modo de colocação**

Em `TacticalMapStage`, adicionar ao `Props`:

```ts
placingNpcId?: string | null;
onNpcPlaced?: (slot: SlotCoord) => void;
```

Em `ViewportInner`, adicionar um listener de `pointerdown` no fundo do viewport:

```tsx
<pixiViewport
  ref={vpCallback}
  screenWidth={width}
  screenHeight={height}
  worldWidth={map.grid.cols * map.grid.cellSize * 2}
  worldHeight={map.grid.rows * map.grid.cellSize * 2}
  events={events}
  eventMode={placingNpcId ? "static" : "passive"}
  onPointerDown={(e: FederatedPointerEvent) => {
    if (!placingNpcId || !onNpcPlaced) return;
    const vp = vpRef.current;
    if (!vp) return;
    const world = vp.toWorld(e.global.x, e.global.y);
    onNpcPlaced(worldToSlot(world, map.grid));
  }}
>
```

- [ ] **Step 5: Verificar build**

```bash
npm run build 2>&1 | grep -E "error TS" | head -15
```

Esperado: sem erros. Se houver erros de prop não encontrada no `MapEditorToolbar`, a Task 7 os resolve.

- [ ] **Step 6: Commit**

```bash
git add src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(pieces): TacticalMapEditor — placingNpcId, colocação de NPC, drag-to-roster"
```

---

## Task 7: MapEditorToolbar — habilitar aba Peças e wiring dos painéis

**Files:**
- Modify: `src/components/organisms/MapEditorToolbar.tsx`

- [ ] **Step 1: Adicionar novos imports e props**

No topo do arquivo, adicionar:

```ts
import type { Piece } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import type { Selection } from "../../features/tactical-map/store/editorStore";
import NpcRosterPanel from "../molecules/NpcRosterPanel";
import PiecePropertyPanel from "../molecules/PiecePropertyPanel";
```

Estender o `type Props`:

```ts
type Props = {
  // props existentes...
  // Fase 4 — pieces
  campaignId: string;
  placedCharacterIds: Set<string>;
  placingNpcId: string | null;
  isDraggingPieceToRoster: boolean;
  selectedPiece: Piece | null;
  npcMap: Map<string, CharacterPrivateSummary>;
  onPointerDownNpc: (npc: CharacterPrivateSummary, e: React.PointerEvent) => void;
  onZChange: (pieceId: string, z: number) => void;
  onRemovePiece: (pieceId: string) => void;
};
```

- [ ] **Step 2: Habilitar aba Peças e adicionar panel ao JSX**

Em `TABS`, alterar `pieces`:

```ts
{ tool: "pieces", label: "Peças", enabled: true },
```

Em `PanelArea`, adicionar:

```tsx
{activeTool === "pieces" && (
  <PiecesPanel>
    {selectedPiece && npcMap.get(selectedPiece.characterId) && (
      <PiecePropertyPanel
        piece={selectedPiece}
        npc={npcMap.get(selectedPiece.characterId)!}
        onZChange={(z) => onZChange(selectedPiece.id, z)}
        onRemove={() => onRemovePiece(selectedPiece.id)}
      />
    )}
    <NpcRosterPanel
      campaignId={campaignId}
      placedCharacterIds={placedCharacterIds}
      placingNpcId={placingNpcId}
      isDropTarget={isDraggingPieceToRoster}
      onPointerDownNpc={onPointerDownNpc}
    />
  </PiecesPanel>
)}
```

Adicionar styled component:

```ts
const PiecesPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;
```

- [ ] **Step 3: Atualizar a assinatura da função para aceitar novos props**

```tsx
export default function MapEditorToolbar({
  activeTool, onToolChange, grid, onGridChange, bg, onBgChange,
  mapId, mapName, mapDescription, onNameChange, onDescriptionChange,
  onSave, isSaving, saveLabel, nameError, saveError,
  // Fase 4
  campaignId, placedCharacterIds, placingNpcId, isDraggingPieceToRoster,
  selectedPiece, npcMap, onPointerDownNpc, onZChange, onRemovePiece,
}: Props) {
```

- [ ] **Step 4: Verificar build**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Esperado: sem erros.

- [ ] **Step 5: Rodar todos os testes**

```bash
npx vitest run 2>&1 | tail -20
```

Esperado: todos os testes passam (o build TS valida, os testes não testam Pixi diretamente).

- [ ] **Step 6: Commit**

```bash
git add src/components/organisms/MapEditorToolbar.tsx
git commit -m "feat(pieces): MapEditorToolbar — aba Peças ativa, NpcRosterPanel, PiecePropertyPanel"
```

---

## Task 8: Smoke test visual na rota `/dev/tactical-map-demo`

**Files:**
- Read: `src/features/tactical-map/TacticalMapEditor.tsx` (para confirmar como iniciar)

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
npm run dev
```

Abrir `http://localhost:5173/dev/tactical-map-demo` (ou a rota equivalente de demo do editor).

- [ ] **Step 2: Verificar aba Peças**

- [ ] A aba "Peças" está clicável (não mais desabilitada)
- [ ] Clicar na aba mostra o NPC roster panel

- [ ] **Step 3: Verificar colocação de NPC por click-select**

- [ ] Clicar um card de NPC destaca o card (borda laranja)
- [ ] Cursor no canvas muda para crosshair
- [ ] Clicar um slot vazio: card desaparece da lista, token aparece no canvas
- [ ] Token tem sombra circular (não elipse), fallback círculo colorido + inicial

- [ ] **Step 4: Verificar seleção e painel de propriedades**

- [ ] Clicar o token no canvas: `PiecePropertyPanel` aparece acima do roster
- [ ] Anel branco visível ao redor do token selecionado
- [ ] Expandir "mais configurações": slider Z aparece
- [ ] Mover slider: badge "+Xm" aparece no token, sombra cresce levemente
- [ ] Botão "Remover do mapa": token some, card reaparece no roster
- [ ] Click em área vazia do canvas: painel fecha (auto-deselect)

- [ ] **Step 5: Verificar drag**

- [ ] Arrastar token para slot vazio: token se move (escala 1.18, sobe 8px, sombra fica no slot original)
- [ ] Arrastar token para slot ocupado: token volta à posição original (sem mover)
- [ ] Arrastar token em direção ao sidebar: token é removido, card reaparece

- [ ] **Step 6: Verificar persistência**

- [ ] Colocar 2 NPCs no campo, ajustar Z de um deles, salvar
- [ ] Recarregar a página: peças e Z persistem

---

## Self-Review do plano

**Cobertura da spec:**

| Req do spec | Task |
|---|---|
| NpcRosterPanel com busca, filtro de colocados, drop zone | Task 2 |
| PiecePropertyPanel com Z collapsible, remover | Task 3 |
| Sombra circular, offsetY=2px, escala com z | Task 4 |
| Avatar async (blob: + URL), fallback círculo+inicial | Task 4 |
| Frame gungi SVG | Task 4 |
| Anel seleção branco | Task 4 |
| Drag: escala 1.18, lift -8px, sombra na origem | Task 5 |
| Slot highlight verde/vermelho durante drag | Task 5 |
| Click-select NPC → colocar no canvas | Task 6 |
| placePiece / movePiece / removePiece via store | Tasks 5+6 |
| Drag peça → sidebar → removePiece | Tasks 5+6 |
| Auto-deselect no click no fundo | Tasks 5+6 |
| Aba Peças habilitada no toolbar | Task 7 |
| TODO(piece-stacking) comentado no código | Task 5 (no drawHoverSlot, slot overlap check) |
| TODO(generic-npc-types) comentado no código | Task 2 (em NpcRosterPanel, filtro de placedIds) |
| Persistência via localStorage/store (já implementada) | — |

**Type consistency:**
- `Selection` (from editorStore): `{ kind: "piece"; id: string } | null` — usado consistentemente em Tasks 4, 6, 7.
- `npcMap: Map<string, CharacterPrivateSummary>` — criado em Task 6, consumido em Tasks 4 e 7.
- `placedCharacterIds: Set<string>` — criado em Task 6, passado em Task 7.
- `onZChange(pieceId, z)` na toolbar → `setPieceZ(pieceId, z)` na store — assinaturas idênticas.
