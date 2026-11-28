// A tela do mestre. Mesma mesa do jogador (`useGameTable`), com o que é do mestre: a fila,
// a regência (abrir, fechar, regime), agir por um NPC — que ele escolhe tocando no NPC ou
// na lista do painel "Agir" —, o modo Arrumar, em que arrasta, põe e tira peças (F12), a
// escolha de onde cai a fuga que falhou (F14) e as reações (Fase 7): reagir pelo NPC alvo e
// dar a palavra a cada reação esperando, na ordem que o mestre quiser.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResizeObserver } from "../hooks/useResizeObserver";
import usePointerVerb from "../hooks/usePointerVerb";
import { useCombatCatalogue } from "../hooks/useCombatCatalogue";
import { useMatchHistory } from "../hooks/useMatchHistory";
import { useGameTable } from "../features/match/combat/useGameTable";
import { defaultMoveCategory } from "../features/match/combat/defaultMoveCategory";
import { useReactionControls } from "../features/match/combat/useReactionControls";
import { usePiecePerspective } from "../features/match/combat/usePiecePerspective";
import { boardThroughPiece } from "../features/match/combat/piecePerspective";
import { useStageOverlays } from "../features/match/combat/useStageOverlays";
import { queueIsSplit, useMatchLayout } from "../features/match/combat/useMatchLayout";
import MatchStageTemplate from "../components/templates/MatchStageTemplate";
import { MASTER_COLUMN_WIDTH } from "../components/templates/MatchStageTemplate.styles";
import MatchTopBar from "../features/match/combat/MatchTopBar";
import {
  AddNpcPicker, ArrangePanel, HeaderRound, NpcPicker, QueueHeader, RoundModeSwitch, TurnControls, WallMasterPanel,
} from "../features/match/combat/MasterControls";
import type { WsError } from "../features/match/combat/combatErrorMessages";
import { actorWallVerbs } from "../features/match/combat/wallVerbs";
import { PanelTitle } from "../features/match/combat/panelStyles";
import RailNav from "../features/match/combat/RailNav";
import type { RailNavItem } from "../features/match/combat/RailNav";
import AsideTabs from "../features/match/combat/AsideTabs";
import GeneralBar from "../features/match/combat/GeneralBar";
import ClockPanel from "../features/match/clock/ClockPanel";
import ClockPill from "../features/match/clock/ClockPill";
import ClockNotice from "../features/match/clock/ClockNotice";
import StartTimeDialog from "../features/match/clock/StartTimeDialog";
import EndMatchDialog from "../features/match/clock/EndMatchDialog";
import { endMatchBlockReason, isMatchOver } from "../features/match/clock/endMatch";
import { useMatchEndedRedirect } from "../features/match/clock/useMatchEndedRedirect";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useStoryClock } from "../features/match/clock/useStoryClock";
import OwnBars from "../features/match/combat/OwnBars";
import EventStream from "../features/match/combat/EventStream";
import { historyRows } from "../features/match/combat/historyRows";
import ActionComposer from "../features/match/combat/ActionComposer";
import type { DeclaredAction } from "../features/match/combat/combatReducer";
import CancelDeclaredDialog from "../features/match/combat/CancelDeclaredDialog";
import { stackedAfter } from "../features/match/combat/moveChain";
import DeclaredActions from "../features/match/combat/DeclaredActions";
import QueuePanel from "../features/match/combat/QueuePanel";
import CloseTurnRefusedDialog from "../features/match/combat/CloseTurnRefusedDialog";
import SceneChangeDialog from "../features/match/combat/SceneChangeDialog";
import { useSceneChangeFlow } from "../features/match/combat/useSceneChangeFlow";
import ArrangeConfirmDialog from "../features/match/combat/ArrangeConfirmDialog";
import type { Participant } from "../types/match";
import type { ArrangePending } from "../features/match/combat/ArrangeConfirmDialog";
import MapPickConfirm from "../features/match/combat/MapPickConfirm";
import type { MasterActionPayload } from "../features/match/combat/combatMessages";
import { sceneTitle } from "../features/match/combat/sceneLabels";
import MatchTabPanel from "../features/match/combat/MatchTabPanel";
import MatchErrorBanner from "../features/match/combat/MatchErrorBanner";
import LostDeclaredNotice from "../features/match/combat/LostDeclaredNotice";
import MatchSheetPanel from "../features/match/combat/MatchSheetPanel";
import ReactionPanel from "../features/match/combat/ReactionPanel";
import ReactionDialogHost from "../features/match/combat/ReactionDialogHost";
import { useCombatAnchoredItems } from "../features/match/combat/anchoredItems";
import PieceAnchoredLayer from "../features/match/combat/PieceAnchoredLayer";
import type { PieceAnchoredItem } from "../features/match/combat/PieceAnchoredLayer";
import MatchCharactersSidebar from "../features/match/MatchCharactersSidebar";
import { BoardWaitNotice } from "../features/match/combat/BoardWaitNotice";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import {
  CanvasWrapper, MapHint, MapHintButton, MapLoadingMessage, NoMapMessage,
  StageNotices,
} from "../features/match/combat/mapCanvasStyles";
import { MapCornerStack, MapCornerStackButton } from "../features/tactical-map/stage/mapCornerStyles";
import { isSameSlot, slotScreenInradius, slotToTriple, tripleToSlot } from "../features/tactical-map/utils/coords";
import { PieceDragGhostPortal } from "../features/tactical-map/PieceDragGhost";
import { usePointerGhost } from "../features/match/usePointerGhost";
import type { SlotTriple } from "../features/tactical-map/utils/coords";
import type { IntentPreview } from "../features/tactical-map/utils/intentGeometry";
import type { SlotCoord, WallSegment } from "../types/tacticalMap";

type Props = {
  token: string;
  campaignId?: string;
  matchId?: string;
};

// As seções do painel do mestre. A "Ficha" não é uma delas: ela é a folha/caixa, fora do painel.
// Com a fila fixa (`queueIsSplit`) a "fila" e "personagens" saem da navegação.
type MasterSection = "fila" | "agir" | "personagens" | "partida";

// No jogo nenhuma peça é arrastável: quem decide onde a peça para é o servidor. A exceção é
// o modo Arrumar, e mesmo lá soltar só pede confirmação — a peça anda com o `piece_moved`.
const NO_DRAG = new Set<string>();

// Onde a soltura caiu: o elemento debaixo do ponto, não o `target` do evento. No toque o
// navegador prende o ponteiro ao elemento do pointerdown (captura implícita), então o
// pointerup de um card arrastado chega com target = o card, mesmo com o dedo sobre o mapa.
// A peça fantasma tem pointer-events: none e não atrapalha o teste de ponto.
function releasedInside(el: HTMLElement | null, e: PointerEvent): boolean {
  if (!el) return false;
  const hit = document.elementFromPoint?.(e.clientX, e.clientY) ?? (e.target as Node | null);
  return !!hit && el.contains(hit);
}

/**
 * O que um gesto no mapa do mestre significa. "play" é o da Fase 6 (tocar escolhe ator/alvo,
 * segurar marca alvos). "fallPick" (F14): um toque num slot vazio escolhe onde cai a fuga que
 * falhou. "reactionPick" (Fase 7): um toque num slot vazio é a casa para onde o NPC escapa — e
 * envia a reação. Um modo por vez: arrastar e segurar na mesma peça brigam no toque.
 */
type BoardMode = "play" | "arrange" | "fallPick" | "reactionPick";

/** O `enqueue_master_action` de peça do contrato (B9/B14): um id só, o da ficha. */
function arrangePayload(p: ArrangePending): MasterActionPayload {
  return p.kind === "remove"
    ? { targetIds: [p.characterId], remove: {} }
    : { targetIds: [p.characterId], move: { position: p.to } };
}

// Estado de um arraste com fantasma: quem, o diâmetro na tela e onde o ponteiro estava.
type GhostDrag = { id: string; avatarUrl?: string | null; size: number; x: number; y: number };

export default function GameMasterPage({ token, campaignId, matchId }: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(canvasRef);
  const verb = usePointerVerb();

  const [actorId, setActorId] = useState<string | undefined>(undefined);
  const [inspectedId, setInspectedId] = useState<string | undefined>(undefined);
  const [sheetId, setSheetId] = useState<string | undefined>(undefined);

  const game = useGameTable({ token, campaignId, matchId, declaredSource: "queue", actorId });
  const { combat, composer, live, map, nameOf, participants } = game;
  const { state } = combat;
  // Relógio da história: só o mestre escala a atenção; a pílula abre e fecha o painel.
  const clock = useStoryClock(state.clock, { escalate: true });
  const [clockOpen, setClockOpen] = useState(false);
  const clockAnchorRef = useRef<HTMLDivElement | null>(null);
  // Sem hora inicial a partida não anda: o diálogo é obrigatório e só some quando o servidor
  // manda um `storyAt` (estado completo ou clock_changed) — por isso não há flag local.
  const { data: matchDetails } = useMatchDetails(token, matchId);
  const startTimePending = state.clock.value?.storyAt === null;
  const startTimeError = startTimePending && state.lastError?.sentType === "set_clock_start" ? state.lastError : null;
  // Duplo clique em "Começar": o 2º envio recusa com clock_already_set depois de o 1º ter dado
  // certo — não é erro para o mestre.
  const staleClockStartError =
    !startTimePending && state.lastError?.sentType === "set_clock_start" && state.lastError.code === "clock_already_set";
  const gridKind = map?.grid.kind ?? "square";

  const { data: catalogue } = useCombatCatalogue(token, actorId);

  // A aba Histórico: o REST (a query que useGameTable invalida a cada mensagem que muda o
  // histórico — turno fechado, cena, regime, round, master action — a cada mexida no tabuleiro
  // entre turnos e a cada match_full_state), com os eventos ao vivo que ele ainda não cobre por cima.
  const { data: historyData, isError: historyFailed } = useMatchHistory(token, matchId);
  const rows = useMemo(
    () => historyRows(historyData?.history, state.events, historyData?.fetchStartedAt, state.openTurn?.turnId),
    [historyData, state.events, state.openTurn],
  );

  // Só NPC (sem jogador) na partida pode ser ator do mestre — o servidor recusa o resto.
  const npcs = useMemo(
    () => participants.filter((p) => !p.characterSheet.playerUuid),
    [participants],
  );
  const npcIds = useMemo(() => new Set(npcs.map((p) => p.characterSheet.uuid)), [npcs]);

  // ─── Reações (spec §4.5–§4.7) ──────────────────────────────────────────────
  // O mestre reage pelos NPCs que são alvo da ação aberta: os mesmos botões do jogador, ao
  // lado da peça e no topo da Fila; a fuga arma a escolha da casa (o modo "reactionPick").
  const controls = useReactionControls({
    state,
    mine: npcIds,
    boardPieces: game.boardPieces,
    send: combat.send,
    fullStateSeq: game.fullStateSeq,
  });
  const { onSlotForPick, cancelPick } = controls;

  const layout = useMatchLayout({ columnWidth: MASTER_COLUMN_WIDTH, queue: true });
  const split = queueIsSplit(layout);
  const [section, setSection] = useState<MasterSection>("fila");
  // Com a fila fixa só Agir e Partida moram no painel; qualquer outra seção cai em Agir.
  const shownSection: MasterSection = split ? (section === "partida" ? "partida" : "agir") : section;
  // A ficha: a folha (empilhado), no lugar da coluna ou a caixa sobre o mapa. Do mestre é a do último personagem
  // que ele tocou, escolheu ou abriu pelo card; sem nenhum, "Ficha" espera uma peça.
  const [sheetWaiting, setSheetWaiting] = useState(false);
  const [lastCharacterId, setLastCharacterId] = useState<string | undefined>(undefined);
  // Cancelar uma ação declarada: o pedido espera a confirmação; se a linha deixa de estar
  // "na fila" com o diálogo aberto (abriu no meio-tempo), o diálogo fecha sozinho.
  const [cancelling, setCancelling] = useState<DeclaredAction | null>(null);
  const cancelPending =
    cancelling && state.declared.some((d) => d.id === cancelling.id && d.status === "queued") ? cancelling : null;
  const {
    asideOpen, asideMode, setAsideOpen, toggleAsideWidth, dismissExpandedAside, sheetOpen, setSheetOpen, closeAsideIfDrawer,
  } = useStageOverlays({
    columnWidth: MASTER_COLUMN_WIDTH,
    queue: true,
    panelFixed: true,
  });
  // As paredes que o mestre tocou SEM NPC escolhido: o card "Ação do Mestre" no Agir. Tocar
  // troca a seleção; segurar junta (o terremoto). Guarda ids — o card lê as paredes ao vivo.
  const [masterWallIds, setMasterWallIds] = useState<string[]>([]);
  // Nova cena: em combate pede o resumo ao abrir; fecha quando a cena troca (a recusa fica nele).
  const sceneFlow = useSceneChangeFlow({
    scene: state.scene,
    combatSummary: state.combatSummary,
    lastError: state.lastError,
    requestCombatSummary: combat.send.requestCombatSummary,
    changeScene: combat.send.changeScene,
  });
  const sceneDialog = sceneFlow.open;

  // ─── Encerrar partida (spec 2026-11-08 §5) ─────────────────────────────────
  // Guarda o erro que já estava no estado ao abrir: só a recusa do `end_match` desta abertura
  // aparece no diálogo. O diálogo não fecha sozinho: o fim tira o mestre da mesa.
  const [endMatchOpened, setEndMatchOpened] = useState<{ error: WsError | null } | null>(null);
  const endMatchError =
    endMatchOpened && state.lastError !== endMatchOpened.error && state.lastError?.sentType === "end_match"
      ? state.lastError
      : null;
  const endMatchBlocked = endMatchBlockReason({
    sceneCategory: state.scene?.category,
    openTurn: state.openTurn != null,
    storyAt: state.clock.value?.storyAt,
  });
  const openEndMatch = () => setEndMatchOpened({ error: state.lastError });
  useMatchEndedRedirect({
    token,
    campaignId,
    matchId,
    matchEnded: state.matchEnded,
    ended: isMatchOver({ matchEnded: state.matchEnded, status: combat.status, lastError: state.lastError }),
  });

  // ─── Arrumar (F12) ─────────────────────────────────────────────────────────
  const [boardMode, setBoardMode] = useState<BoardMode>("play");
  const arranging = boardMode === "arrange";
  const [arrangePending, setArrangePending] = useState<ArrangePending | null>(null);
  const [arrangePieceId, setArrangePieceId] = useState<string | undefined>(undefined);
  const [placingId, setPlacingId] = useState<string | undefined>(undefined);
  // Arrastar o card de quem está fora do mapa até o tabuleiro (vale em qualquer modo, e sempre
  // confirma pelo mesmo diálogo do Arrumar). `x`/`y`: onde o ponteiro estava; `size`: o diâmetro do ghost.
  const [cardDrag, setCardDrag] = useState<GhostDrag | null>(null);
  const clearCardDrag = useCallback(() => setCardDrag(null), []);
  const cardGhostRef = usePointerGhost(cardDrag);
  // Arrumar: uma peça está sendo arrastada para fora do mapa (acende a lista de Personagens).
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  // O fantasma da peça arrastada no Arrumar: o PiecesLayer a esconde da cena e conta conosco para desenhá-la.
  const [pieceDrag, setPieceDrag] = useState<GhostDrag | null>(null);
  const pieceGhostRef = usePointerGhost(pieceDrag);
  // Os dois handlers do arraste de peça são estáveis: o PiecesLayer reassina os ouvintes a cada
  // troca de identidade deles, e um estado ao vivo mudando no meio do arraste não pode fazer isso.
  const handlePieceDragEnd = useCallback(() => {
    setDraggingPieceId(null);
    setPieceDrag(null);
  }, []);
  // Um ref por posição: a lista pode estar montada no Histórico e na seção Personagens ao mesmo
  // tempo, e um ref só seria zerado quando qualquer uma das duas desmontasse.
  const asideListRef = useRef<HTMLDivElement | null>(null);
  const panelListRef = useRef<HTMLDivElement | null>(null);

  // ─── Onde cai a fuga que falhou (F14) ──────────────────────────────────────
  const fallPicking = boardMode === "fallPick";
  // O alvo (a ficha) cuja fuga está falhando, e o slot tocado que espera confirmação.
  const [choosingFall, setChoosingFall] = useState<string | null>(null);
  const [fallPending, setFallPending] = useState<SlotTriple | null>(null);

  // O que os modos guardam, largado. A escolha da casa da fuga mora em `useReactionControls`
  // e é limpa à parte: armá-la passa por aqui sem se derrubar.
  const clearModeState = useCallback(() => {
    setArrangePending(null);
    setArrangePieceId(undefined);
    setPlacingId(undefined);
    setChoosingFall(null);
    setFallPending(null);
    // Um arraste de peça em curso morre com o modo: o fantasma não pode sobrar na tela.
    setDraggingPieceId(null);
    setPieceDrag(null);
  }, []);
  // Sair de um modo é sair de todos: dois nunca estão ligados juntos.
  const exitBoardMode = useCallback(() => {
    setBoardMode("play");
    clearModeState();
    cancelPick();
  }, [clearModeState, cancelPick]);
  const toggleArrange = useCallback(() => {
    if (arranging) {
      exitBoardMode();
      return;
    }
    exitBoardMode();
    setActorId(undefined);
    setInspectedId(undefined);
    setBoardMode("arrange");
    // O Arrumar ocupa o mapa e o painel: a ficha e a espera por uma peça ficam para depois.
    setSheetOpen(false);
    setSheetWaiting(false);
  }, [arranging, exitBoardMode, setSheetOpen]);
  const chooseFallSlot = useCallback(
    (targetId: string) => {
      exitBoardMode();
      setActorId(undefined);
      setInspectedId(undefined);
      setChoosingFall(targetId);
      setBoardMode("fallPick");
    },
    [exitBoardMode],
  );

  // O `edit_action` nomeia a REAÇÃO de fuga, não o alvo: o id dela vem do cálculo do turno
  // aberto. Sem ele — o turno fechou, a reação sumiu — não há o que escolher, e o modo cai.
  const fallReactionId = choosingFall
    ? state.openResolution?.targets.find((t) => t.targetId === choosingFall)?.reaction?.reactionId
    : undefined;
  if (fallPicking && !fallReactionId) exitBoardMode();

  // ─── Para onde o NPC escapa (Fase 7, §4.6) ─────────────────────────────────
  // A escolha mora em `useReactionControls`; o modo do tabuleiro a segue. Armá-la sai dos
  // outros modos; ela cair sozinha (o turno mudou, a reconexão) volta a jogar.
  const reactionPick = controls.pick;
  const reactionPicking = boardMode === "reactionPick";
  if (reactionPick && !reactionPicking) {
    clearModeState();
    setBoardMode("reactionPick");
  } else if (!reactionPick && reactionPicking) {
    setBoardMode("play");
  }
  // Esperando uma peça para a ficha: entrar na escolha da casa (queda ou fuga) desiste da espera,
  // senão a dica some e "Ficha" fica marcada sem nada acontecendo.
  if ((fallPicking || reactionPicking) && sheetWaiting) setSheetWaiting(false);
  const reactionPiece = reactionPick ? game.pieceByCharacter.get(reactionPick.actorId) : undefined;
  // O toque envia: sem preview nem confirmação (decisão 6). O modo cai quando o `pick` some.
  const handleReactionSlot = useCallback((slot: SlotCoord) => { onSlotForPick(slot); }, [onSlotForPick]);

  // O Esc é do modo só quando não é de outra coisa: outro diálogo aberto ou um campo de texto
  // com foco ficam com ele. Os diálogos de confirmação do próprio modo não contam.
  const otherDialogOpen =
    sceneDialog || state.pendingCloseTurn != null || controls.dialog != null;
  useEffect(() => {
    if (boardMode === "play" || otherDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      if (t instanceof HTMLElement && t.isContentEditable) return;
      exitBoardMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [boardMode, otherDialogOpen, exitBoardMode]);

  // O placer do Pixi trata como "pôr" qualquer pointerup dentro da CAIXA do canvas — inclusive
  // um toque no Enquadrar, na barra geral ou num aviso, que flutuam por cima dele. Sem mexer na
  // zona Pixi: com o chip armado, um ouvinte de captura (roda antes do da janela, que o placer
  // usa) anota se a soltura caiu no mapa mesmo; o `onNpcPlaced` de uma que não caiu é descartado.
  const releaseOnMapRef = useRef(false);
  const cardDragging = cardDrag != null;
  useEffect(() => {
    if (!(arranging && placingId) && !cardDragging) return;
    const onUp = (e: PointerEvent) => {
      releaseOnMapRef.current = releasedInside(canvasRef.current, e);
    };
    window.addEventListener("pointerup", onUp, { capture: true });
    return () => {
      window.removeEventListener("pointerup", onUp, { capture: true });
      releaseOnMapRef.current = false;
    };
  }, [arranging, placingId, cardDragging]);

  // Arrumar, peça → lista de Personagens: o Pixi só diz "soltou fora do canvas"; quem diz se foi
  // sobre a lista é este ouvinte de captura (roda antes do da janela, onde o Pixi decide).
  const releaseOnListRef = useRef(false);
  const pieceDragging = draggingPieceId != null;
  useEffect(() => {
    if (!arranging || !pieceDragging) return;
    const onUp = (e: PointerEvent) => {
      releaseOnListRef.current =
        releasedInside(asideListRef.current, e) || releasedInside(panelListRef.current, e);
    };
    window.addEventListener("pointerup", onUp, { capture: true });
    return () => {
      window.removeEventListener("pointerup", onUp, { capture: true });
      releaseOnListRef.current = false;
    };
  }, [arranging, pieceDragging]);

  // Toda (re)conexão derruba o pedido ainda não confirmado: o tabuleiro que ele mirava pode
  // não ser mais o que o servidor tem.
  const [seenFullState, setSeenFullState] = useState(game.fullStateSeq);
  if (seenFullState !== game.fullStateSeq) {
    setSeenFullState(game.fullStateSeq);
    setArrangePending(null);
    setPlacingId(undefined);
    setFallPending(null);
  }

  const toggleSheet = useCallback(() => {
    if (sheetOpen) {
      setSheetOpen(false);
    } else if (sheetWaiting) {
      setSheetWaiting(false);
    } else if (lastCharacterId && participants.some((p) => p.characterSheet.uuid === lastCharacterId)) {
      // O último personagem pode ter saído da partida: sem ele, "Ficha" espera uma peça.
      setSheetId(lastCharacterId);
      setSheetOpen(true);
    } else {
      setSheetWaiting(true);
    }
  }, [sheetOpen, sheetWaiting, lastCharacterId, participants, setSheetOpen]);

  // No celular em pé abrir a gaveta cobre o mapa: abrir o Histórico também desiste da espera da ficha.
  const toggleAside = useCallback(() => {
    if (!asideOpen && layout.asideIsDrawer) setSheetWaiting(false);
    setAsideOpen((o) => !o);
  }, [asideOpen, layout.asideIsDrawer, setAsideOpen]);

  const handleRailSelect = useCallback(
    (id: string) => {
      // O Arrumar ocupa o painel: escolher outro item sai dele.
      if (arranging) exitBoardMode();
      if (id === "ficha") {
        toggleSheet();
        return;
      }
      setSheetWaiting(false);
      // Empilhado (celular ou tablet em pé), a folha cobre o painel; com colunas abaixo de 1280 px
      // e no celular deitado, a ficha ocupa o lugar da seção. Escolher outra seção fecha a ficha, senão nada mudaria na tela.
      if (layout.stacked || layout.sheetReplacesColumn) setSheetOpen(false);
      setSection(id as MasterSection);
    },
    [arranging, exitBoardMode, toggleSheet, layout.stacked, layout.sheetReplacesColumn, setSheetOpen],
  );

  const chooseActor = useCallback((id: string | undefined) => {
    setActorId(id);
    setInspectedId(undefined);
    setMasterWallIds([]);
    if (id) {
      setLastCharacterId(id);
      // Escolher um ator (pela lista do Agir) é voltar a jogar: sai da escolha de onde cai e
      // da casa da fuga (esta volta a "play" sozinha quando o `pick` some).
      setBoardMode((m) => (m === "fallPick" ? "play" : m));
      setChoosingFall(null);
      setFallPending(null);
      cancelPick();
      setSection("agir");
    }
  }, [cancelPick]);

  const pieceCharacter = useCallback(
    (pieceId: string) => game.boardPieces.find((p) => p.id === pieceId)?.characterId,
    [game.boardPieces],
  );

  // Sem ator: tocar num NPC da partida o escolhe; tocar em outro personagem o inspeciona
  // (destaca a peça e rola até a linha dele em Personagens, se a aba estiver aberta). Com ator: tocar em alguém marca o alvo — inclusive o
  // próprio ator, que é um alvo legítimo; soltar o ator é o × do painel.
  const handlePieceTap = useCallback(
    (pieceId: string) => {
      const charId = pieceCharacter(pieceId);
      if (!charId) return;
      setLastCharacterId(charId);
      // Ficha aberta: todo toque no mapa só a fecha (na prática o véu já pega o toque).
      if (sheetOpen) {
        setSheetOpen(false);
        return;
      }
      // Esperando uma peça: este toque abre a ficha dela, e só isso.
      if (sheetWaiting) {
        setSheetId(charId);
        setSheetOpen(true);
        setSheetWaiting(false);
        return;
      }
      if (actorId) {
        composer.onCharacterTap(charId);
        return;
      }
      if (npcIds.has(charId)) {
        chooseActor(charId);
        return;
      }
      setInspectedId(charId);
    },
    [pieceCharacter, sheetOpen, sheetWaiting, actorId, composer, npcIds, chooseActor, setSheetOpen],
  );
  const handlePieceHold = useCallback(
    (pieceId: string) => {
      const charId = pieceCharacter(pieceId);
      if (sheetWaiting) {
        setSheetWaiting(false);
        return;
      }
      if (charId && actorId) composer.onCharacterHold(charId);
    },
    [pieceCharacter, actorId, composer, sheetWaiting],
  );
  const handleSlotTap = useCallback(
    (slot: SlotCoord) => {
      // Esperando uma peça, tocar fora de uma peça desiste.
      if (sheetWaiting) {
        setSheetWaiting(false);
        return;
      }
      if (actorId) composer.onSlotTap(slot);
    },
    [actorId, composer, sheetWaiting],
  );
  // Com NPC, o mestre age só pelo NPC: a parede é alvo do compositor, como para o jogador. Sem NPC,
  // é a mão do mestre: o card "Ação do Mestre" no Agir (nada de modal). Os dois nunca juntos.
  const handleWallTap = useCallback(
    (wall: WallSegment) => {
      if (sheetOpen) {
        setSheetOpen(false);
        return;
      }
      if (sheetWaiting) {
        setSheetWaiting(false);
        return;
      }
      if (actorId) composer.onWallTap(wall);
      else setMasterWallIds([wall.id]);
      setSection("agir");
    },
    [actorId, composer, sheetOpen, sheetWaiting, setSheetOpen],
  );
  const handleWallHold = useCallback(
    (wall: WallSegment) => {
      if (sheetOpen) {
        setSheetOpen(false);
        return;
      }
      if (sheetWaiting) {
        setSheetWaiting(false);
        return;
      }
      if (actorId) {
        composer.onWallHold(wall);
        return;
      }
      setMasterWallIds((ids) => (ids.includes(wall.id) ? ids.filter((id) => id !== wall.id) : [...ids, wall.id]));
      setSection("agir");
    },
    [actorId, composer, sheetOpen, sheetWaiting, setSheetOpen],
  );
  // Com NPC: o que o NPC faz com ela. Sem NPC: toda parede — o mestre lê a vida até da destruída.
  const isWallTappable = useCallback(
    (w: WallSegment) => (actorId ? actorWallVerbs(w).length > 0 : true),
    [actorId],
  );
  const masterWalls = useMemo(
    () => (actorId
      ? []
      : masterWallIds.map((id) => live.liveWalls.find((w) => w.id === id)).filter((w): w is WallSegment => !!w)),
    [actorId, masterWallIds, live.liveWalls],
  );
  // As paredes do card destacadas no mapa, como a parede-alvo do compositor.
  const masterWallPreview = useMemo<IntentPreview | undefined>(
    () => (masterWalls.length
      ? { auto: false, targets: [], targetWalls: masterWalls.map((w) => ({ p1: w.p1, p2: w.p2 })) }
      : undefined),
    [masterWalls],
  );

  useEffect(() => {
    if (!inspectedId) return;
    document.querySelector(`[data-testid="character-row-${inspectedId}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [inspectedId]);

  // HP de todo mundo: o REST do carregamento, sobreposto pelo HP ao vivo.
  const participantsWithLiveHp = useMemo(
    () =>
      participants.map((p) => {
        const live = state.hp[p.characterSheet.uuid];
        const priv = p.characterSheet.private;
        if (!live || !priv) return p;
        return {
          ...p,
          characterSheet: {
            ...p.characterSheet,
            private: { ...priv, health: { ...priv.health, current: live.hp, max: live.maxHp } },
          },
        };
      }),
    [participants, state.hp],
  );

  const actorSheet = participants.find((p) => p.characterSheet.uuid === actorId)?.characterSheet;
  const actorRestHealth = actorSheet?.private?.health;
  const actorHp = actorId
    ? (state.hp[actorId] ?? (actorRestHealth ? { hp: actorRestHealth.current, maxHp: actorRestHealth.max } : undefined))
    : undefined;

  // F2: NPCs da campanha (sem jogador) que ainda não são participantes — candidatos a
  // "pôr na partida" (`add_npc`).
  const participantIds = useMemo(() => new Set(participants.map((p) => p.characterSheet.uuid)), [participants]);
  const npcCandidates = useMemo(
    () =>
      [...live.npcMap.values()]
        .filter((cs) => !cs.playerUuid && !participantIds.has(cs.uuid))
        .map((cs) => ({ id: cs.uuid, name: cs.nickName })),
    [live.npcMap, participantIds],
  );

  // Peça no tabuleiro de quem não é participante: o servidor inscreve (B11) e avisa com
  // npc_added; se o aviso se perder, rebusca — uma vez por personagem, para não virar laço.
  const refetchedFor = useRef(new Set<string>());
  useEffect(() => {
    if (!game.participantsLoaded) return;
    const orphan = game.boardPieces.find(
      (p) => p.characterId && !participantIds.has(p.characterId) && !refetchedFor.current.has(p.characterId),
    );
    if (!orphan?.characterId) return;
    refetchedFor.current.add(orphan.characterId);
    void game.refetchParticipants();
  }, [game.boardPieces, game.participantsLoaded, participantIds, game]);

  // npc_already_in_match quer dizer "o NPC está na partida" (contrato, add_npc): só rebusca.
  useEffect(() => {
    if (state.lastError?.code !== "npc_already_in_match") return;
    void game.refetchParticipants();
    combat.dismissError();
  }, [state.lastError, game, combat]);

  const allPieceIds = useMemo(() => new Set(game.boardPieces.map((p) => p.id)), [game.boardPieces]);
  const arrangeSelected = arranging ? game.boardPieces.find((p) => p.id === arrangePieceId) : undefined;

  // Pôr: quem participa e não tem peça, e o NPC da campanha que ainda não participa (o
  // servidor o inscreve antes). Personagem de jogador fora da partida nunca — `not_participant`.
  const placeable = useMemo(() => {
    const onBoard = new Set(game.boardPieces.map((p) => p.characterId));
    return [
      ...participants
        .filter((p) => !onBoard.has(p.characterSheet.uuid))
        .map((p) => ({ id: p.characterSheet.uuid, name: p.characterSheet.nickName })),
      ...npcCandidates.filter((c) => !onBoard.has(c.id)),
    ];
  }, [participants, npcCandidates, game.boardPieces]);

  const handleArrangeMove = useCallback(
    (pieceId: string, slot: SlotCoord) => {
      const piece = game.boardPieces.find((p) => p.id === pieceId);
      if (!piece?.characterId || isSameSlot(piece.coord.slot, slot)) return;
      setArrangePending({ kind: "move", characterId: piece.characterId, to: slotToTriple(slot, piece.coord.z) });
    },
    [game.boardPieces],
  );
  const handleArrangeSelect = useCallback(
    (pieceId: string) => setArrangePieceId((cur) => (cur === pieceId ? undefined : pieceId)),
    [],
  );
  const handleArrangePlaced = useCallback(
    (slot: SlotCoord) => {
      if (!placingId) return;
      // Soltura num controle por cima do mapa: não é um pôr, e desarma o chip.
      if (!releaseOnMapRef.current) {
        setPlacingId(undefined);
        return;
      }
      // O placer só avisa "soltou aqui"; quem não deixa pôr em cima de outra peça somos nós,
      // como o PiecesLayer faz no arrastar.
      if (game.boardPieces.some((p) => isSameSlot(p.coord.slot, slot))) return;
      // Desarma já: senão o próximo toque no canvas (o Confirmar, por cima dele) seria outro "pôr".
      setPlacingId(undefined);
      setArrangePending({ kind: "place", characterId: placingId, to: slotToTriple(slot, 0) });
    },
    [placingId, game.boardPieces],
  );
  // Fantasma de arraste (card ou peça): o diâmetro da peça na tela, como o ghost do lobby;
  // não encolhe abaixo do que se agarra. Um só lugar para a fórmula.
  const buildGhostDrag = useCallback(
    (characterId: string, point: { x: number; y: number }): GhostDrag => {
      const scale = game.viewport.getSnapshot()?.scale ?? 1;
      const sheet = participants.find((p) => p.characterSheet.uuid === characterId)?.characterSheet;
      return {
        id: characterId,
        avatarUrl: sheet?.avatarUrl,
        size: map ? Math.max(44, slotScreenInradius(map.grid) * 2 * 0.9 * scale) : 44,
        x: point.x,
        y: point.y,
      };
    },
    [game.viewport, map, participants],
  );
  const handleCardDragStart = useCallback(
    (participant: Participant, point: { x: number; y: number }) => {
      setCardDrag(buildGhostDrag(participant.characterSheet.uuid, point));
      closeAsideIfDrawer();
    },
    [buildGhostDrag, closeAsideIfDrawer],
  );
  // O que o início do arraste lê do estado ao vivo fica num ref, para o handler não mudar de identidade.
  const pieceGhostSourceRef = useRef({ boardPieces: game.boardPieces, buildGhostDrag });
  useEffect(() => {
    pieceGhostSourceRef.current = { boardPieces: game.boardPieces, buildGhostDrag };
  }, [game.boardPieces, buildGhostDrag]);
  const handlePieceDragStart = useCallback(
    (pieceId: string, _npc: unknown, point: { x: number; y: number }) => {
      setDraggingPieceId(pieceId);
      const { boardPieces, buildGhostDrag: build } = pieceGhostSourceRef.current;
      const characterId = boardPieces.find((p) => p.id === pieceId)?.characterId;
      if (characterId) setPieceDrag(build(characterId, point));
    },
    [],
  );
  const handleCardPlaced = useCallback(
    (slot: SlotCoord) => {
      if (!cardDrag) return;
      setCardDrag(null);
      // Soltura num controle por cima do mapa: não é um pôr.
      if (!releaseOnMapRef.current) return;
      if (game.boardPieces.some((p) => isSameSlot(p.coord.slot, slot))) return;
      setArrangePending({ kind: "place", characterId: cardDrag.id, to: slotToTriple(slot, 0) });
    },
    [cardDrag, game.boardPieces],
  );
  const handlePieceDragToRoster = useCallback(
    (pieceId: string) => {
      if (!releaseOnListRef.current) return;
      const piece = game.boardPieces.find((p) => p.id === pieceId);
      if (piece?.characterId) setArrangePending({ kind: "remove", characterId: piece.characterId });
    },
    [game.boardPieces],
  );
  // Quem participa, não saiu e não tem peça: o card vira arrastável e ganha o selo.
  const offBoardIds = useMemo(() => {
    const onBoard = new Set(game.boardPieces.map((p) => p.characterId));
    return new Set(
      participants.filter((p) => !p.leftAt && !onBoard.has(p.characterSheet.uuid)).map((p) => p.characterSheet.uuid),
    );
  }, [participants, game.boardPieces]);
  const confirmArrange = () => {
    if (!arrangePending) return;
    if (!combat.send.masterAction(arrangePayload(arrangePending))) return;
    if (arrangePending.kind === "remove") setArrangePieceId(undefined);
    setArrangePending(null);
  };

  // O destino pedido, desenhado como o pré-visualizar do compositor, enquanto se confirma.
  const arrangePreview = useMemo<IntentPreview | undefined>(() => {
    if (!arrangePending || arrangePending.kind === "remove") return undefined;
    const from = game.boardPieces.find((p) => p.characterId === arrangePending.characterId)?.coord.slot;
    return {
      ...(from ? { from } : {}),
      to: tripleToSlot(arrangePending.to, gridKind),
      auto: false,
      targets: [],
    };
  }, [arrangePending, game.boardPieces, gridKind]);

  const fallPiece = choosingFall ? game.boardPieces.find((p) => p.characterId === choosingFall) : undefined;
  const handleFallSlot = useCallback(
    (slot: SlotCoord) => setFallPending(slotToTriple(slot, fallPiece?.coord.z ?? 0)),
    [fallPiece],
  );
  const confirmFall = () => {
    if (!fallPending || !fallReactionId) return;
    if (!combat.send.editAction({ actionId: fallReactionId, escapeLanding: { position: fallPending } })) return;
    exitBoardMode();
  };
  // O slot tocado, desenhado como o pré-visualizar do compositor, enquanto se confirma.
  const fallPreview = useMemo<IntentPreview | undefined>(() => {
    if (!fallPending) return undefined;
    return {
      ...(fallPiece ? { from: fallPiece.coord.slot } : {}),
      to: tripleToSlot(fallPending, gridKind),
      auto: false,
      targets: [],
    };
  }, [fallPending, fallPiece, gridKind]);

  // Onde cai cada fuga que está falhando, já escolhido: marcado no mapa como o destino de um
  // movimento (o mestre vê onde a peça vai parar), até o turno fechar. Na própria escolha, a
  // casa nova é o pré-visualizar — a antiga sai para não confundir.
  const intentGhosts = useMemo(() => {
    const landings = (state.openResolution?.targets ?? [])
      .filter((t) => t.escape && !t.escape.escaped && t.escape.landing && !(fallPicking && t.targetId === choosingFall))
      .map((t) => {
        const piece = game.pieceByCharacter.get(t.targetId);
        return {
          ...(piece ? { from: slotToTriple(piece.coord.slot, piece.coord.z) } : {}),
          to: t.escape!.landing as SlotTriple,
        };
      });
    return landings.length ? [...game.ghosts, ...landings] : game.ghosts;
  }, [state.openResolution, game.ghosts, game.pieceByCharacter, fallPicking, choosingFall]);

  const inspectedPieceId = inspectedId
    ? game.boardPieces.find((p) => p.characterId === inspectedId)?.id
    : undefined;

  // O tabuleiro pelos olhos da peça selecionada (o NPC ator, senão a peça inspecionada): fog
  // fora da visão dela, só as paredes e peças que ela vê. Sem peça, e sempre no Arrumar, o
  // tabuleiro inteiro, sem fog. Na escolha da casa (onde cai, fuga) a peça que já estava ativa fica.
  const perspectivePieceId = arranging ? undefined : (composer.actorPiece?.id ?? inspectedPieceId);
  const pieceView = usePiecePerspective(
    perspectivePieceId, game.pieceView, combat.status, combat.send.watchPieceView, game.fullStateSeq,
  );
  const board = useMemo(
    () =>
      pieceView
        ? boardThroughPiece(live.liveWalls, game.boardPieces, pieceView, live.fog.fogMode)
        : { walls: live.liveWalls, pieces: game.boardPieces, fog: undefined },
    [pieceView, live.liveWalls, game.boardPieces, live.fog.fogMode],
  );

  // Botões de reação (abaixo da peça) e balões (acima): a mesma camada, os mesmos helpers nas duas telas.
  const anchoredItems: PieceAnchoredItem[] = useCombatAnchoredItems(controls, nameOf, game.balloons);

  const canCloseTurn = state.openTurn != null;
  // Um NPC pode reagir e a seção "Reagir pelo NPC" (topo da Fila) não está na tela: no celular
  // os botões não vão ao mapa, e sem isto o mestre não saberia que há o que reagir. A dica leva
  // à Fila. Fica abaixo das dicas dos modos (casa da fuga, onde cai, Arrumar) — o toque, ali,
  // é do modo, e sair dele devolve a dica.
  const reactionWaiting = controls.targets.some((t) => t.status === "available");
  // Com a fila fixa ela está sempre na tela; sem ela, só na seção Fila.
  const reactionSectionShown = split || (!arranging && section === "fila");
  const showReactionHint = !!map && reactionWaiting && !reactionSectionShown;
  const showReactionSection = useCallback(() => {
    if (!split) setSection("fila");
  }, [split]);
  // O onde cai tem a barra dele (MapPickConfirm); a casa da fuga, só a dica — o toque já envia.
  const mapHint = pickMapHint();
  function pickMapHint(): string | undefined {
    if (!map || (fallPicking && choosingFall)) return undefined;
    if (reactionPicking && reactionPick) return `${verb} na casa para onde ${nameOf(reactionPick.actorId)} escapa.`;
    if (arranging) return placingId ? `${verb} num slot vazio para pôr ${nameOf(placingId)}.` : "Arraste uma peça para movê-la.";
    if (sheetWaiting) return `${verb} numa peça para ver a ficha.`;
    if (showReactionHint) return undefined;
    return actorId ? undefined : `${verb} num NPC para agir por ele.`;
  }

  // A mesma lista no Histórico (aba Personagens) e na seção Personagens do painel, cada uma com o seu ref.
  // Personagens no Histórico encaixado a 200: o seletor de NPC usa os textos curtos (a Task 3 usa).
  const asideCompact = layout.asideNarrow && asideMode === "docked";
  const renderCharactersSidebar = (listRef: typeof asideListRef, compact = false) => (
    <MatchCharactersSidebar
      fluid
      footer={<AddNpcPicker candidates={npcCandidates} onAdd={(id) => combat.send.addNpc(id)} compact={compact} />}
      gameStarted
      enrollments={[]}
      participants={participantsWithLiveHp}
      offBoardIds={offBoardIds}
      onCardDragStart={handleCardDragStart}
      containerRef={listRef}
      isDropTarget={arranging && draggingPieceId != null}
      isMaster
      actionLoading={{}}
      onAccept={() => {}}
      onReject={() => {}}
      onSelectCharacterSheet={(sheetUuid) => {
        // Abrir a ficha é largar o tabuleiro: o Arrumar não convive com ela.
        exitBoardMode();
        setSheetId(sheetUuid);
        setLastCharacterId(sheetUuid);
        setSheetWaiting(false);
        setSheetOpen(true);
        closeAsideIfDrawer();
      }}
    />
  );

  // A Fila: aba do painel, ou a zona própria quando há espaço (`split`). Nunca nos dois.
  const queueContent = (
    <>
      <ReactionPanel
        title="Reagir pelo NPC"
        targets={controls.targets}
        nameOf={nameOf}
        onQuick={controls.quick}
        onConfigure={controls.configure}
        pick={controls.pick}
        onCancelPick={cancelPick}
      />
      <QueueHeader
        round={
          <>
            <PanelTitle>Round</PanelTitle>
            <RoundModeSwitch mode={state.roundMode} onChange={combat.send.changeRoundMode} placement="panel" />
          </>
        }
        turn={
          <TurnControls
            mode={state.roundMode}
            onOpenNext={combat.send.openNextAction}
            onCloseTurn={() => combat.send.closeTurn()}
            canCloseTurn={canCloseTurn}
            queueLength={state.queue.length}
            orderLength={state.bars?.order.length ?? 0}
            roundTurns={state.bars?.roundTurns}
          />
        }
      />
      <QueuePanel
        queue={state.queue}
        open={
          state.openTurn
            ? {
                actorId: state.openTurn.actorId,
                bars: state.openQueued?.bars,
                action: state.openTurn.action ?? state.openQueued?.action,
                resolution: state.openResolution,
              }
            : undefined
        }
        order={state.bars?.order}
        mode={state.roundMode}
        gridKind={gridKind}
        nameOf={nameOf}
        onPull={combat.send.pullAction}
        onChooseFallSlot={chooseFallSlot}
        onOpenReaction={combat.send.openReaction}
        onEditAction={combat.send.editAction}
        passiveValue={state.passiveValue}
      />
    </>
  );

  const agirContent = (
    <>
      <NpcPicker npcs={npcs} actorId={actorId} onChoose={chooseActor} />
      <WallMasterPanel
        walls={masterWalls}
        onInteract={(kind, targetIds) => combat.send.masterAction({ targetIds, interact: { kind } })}
        onDismiss={() => setMasterWallIds([])}
      />
      {actorId && (
        <>
          <OwnBars bars={state.bars} characterId={actorId} hp={actorHp} />
          <ActionComposer
            actorName={actorSheet?.nickName ?? nameOf(actorId)}
            onClearActor={() => chooseActor(undefined)}
            draft={composer.draft}
            resolved={composer.resolved}
            verdict={composer.verdict}
            catalogue={catalogue}
            gridKind={gridKind}
            defaultCategory={defaultMoveCategory(state)}
            nameOf={nameOf}
            onDraftChange={composer.updateDraft}
            onDeclare={game.declare}
            canDeclare={game.canDeclare}
            blockedReason={game.blockedReason}
          />
        </>
      )}
    </>
  );

  const panelContent = arranging ? (
    <ArrangePanel
      placeable={placeable}
      placingId={placingId}
      onChoosePlace={setPlacingId}
      selectedName={arrangeSelected?.characterId ? nameOf(arrangeSelected.characterId) : undefined}
      onRemove={() => {
        if (arrangeSelected?.characterId) {
          setArrangePending({ kind: "remove", characterId: arrangeSelected.characterId });
        }
      }}
    />
  ) : shownSection === "partida" ? (
    <MatchTabPanel
      sceneLabel={sceneTitle(state.scene)}
      onNewScene={sceneFlow.openDialog}
      canChangeScene={state.openTurn == null}
      endMatchBlockedReason={endMatchBlocked}
      onEndMatch={openEndMatch}
    />
  ) : shownSection === "personagens" ? (
    renderCharactersSidebar(panelListRef)
  ) : shownSection === "fila" ? (
    queueContent
  ) : (
    agirContent
  );

  const railItems: RailNavItem[] = split
    ? [
        { id: "agir", label: "Agir", icon: "⚔" },
        { id: "ficha", label: "Ficha", icon: "📜", pressed: sheetOpen || sheetWaiting },
        { id: "partida", label: "Partida", icon: "🎲" },
      ]
    : [
        { id: "fila", label: "Fila", icon: "☰", badge: state.queue.length },
        { id: "ficha", label: "Ficha", icon: "📜", pressed: sheetOpen || sheetWaiting },
        { id: "agir", label: "Agir", icon: "⚔" },
        { id: "personagens", label: "Personagens", icon: "👥" },
        { id: "partida", label: "Partida", icon: "🎲" },
      ];

  return (
    <>
      <MatchStageTemplate
        // O painel do mestre é fixo: sempre aberto, na metade de baixo do empilhado, sem véu nem X.
        panelOpen
        panelHalf
        panelDismissible={false}
        columnWidth={MASTER_COLUMN_WIDTH}
        queue={split ? queueContent : undefined}
        sheet={
          <MatchSheetPanel
            token={token}
            sheetUuid={sheetId}
            liveHp={sheetId ? state.hp[sheetId] : undefined}
            emptyHint={`${verb} numa peça ou num personagem para abrir a ficha.`}
          />
        }
        sheetOpen={sheetOpen}
        onDismissSheet={() => setSheetOpen(false)}
        asideMode={asideMode}
        onDismissAside={() => setAsideOpen(false)}
        onToggleAsideWidth={layout.asideNarrow ? toggleAsideWidth : undefined}
        onDismissExpandedAside={dismissExpandedAside}
        topbar={
          <MatchTopBar
            scene={state.scene}
            roundMode={state.roundMode}
            status={combat.status}
            onReconnect={combat.reconnect}
            asideOpen={asideOpen}
            onToggleAside={toggleAside}
            actions={<HeaderRound mode={state.roundMode} onModeChange={combat.send.changeRoundMode} />}
          />
        }
        rail={<RailNav items={railItems} active={shownSection} panelOpen onSelect={handleRailSelect} />}
        panel={panelContent}
        stage={
          <>
            <CanvasWrapper ref={canvasRef}>
              {game.isLoading ? (
                <MapLoadingMessage>Carregando mapa…</MapLoadingMessage>
              ) : game.boardPending ? (
                // O mapa está anexado, mas o tabuleiro da partida ainda não chegou: diz o porquê,
                // sem desenhar o mapa da campanha no lugar.
                <BoardWaitNotice boardUnavailable={game.boardUnavailable} status={combat.status} />
              ) : map && width > 0 && height > 0 ? (
                <TacticalMapViewer
                  map={{ ...map, walls: board.walls, pieces: board.pieces }}
                  fog={board.fog}
                  width={width}
                  height={height}
                  npcMap={live.npcMap}
                  // Só no modo de jogo: no Arrumar e nas escolhas de casa o toque é do modo.
                  onWallClick={boardMode === "play" ? handleWallTap : undefined}
                  onWallLongPress={boardMode === "play" ? handleWallHold : undefined}
                  isWallTappable={isWallTappable}
                  piecesInteractive
                  // Com um chip armado nada arrasta: a mesma soltura arrastaria E poria.
                  draggablePieceIds={arranging && !placingId && !cardDrag ? allPieceIds : NO_DRAG}
                  suppressPanOnPiecePress
                  onPieceSelect={
                    fallPicking || reactionPicking ? undefined : arranging ? handleArrangeSelect : handlePieceTap
                  }
                  onPieceLongPress={boardMode === "play" && actorId && !sheetOpen ? handlePieceHold : undefined}
                  selectedPieceId={
                    reactionPicking
                      ? reactionPiece?.id
                      : fallPicking
                      ? fallPiece?.id
                      : arranging ? arrangeSelected?.id : actorId ? composer.actorPiece?.id : undefined
                  }
                  inspectedPieceId={boardMode === "play" ? inspectedPieceId : undefined}
                  // Os anéis de alvo do compositor leriam como parte da fuga: some com a escolha, como a intenção.
                  targetPieceIds={reactionPicking ? undefined : composer.targetPieceIds}
                  activePieceId={game.openTurnPieceId}
                  intentPreview={
                    reactionPicking ? undefined : fallPicking ? fallPreview : arranging || arrangePending ? arrangePreview : composer.preview ?? masterWallPreview
                  }
                  intentGhosts={intentGhosts}
                  highlightHoverSlot={fallPicking || reactionPicking || (!arranging && !!actorId && !sheetOpen)}
                  fitRequest={game.fitRequest}
                  onEmptySlotClick={
                    sheetOpen
                      ? undefined
                      : reactionPicking
                      ? handleReactionSlot
                      : fallPicking ? handleFallSlot : boardMode === "play" && (actorId || sheetWaiting) ? handleSlotTap : undefined
                  }
                  onPieceMove={arranging ? handleArrangeMove : undefined}
                  placingNpcId={cardDrag?.id ?? (arranging ? (placingId ?? null) : null)}
                  onNpcPlaced={cardDrag ? handleCardPlaced : arranging ? handleArrangePlaced : undefined}
                  // Só o arraste do card desarma sozinho; o chip do Arrumar segue como era.
                  onNpcPlacementCancel={cardDrag ? clearCardDrag : undefined}
                  onPieceDragStart={arranging ? handlePieceDragStart : undefined}
                  onPieceDragEnd={handlePieceDragEnd}
                  onPieceDragToRoster={arranging ? handlePieceDragToRoster : undefined}
                  onViewportTransform={game.setViewport}
                />
              ) : !map ? (
                <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
              ) : null}
            </CanvasWrapper>
            <PieceAnchoredLayer
              viewport={game.viewport}
              grid={map?.grid}
              pieces={game.pieceByCharacter}
              items={anchoredItems}
              width={width}
              height={height}
            />
            {/* display: contents — o invólucro só marca a pílula para o painel (clique fora e foco). */}
            <div ref={clockAnchorRef} style={{ display: "contents" }}>
              <ClockPill clock={clock} interactive open={clockOpen} onToggle={() => setClockOpen((o) => !o)} />
            </div>
            {clockOpen && (
              <ClockPanel
                clock={clock}
                roundMode={state.roundMode}
                anchorRef={clockAnchorRef}
                onAdjust={(delta) => combat.send.adjustClock(delta)}
                onSet={(storyAt, confirm) => combat.send.setClock(storyAt, confirm)}
                onPlay={() => combat.send.playClock()}
                onPause={() => combat.send.pauseClock()}
                onClose={() => setClockOpen(false)}
              />
            )}
            <GeneralBar
              showOrder
              bars={state.bars}
              roundMode={state.roundMode}
              openTurnActorId={state.openTurn?.actorId}
              nameOf={nameOf}
              highlightActorIds={npcIds}
            />
            <StageNotices>
              <MatchErrorBanner
                error={
                  state.lastError?.code === "npc_already_in_match" ||
                  startTimeError ||
                  staleClockStartError ||
                  // O resumo do combate só é pedido pelo diálogo, que cai no layout de roleplay.
                  state.lastError?.sentType === "get_combat_summary" ||
                  // A recusa do encerrar aparece no próprio diálogo.
                  state.lastError?.sentType === "end_match" ||
                  // A recusa do trocar de cena também, enquanto o diálogo está aberto.
                  (sceneFlow.error !== null && state.lastError === sceneFlow.error)
                    ? null
                    : state.lastError
                }
                onDismiss={combat.dismissError}
              />
              <ClockNotice
                // Ao pausar a chave volta a 0: isso não é um aviso novo ("ligado há 0 min").
                text={clock.alertKey > 0 ? `Tempo real ligado há ${clock.alertKey * 5} min` : null}
                noticeKey={clock.alertKey}
              />
              <LostDeclaredNotice
                count={state.lostDeclared.length}
                restoredCount={state.lostDeclared.filter((d) => d.draftRestored).length}
                onDismiss={combat.dismissLostDeclared}
              />
            </StageNotices>
            {startTimePending && (
              <StartTimeDialog
                storyStartAt={matchDetails?.storyStartAt}
                error={startTimeError}
                onStart={(time) => combat.send.setClockStart(time)}
              />
            )}
            {map && fallPicking && choosingFall && (
              <MapPickConfirm
                prompt={`${verb} na casa onde ${nameOf(choosingFall)} cai.`}
                chosen={fallPending ? `${nameOf(choosingFall)} cai na casa marcada.` : undefined}
                note="Vale se a fuga ainda falhar quando o turno fechar."
                canConfirm={combat.status === "connected"}
                onConfirm={confirmFall}
              />
            )}
            {mapHint ? (
              <MapHint>{mapHint}</MapHint>
            ) : (
              showReactionHint && (
                <MapHintButton type="button" onClick={showReactionSection}>
                  Um NPC seu é alvo — reaja no painel.
                </MapHintButton>
              )
            )}
            {map && (
              <MapCornerStack>
                {fallPicking && (
                  <MapCornerStackButton type="button" aria-label="Cancelar a escolha de onde cai" onClick={exitBoardMode}>
                    × Cancelar
                  </MapCornerStackButton>
                )}
                {reactionPicking && (
                  <MapCornerStackButton type="button" aria-label="Cancelar a escolha da casa da fuga" onClick={exitBoardMode}>
                    × Cancelar
                  </MapCornerStackButton>
                )}
                <MapCornerStackButton type="button" aria-pressed={arranging} onClick={toggleArrange}>
                  Arrumar
                </MapCornerStackButton>
                <MapCornerStackButton type="button" onClick={game.refit}>Enquadrar</MapCornerStackButton>
              </MapCornerStack>
            )}
          </>
        }
        aside={
          <AsideTabs
            defaultTab="historico"
            historico={
              <EventStream
                rows={rows}
                nameOf={nameOf}
                gridKind={gridKind}
                loadFailed={historyFailed}
                pinKey={state.declared.map((d) => `${d.id}:${d.status}`).join(",")}
                footer={
                  <DeclaredActions
                    declared={state.declared}
                    nameOf={nameOf}
                    gridKind={gridKind}
                    showActor
                    onCancel={(id) => setCancelling(state.declared.find((d) => d.id === id) ?? null)}
                  />
                }
              />
            }
            personagens={renderCharactersSidebar(asideListRef, asideCompact)}
          />
        }
      />
      <ReactionDialogHost token={token} matchId={matchId} controls={controls} nameOf={nameOf} />
      <CloseTurnRefusedDialog
        payload={state.pendingCloseTurn}
        nameOf={nameOf}
        onConfirm={() => {
          combat.send.closeTurn(true);
          combat.dismissCloseTurnDialog();
        }}
        onCancel={combat.dismissCloseTurnDialog}
      />
      <CancelDeclaredDialog
        pending={cancelPending}
        nameOf={nameOf}
        gridKind={gridKind}
        showActor
        showSwapCost={state.roundMode === "Race"}
        stacked={cancelPending ? stackedAfter(cancelPending.id, game.chainMoves).map((m) => m.summary) : []}
        canConfirm={combat.status === "connected"}
        onConfirm={() => {
          if (cancelPending) combat.send.cancelAction(cancelPending.id);
          setCancelling(null);
        }}
        onKeep={() => setCancelling(null)}
      />
      {arranging && pieceDrag && <PieceDragGhostPortal ghostRef={pieceGhostRef} size={pieceDrag.size} avatarUrl={pieceDrag.avatarUrl} />}
      {cardDrag && <PieceDragGhostPortal ghostRef={cardGhostRef} size={cardDrag.size} avatarUrl={cardDrag.avatarUrl} />}
      <ArrangeConfirmDialog
        pending={arrangePending}
        nameOf={nameOf}
        gridKind={gridKind}
        canConfirm={combat.status === "connected"}
        onConfirm={confirmArrange}
        onCancel={() => setArrangePending(null)}
      />
      <SceneChangeDialog
        open={sceneDialog}
        currentCategory={sceneFlow.currentCategory}
        summary={sceneFlow.summary}
        summaryFailed={sceneFlow.summaryFailed}
        summaryError={sceneFlow.summaryError}
        nameOf={nameOf}
        error={sceneFlow.error}
        onCancel={sceneFlow.closeDialog}
        onConfirm={sceneFlow.confirm}
      />
      <EndMatchDialog
        open={endMatchOpened != null}
        now={clock.now}
        limitAt={clock.limitAt}
        limitReason={clock.limitReason}
        error={endMatchError}
        onCancel={() => setEndMatchOpened(null)}
        onConfirm={(p) => combat.send.endMatch(p)}
      />
    </>
  );
}

