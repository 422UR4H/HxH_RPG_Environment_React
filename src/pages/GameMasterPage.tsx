// A tela do mestre. Mesma mesa do jogador (`useGameTable`), com o que é do mestre: a fila,
// a regência (abrir, fechar, regime), agir por um NPC — que ele escolhe tocando no NPC ou
// na lista do painel "Agir" —, o modo Arrumar, em que arrasta, põe e tira peças (F12), a
// escolha de onde cai a fuga que falhou (F14) e as reações (Fase 7): reagir pelo NPC alvo e
// dar a palavra a cada reação esperando, na ordem que o mestre quiser.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { useCombatCatalogue } from "../hooks/useCombatCatalogue";
import { useMatchHistory } from "../hooks/useMatchHistory";
import { useGameTable } from "../features/match/combat/useGameTable";
import { defaultMoveCategory } from "../features/match/combat/defaultMoveCategory";
import { useReactionControls } from "../features/match/combat/useReactionControls";
import MatchStageTemplate from "../components/templates/MatchStageTemplate";
import MatchTopBar from "../features/match/combat/MatchTopBar";
import {
  AddNpcPicker, ArrangePanel, NpcPicker, PanelSection, RegencyControls, RoundModeSwitch,
} from "../features/match/combat/MasterControls";
import { PanelTitle } from "../features/match/combat/panelStyles";
import RailNav from "../features/match/combat/RailNav";
import AsideTabs from "../features/match/combat/AsideTabs";
import GeneralBar from "../features/match/combat/GeneralBar";
import OwnBars from "../features/match/combat/OwnBars";
import EventStream from "../features/match/combat/EventStream";
import { historyRows } from "../features/match/combat/historyRows";
import ActionComposer from "../features/match/combat/ActionComposer";
import DeclaredActions from "../features/match/combat/DeclaredActions";
import QueuePanel from "../features/match/combat/QueuePanel";
import CloseTurnRefusedDialog from "../features/match/combat/CloseTurnRefusedDialog";
import SceneChangeDialog from "../features/match/combat/SceneChangeDialog";
import ArrangeConfirmDialog from "../features/match/combat/ArrangeConfirmDialog";
import type { ArrangePending } from "../features/match/combat/ArrangeConfirmDialog";
import FallLandingDialog from "../features/match/combat/FallLandingDialog";
import type { MasterActionPayload } from "../features/match/combat/combatMessages";
import { SmallButton } from "../features/match/combat/MatchTopBar";
import MatchErrorBanner from "../features/match/combat/MatchErrorBanner";
import LostDeclaredNotice from "../features/match/combat/LostDeclaredNotice";
import MatchSheetPanel from "../features/match/combat/MatchSheetPanel";
import ReactionPanel from "../features/match/combat/ReactionPanel";
import ReactionDialogHost from "../features/match/combat/ReactionDialogHost";
import { useCombatAnchoredItems } from "../features/match/combat/anchoredItems";
import PieceAnchoredLayer from "../features/match/combat/PieceAnchoredLayer";
import type { PieceAnchoredItem } from "../features/match/combat/PieceAnchoredLayer";
import MatchCharactersSidebar from "../features/match/MatchCharactersSidebar";
import WallActionSheet from "../features/match/WallActionSheet";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import {
  CanvasWrapper, MapCornerStack, MapCornerStackButton, MapHint, MapLoadingMessage, NoMapMessage, StageNotices,
} from "../features/match/combat/mapCanvasStyles";
import { isSameSlot, slotToTriple, tripleToSlot } from "../features/tactical-map/utils/coords";
import type { SlotTriple } from "../features/tactical-map/utils/coords";
import type { IntentPreview } from "../features/tactical-map/utils/intentGeometry";
import type { SlotCoord, WallSegment } from "../types/tacticalMap";

type Props = {
  token: string;
  campaignId?: string;
  matchId?: string;
};

type RailTab = "fila" | "agir" | "ficha";

// No jogo nenhuma peça é arrastável: quem decide onde a peça para é o servidor. A exceção é
// o modo Arrumar, e mesmo lá soltar só pede confirmação — a peça anda com o `piece_moved`.
const NO_DRAG = new Set<string>();

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

const initialAsideOpen = () =>
  typeof window !== "undefined" && window.matchMedia?.("(min-width: 1280px)").matches === true;

export default function GameMasterPage({ token, campaignId, matchId }: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(canvasRef);

  const [actorId, setActorId] = useState<string | undefined>(undefined);
  const [inspectedId, setInspectedId] = useState<string | undefined>(undefined);
  const [sheetId, setSheetId] = useState<string | undefined>(undefined);

  const game = useGameTable({ token, campaignId, matchId, declaredSource: "queue", actorId });
  const { combat, composer, live, map, nameOf, participants } = game;
  const { state } = combat;
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
    matchId,
    send: combat.send,
    fullStateSeq: game.fullStateSeq,
  });
  const { onSlotForPick, cancelPick } = controls;

  const [railActive, setRailActive] = useState<RailTab>("fila");
  const [panelOpen, setPanelOpen] = useState(true);
  const [asideOpen, setAsideOpen] = useState(initialAsideOpen);
  const [wallPicker, setWallPicker] = useState<WallSegment | null>(null);
  const [sceneDialog, setSceneDialog] = useState(false);

  // ─── Arrumar (F12) ─────────────────────────────────────────────────────────
  const [boardMode, setBoardMode] = useState<BoardMode>("play");
  const arranging = boardMode === "arrange";
  const [arrangePending, setArrangePending] = useState<ArrangePending | null>(null);
  const [arrangePieceId, setArrangePieceId] = useState<string | undefined>(undefined);
  const [placingId, setPlacingId] = useState<string | undefined>(undefined);

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
    setPanelOpen(true);
  }, [arranging, exitBoardMode]);
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
  const reactionPiece = reactionPick ? game.pieceByCharacter.get(reactionPick.actorId) : undefined;
  // O toque envia: sem preview nem confirmação (decisão 6). O modo cai quando o `pick` some.
  const handleReactionSlot = useCallback((slot: SlotCoord) => { onSlotForPick(slot); }, [onSlotForPick]);

  // O Esc é do modo só quando não é de outra coisa: outro diálogo aberto ou um campo de texto
  // com foco ficam com ele. Os diálogos de confirmação do próprio modo não contam.
  const otherDialogOpen =
    sceneDialog || wallPicker != null || state.pendingCloseTurn != null || controls.dialog != null;
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
  useEffect(() => {
    if (!arranging || !placingId) return;
    const onUp = (e: PointerEvent) => {
      releaseOnMapRef.current = !!canvasRef.current?.contains(e.target as Node);
    };
    window.addEventListener("pointerup", onUp, { capture: true });
    return () => {
      window.removeEventListener("pointerup", onUp, { capture: true });
      releaseOnMapRef.current = false;
    };
  }, [arranging, placingId]);

  // Toda (re)conexão derruba o pedido ainda não confirmado: o tabuleiro que ele mirava pode
  // não ser mais o que o servidor tem.
  const [seenFullState, setSeenFullState] = useState(game.fullStateSeq);
  if (seenFullState !== game.fullStateSeq) {
    setSeenFullState(game.fullStateSeq);
    setArrangePending(null);
    setPlacingId(undefined);
    setFallPending(null);
  }

  const handleRailSelect = useCallback(
    (id: string) => {
      // O Arrumar ocupa o painel: escolher outra aba sai dele.
      if (arranging) {
        exitBoardMode();
        setRailActive(id as RailTab);
        setPanelOpen(true);
        return;
      }
      if (id === railActive) {
        setPanelOpen((o) => !o);
        return;
      }
      setRailActive(id as RailTab);
      setPanelOpen(true);
    },
    [railActive, arranging, exitBoardMode],
  );

  const chooseActor = useCallback((id: string | undefined) => {
    setActorId(id);
    setInspectedId(undefined);
    if (id) {
      // Escolher um ator (pela lista do Agir) é voltar a jogar: sai da escolha de onde cai e
      // da casa da fuga (esta volta a "play" sozinha quando o `pick` some).
      setBoardMode((m) => (m === "fallPick" ? "play" : m));
      setChoosingFall(null);
      setFallPending(null);
      cancelPick();
      setRailActive("agir");
      setPanelOpen(true);
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
    [pieceCharacter, actorId, composer, npcIds, chooseActor],
  );
  const handlePieceHold = useCallback(
    (pieceId: string) => {
      const charId = pieceCharacter(pieceId);
      if (charId && actorId) composer.onCharacterHold(charId);
    },
    [pieceCharacter, actorId, composer],
  );
  const handleSlotTap = useCallback(
    (slot: SlotCoord) => {
      if (actorId) composer.onSlotTap(slot);
    },
    [actorId, composer],
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

  const inspectedPieceId = inspectedId
    ? game.boardPieces.find((p) => p.characterId === inspectedId)?.id
    : undefined;

  // Botões de reação (abaixo da peça) e balões (acima): a mesma camada, os mesmos helpers nas duas telas.
  const anchoredItems: PieceAnchoredItem[] = useCombatAnchoredItems(controls, nameOf, game.balloons);

  const canCloseTurn = state.openTurn != null;
  const mapHint = !map
    ? undefined
    : reactionPicking && reactionPick
      ? `Toque na casa para onde ${nameOf(reactionPick.actorId)} escapa.`
    : fallPicking && choosingFall
      ? `Toque num slot vazio para escolher onde ${nameOf(choosingFall)} cai.`
      : arranging
      ? placingId
        ? `Toque num slot vazio para pôr ${nameOf(placingId)}.`
        : "Arraste uma peça para movê-la."
      : !actorId
        ? "Toque num NPC para agir por ele."
        : undefined;

  return (
    <>
      <MatchStageTemplate
        panelOpen={panelOpen}
        asideOpen={asideOpen}
        panelWide={!arranging && railActive === "ficha"}
        topbar={
          <MatchTopBar
            scene={state.scene}
            roundMode={state.roundMode}
            status={combat.status}
            onReconnect={combat.reconnect}
            asideOpen={asideOpen}
            onToggleAside={() => setAsideOpen((o) => !o)}
            actions={
              <RegencyControls
                mode={state.roundMode}
                onModeChange={combat.send.changeRoundMode}
                onOpenNext={combat.send.openNextAction}
                onCloseTurn={() => combat.send.closeTurn()}
                canCloseTurn={canCloseTurn}
                onNewScene={() => setSceneDialog(true)}
                canChangeScene={state.openTurn == null}
              />
            }
          />
        }
        rail={
          <RailNav
            items={[
              { id: "fila", label: "Fila", icon: "☰", badge: state.queue.length },
              { id: "agir", label: "Agir", icon: "⚔" },
              { id: "ficha", label: "Ficha", icon: "📜" },
            ]}
            active={railActive}
            panelOpen={panelOpen}
            onSelect={handleRailSelect}
          />
        }
        panel={
          arranging ? (
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
          ) : railActive === "ficha" ? (
            <MatchSheetPanel
              token={token}
              sheetUuid={sheetId}
              liveHp={sheetId ? state.hp[sheetId] : undefined}
              onClose={() => setSheetId(undefined)}
            />
          ) : railActive === "fila" ? (
            <>
              <ReactionPanel
                title="Reagir pelo NPC"
                targets={controls.targets}
                nameOf={nameOf}
                onQuick={controls.quick}
                onConfigure={controls.configure}
              />
              <PanelSection>
                <PanelTitle>Regime</PanelTitle>
                <RoundModeSwitch mode={state.roundMode} onChange={combat.send.changeRoundMode} placement="panel" />
                <SmallButton
                  type="button"
                  onClick={() => setSceneDialog(true)}
                  disabled={state.openTurn != null}
                  title={state.openTurn == null ? undefined : "Feche o turno antes de trocar de cena"}
                >
                  Nova cena
                </SmallButton>
              </PanelSection>
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
                order={state.bars?.order ?? []}
                gridKind={gridKind}
                nameOf={nameOf}
                onPull={combat.send.pullAction}
                onChooseFallSlot={chooseFallSlot}
                onOpenReaction={combat.send.openReaction}
              />
            </>
          ) : (
            <>
              <NpcPicker npcs={npcs} actorId={actorId} onChoose={chooseActor} />
              <AddNpcPicker candidates={npcCandidates} onAdd={(id) => combat.send.addNpc(id)} />
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
              <DeclaredActions
                declared={state.declared}
                nameOf={nameOf}
                gridKind={gridKind}
                showActor
                onHide={(id) => combat.dismissDeclared([id])}
              />
            </>
          )
        }
        stage={
          <>
            <CanvasWrapper ref={canvasRef}>
              {game.isLoading ? (
                <MapLoadingMessage>Carregando mapa...</MapLoadingMessage>
              ) : map && width > 0 && height > 0 ? (
                <TacticalMapViewer
                  map={{ ...map, walls: live.liveWalls, pieces: game.boardPieces }}
                  fog={live.fog}
                  isMaster
                  width={width}
                  height={height}
                  npcMap={live.npcMap}
                  onWallClick={setWallPicker}
                  piecesInteractive
                  // Com um chip armado nada arrasta: a mesma soltura arrastaria E poria.
                  draggablePieceIds={arranging && !placingId ? allPieceIds : NO_DRAG}
                  suppressPanOnPiecePress
                  onPieceSelect={
                    fallPicking || reactionPicking ? undefined : arranging ? handleArrangeSelect : handlePieceTap
                  }
                  onPieceLongPress={boardMode === "play" && actorId ? handlePieceHold : undefined}
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
                    reactionPicking ? undefined : fallPicking ? fallPreview : arranging ? arrangePreview : composer.preview
                  }
                  intentGhosts={game.ghosts}
                  highlightHoverSlot={fallPicking || reactionPicking || (!arranging && !!actorId)}
                  fitRequest={game.fitRequest}
                  onEmptySlotClick={
                    reactionPicking
                      ? handleReactionSlot
                      : fallPicking ? handleFallSlot : boardMode === "play" && actorId ? handleSlotTap : undefined
                  }
                  onPieceMove={arranging ? handleArrangeMove : undefined}
                  placingNpcId={arranging ? (placingId ?? null) : null}
                  onNpcPlaced={arranging ? handleArrangePlaced : undefined}
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
            <GeneralBar
              bars={state.bars}
              roundMode={state.roundMode}
              openTurnActorId={state.openTurn?.actorId}
              nameOf={nameOf}
              highlightActorIds={npcIds}
            />
            <StageNotices>
              <MatchErrorBanner
                error={state.lastError?.code === "npc_already_in_match" ? null : state.lastError}
                onDismiss={combat.dismissError}
              />
              <LostDeclaredNotice
                count={state.lostDeclared.length}
                restoredCount={state.lostDeclared.filter((d) => d.draftRestored).length}
                onDismiss={combat.dismissLostDeclared}
              />
            </StageNotices>
            {mapHint && <MapHint>{mapHint}</MapHint>}
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
            historico={<EventStream rows={rows} nameOf={nameOf} gridKind={gridKind} loadFailed={historyFailed} />}
            personagens={
              <MatchCharactersSidebar
                gameStarted
                enrollments={[]}
                participants={participantsWithLiveHp}
                isMaster
                actionLoading={{}}
                onAccept={() => {}}
                onReject={() => {}}
                onSelectCharacterSheet={(sheetUuid) => {
                  // Abrir a ficha é largar o tabuleiro: o Arrumar ocupa o painel onde ela aparece.
                  exitBoardMode();
                  setSheetId(sheetUuid);
                  setRailActive("ficha");
                  setPanelOpen(true);
                }}
              />
            }
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
      <ArrangeConfirmDialog
        pending={arrangePending}
        nameOf={nameOf}
        gridKind={gridKind}
        canConfirm={combat.status === "connected"}
        onConfirm={confirmArrange}
        onCancel={() => setArrangePending(null)}
      />
      <FallLandingDialog
        pending={fallPicking ? fallPending : null}
        name={choosingFall ? nameOf(choosingFall) : ""}
        gridKind={gridKind}
        canConfirm={combat.status === "connected"}
        onConfirm={confirmFall}
        onCancel={() => setFallPending(null)}
      />
      <SceneChangeDialog
        open={sceneDialog}
        onCancel={() => setSceneDialog(false)}
        onConfirm={(p) => { combat.send.changeScene(p); setSceneDialog(false); }}
      />
      {wallPicker && (
        <WallActionSheet
          wall={wallPicker}
          isMaster
          onClose={() => setWallPicker(null)}
          onInteract={(kind) => {
            combat.send.masterAction({ targetIds: [wallPicker.id], interact: { kind } });
            setWallPicker(null);
          }}
          // O mestre ataca uma parede POR um NPC: `enqueue_master_action` recusa `attack` (B9).
          onAttack={
            actorId
              ? () => {
                  combat.send.enqueueAction(
                    { actorId, targetId: [wallPicker.id], attack: {} },
                    { fromComposer: false },
                  );
                  setWallPicker(null);
                }
              : undefined
          }
        />
      )}
    </>
  );
}

