// src/types/tacticalMap.ts
//
// Tipos canônicos do sistema de mapa tático. Espelham §4 do spec
// `System_X_System/docs/superpowers/specs/2026-05-31-tactical-map-design.md`.
// Mantenha sincronizado: schema backend (Fase 1 do spec) deve ser o snake_case
// equivalente.

// ─── Coordenadas ───────────────────────────────────────────────────────────
export type SquareCoord = { kind: "square"; col: number; row: number };
export type HexCoord    = { kind: "hex";    q: number;   r: number };
export type SlotCoord   = SquareCoord | HexCoord;

export type PieceCoord = {
  slot: SlotCoord;
  z: number; // altura "virtual" em metros; 0 = chão
};

// ─── Malha ─────────────────────────────────────────────────────────────────
export type GridKind  = "square" | "hex";
export type LineStyle = "solid" | "dashed";

export type GridShape = {
  kind: GridKind;
  cols: number;        // ignorado em hex (usa rows como alcance retangular q/r)
  rows: number;
  cellSize: number;    // square: lado do quadrado; hex: size (centro→vértice)
  skewRatio: number;   // 1 = top-down; <1 = isométrico (1:2 = 0.5)
  rotation: number;    // graus; default 0
  color: string;       // token de cor
  opacity: number;     // 0–1
  lineStyle: LineStyle;
  // Deslocamento do grid em coords de mundo. Editor-only: permite redimensionar
  // ancorando o canto oposto. Ausente = 0. NÃO é persistido — handleSave o dobra
  // na posição do bg antes de salvar (backend mantém o grid em (0,0)).
  originX?: number;
  originY?: number;
};

// ─── Imagem de fundo ───────────────────────────────────────────────────────
export type BgImage = {
  url: string;      // display URL — blob: during current session, R2 URL after reload
  r2Url?: string;   // R2 public URL kept only for persistence; absent on URL-input path
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
} | null;

// ─── Peça ──────────────────────────────────────────────────────────────────
export type Piece = {
  id: string;          // uuid próprio da peça no mapa (não é character.id)
  characterId: string; // FK pra CharacterSheet (jogador ou NPC)
  coord: PieceCoord;
  visible: boolean;    // Fase 7. Default true. Evolui pra visibleTo: 'all' | UserId[]
};

// ─── Paredes ────────────────────────────────────────────────────────────────
export type WallType =
  | "wall"
  | "door"
  | "window"
  | "secret_door"
  | "terrain";

export type WallMaterial =
  | "stone"
  | "wood"
  | "iron"
  | "magical";

export type DoorSubtype =
  | "basic"
  | "double"
  | "portcullis"
  | "drawbridge";

export type WindowSubtype =
  | "basic"
  | "barred"
  | "shuttered";

export type SenseKind = "full" | "sight" | "none";
export type WallDirection = "both" | "left" | "right";

export type WallSegment = {
  id: string;
  p1: [number, number];  // local (pre-transform) grid coords
  p2: [number, number];
  wallType: WallType;
  material: WallMaterial;
  doorSubtype?: DoorSubtype;
  windowSubtype?: WindowSubtype;
  move: boolean;
  sense: SenseKind;
  direction: WallDirection;
  open: boolean;
  locked: boolean;
  hp: number;
  maxHp: number;
  resistance: number;
  destroyed: boolean;
  revealed?: boolean; // secret_door revealed to all by the master (10-D)
};

// ─── Capacidades futuras (placeholders declarados desde já) ────────────────
export type Decoration = {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zOrder: number;
  opacity: number;
};

export type MapItem = {
  id: string;
  itemDefId: string;
  coord: SlotCoord;
};

// ─── Match ↔ Map attachment ────────────────────────────────────────────────
export type MatchMapResponse = {
  matchUuid: string;
  mapUuid: string;
  attachedAt: string;
};

// ─── Raiz ──────────────────────────────────────────────────────────────────
export type TacticalMap = {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  grid: GridShape;
  bg: BgImage;
  pieces: Piece[];
  walls: WallSegment[];
  decorations: Decoration[]; // []
  items: MapItem[];      // []
  fogMode?: FogMode;     // default "explored"; absent on legacy maps
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
};

// ─── Fog of War (10-D) ──────────────────────────────────────────────────────
export type FogMode = "live" | "explored";

// A single visibility polygon's vertices, in LOCAL (pre-transform) coords —
// same space as WallSegment.p1/p2. FogLayer applies applyTransform per vertex.
export type VisibilityPolygon = Array<[number, number]>;

// Viewer-side fog state (not persisted in the editor; arrives via WS/REST).
export type FogState = {
  fogMode: FogMode;
  visiblePolygons: VisibilityPolygon[];
  // Accumulated explored cells as "a,b" keys (square: col,row; hex: q,r).
  exploredCells: Set<string>;
};
