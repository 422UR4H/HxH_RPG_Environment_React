// Os controles que só a tela do mestre monta: regência (regime, abrir, fechar), a escolha
// do NPC por quem agir, a ação direta numa porta/janela e o painel de arrumar o tabuleiro. Nenhum pergunta "sou mestre?" — a página é que decide montá-los.
import { useState } from "react";
import usePointerVerb from "../../../hooks/usePointerVerb";
import styled, { css } from "styled-components";
import PillSelect from "../../../components/molecules/PillSelect";
import { PILL_CHEVRON } from "../../../components/molecules/PillSelect.styles";
import Tooltip from "../../../components/ions/Tooltip";
import { colors } from "../../../styles/tokens";
import { media } from "../../../styles/breakpoints";
import type { Participant } from "../../../types/match";
import type { WallSegment } from "../../../types/tacticalMap";
import type { RoundMode } from "./combatMessages";
import { ROUND_MODE_LABELS } from "./combatText";
import { SmallButton } from "./MatchTopBar";
import {
  Buttons, CancelButton, ConfirmButton, Dialog, DialogHint, DialogTitle, Overlay,
} from "./dialogStyles";
import { PanelHint, PanelTitle } from "./panelStyles";
import { MASTER_WALL_LABELS, masterWallVerbs, wallLifeText, wallName } from "./wallVerbs";
import type { MasterWallKind } from "./wallVerbs";

/**
 * Livre × Disputado. Clicar no regime atual não manda nada: o servidor responderia com
 * `round_mode_changed` sem gravar a troca (não é troca), e a linha ao vivo do Histórico
 * piscaria e sumiria no refetch. `placement` decide onde ele aparece: na topbar a partir do tablet, e
 * no painel da fila no celular — a topbar não tem largura para ele lá.
 */
export function RoundModeSwitch({
  mode,
  onChange,
  placement,
}: {
  mode: RoundMode | "";
  onChange: (mode: RoundMode) => void;
  placement: "topbar" | "panel";
}) {
  return (
    <ModeGroup role="radiogroup" aria-label="Regime" $placement={placement}>
      {(["Free", "Race"] as RoundMode[]).map((m) => (
        <ModeButton key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { if (m !== mode) onChange(m); }}>
          {ROUND_MODE_LABELS[m]}
        </ModeButton>
      ))}
    </ModeGroup>
  );
}

/** Abrir a próxima ação da ordem e fechar o turno aberto — o bastão do mestre. */
export function RegencyControls({
  mode,
  onModeChange,
  onOpenNext,
  onCloseTurn,
  canCloseTurn,
  onNewScene,
  canChangeScene,
  queueLength,
  orderLength,
  roundTurns,
}: {
  mode: RoundMode | "";
  onModeChange: (mode: RoundMode) => void;
  onOpenNext: () => void;
  onCloseTurn: () => void;
  canCloseTurn: boolean;
  onNewScene: () => void;
  canChangeScene: boolean;
  queueLength: number;
  /** Tamanho da ordem da Corrida (`bars.order`). */
  orderLength: number;
  /** Turnos abertos na rodada (`bars.roundTurns`). 0 = nada aconteceu: não se encerra. Ausente = não sei. */
  roundTurns?: number;
}) {
  // Na Corrida o servidor encerra a rodada quando abrir a próxima não acha quem pague
  // (`bars_updated.order` vazio): este botão é como o mestre a encerra, nunca desabilita.
  const endsRound = mode === "Race" && orderLength === 0;
  const empty = !endsRound && queueLength === 0;
  // Encerrar uma rodada em que nada aconteceu só abriria outra igual — o servidor recusa.
  const idleRound = endsRound && roundTurns === 0;
  const blocked = empty || idleRound;
  return (
    <Regency>
      <RoundModeSwitch mode={mode} onChange={onModeChange} placement="topbar" />
      {/* BF5: abaixo de tabletUp o botão vive no painel da Fila (PanelSection acima) — na
          topbar ele era um dos itens que, somados a "Abrir próxima"/"Fechar turno"/
          "Histórico", estourava a largura em 390px e deixava os dois últimos inalcançáveis. */}
      <NewSceneButton
        type="button"
        onClick={onNewScene}
        disabled={!canChangeScene}
        title={canChangeScene ? undefined : "Feche o turno antes de trocar de cena"}
      >
        Nova cena
      </NewSceneButton>
      {/* aria-disabled (e não disabled): o botão segue focável e o hover/foco mostram o porquê. */}
      <Tooltip
        label={idleRound ? "Nenhum turno aconteceu nesta rodada ainda" : "A fila de ações está vazia"}
        enabled={blocked}
      >
        <PrimaryButton type="button" aria-disabled={blocked || undefined} onClick={blocked ? undefined : onOpenNext}>
          {endsRound ? "Encerrar rodada" : "Abrir próxima"}
        </PrimaryButton>
      </Tooltip>
      <SmallButton type="button" onClick={onCloseTurn} disabled={!canCloseTurn}>
        Fechar turno
      </SmallButton>
    </Regency>
  );
}

/** Por qual NPC da partida o mestre age. Tocar no escolhido o solta. */
export function NpcPicker({
  npcs,
  actorId,
  onChoose,
}: {
  npcs: Participant[];
  actorId: string | undefined;
  onChoose: (id: string | undefined) => void;
}) {
  return (
    <Picker aria-label="Agir por">
      <PanelTitle>Agir por</PanelTitle>
      {npcs.length === 0 ? (
        <PanelHint>
          Nenhum NPC nesta partida. Ponha um NPC no mapa ou em Personagens → Adicionar à partida.
        </PanelHint>
      ) : (
        <PickerList>
          {npcs.map((p) => {
            const id = p.characterSheet.uuid;
            return (
              <NpcChip
                key={id}
                type="button"
                aria-pressed={actorId === id}
                onClick={() => onChoose(actorId === id ? undefined : id)}
              >
                {p.characterSheet.nickName}
              </NpcChip>
            );
          })}
        </PickerList>
      )}
    </Picker>
  );
}

/**
 * Adiciona à partida um NPC da campanha que ainda não está nela (`add_npc`). Ele vira
 * participante quando `npc_added` chegar e o REST for rebuscado.
 */
export function AddNpcPicker({
  candidates,
  onAdd,
}: {
  candidates: Array<{ id: string; name: string }>;
  onAdd: (id: string) => void;
}) {
  const [chosen, setChosen] = useState("");
  if (candidates.length === 0) return null;
  return (
    <AddBlock>
      <PanelTitle id="add-npc-title">Adicionar à partida</PanelTitle>
      <NpcSelect
        aria-labelledby="add-npc-title"
        value={chosen}
        onChange={setChosen}
        placeholder="Escolha um NPC da campanha"
        options={candidates.map((c) => ({ value: c.id, label: c.name }))}
      />
      <SmallButton type="button" disabled={!chosen} onClick={() => { onAdd(chosen); setChosen(""); }}>
        Adicionar
      </SmallButton>
    </AddBlock>
  );
}

/**
 * O painel do modo Arrumar (F12): quem pode ir ao mapa (participante sem peça, NPC da
 * campanha fora da partida — o servidor o inscreve ao pôr) e, com uma peça selecionada,
 * tirá-la. Nada aqui envia: tudo passa pela confirmação da página.
 */
export function ArrangePanel({
  placeable,
  placingId,
  onChoosePlace,
  selectedName,
  onRemove,
}: {
  placeable: Array<{ id: string; name: string }>;
  placingId: string | undefined;
  onChoosePlace: (id: string | undefined) => void;
  /** Nome de quem tem a peça selecionada no mapa, se há uma. */
  selectedName: string | undefined;
  onRemove: () => void;
}) {
  const verb = usePointerVerb().toLowerCase();
  return (
    <Picker aria-label="Arrumar o tabuleiro">
      <PanelTitle>Arrumar o tabuleiro</PanelTitle>
      <PanelHint>
        Arraste uma peça para movê-la, ou {verb} nela para tirá-la do mapa. Nada muda antes de
        você confirmar.
      </PanelHint>
      {selectedName && (
        <SmallButton type="button" onClick={onRemove} title={`Tirar ${selectedName} do mapa`}>
          Tirar do mapa
        </SmallButton>
      )}
      <PanelTitle id="arrange-place-title">Pôr no mapa</PanelTitle>
      {placeable.length === 0 ? (
        <PanelHint>Todos os participantes já estão no mapa.</PanelHint>
      ) : (
        <PickerList role="group" aria-labelledby="arrange-place-title">
          {placeable.map((c) => (
            <NpcChip
              key={c.id}
              type="button"
              aria-pressed={placingId === c.id}
              onClick={() => onChoosePlace(placingId === c.id ? undefined : c.id)}
            >
              {c.name}
            </NpcChip>
          ))}
        </PickerList>
      )}
    </Picker>
  );
}

/**
 * O mestre tocou numa porta ou janela sem NPC escolhido: a ação é DELE, na hora, sem turno
 * (`enqueue_master_action`), trancada ou não. Mora no painel Agir, abaixo de "Agir por" — com
 * um NPC escolhido, a parede vira alvo do compositor e este card não aparece.
 */
/**
 * A mão do mestre nas paredes que ele tocou (sem NPC): o estado e a vida de cada uma, e os verbos
 * dele, na hora (`enqueue_master_action`). Uma parede: os verbos dela. Várias (segurar junta mais
 * uma): o que vale para todas — destruir as que ainda estão de pé (um terremoto).
 */
export function WallMasterPanel({
  walls,
  onInteract,
  onDismiss,
}: {
  walls: WallSegment[];
  onInteract: (kind: MasterWallKind, wallIds: string[]) => void;
  onDismiss: () => void;
}) {
  // Destruir não tem volta: pede um segundo toque explícito (um clique errado derrubaria a parede).
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  if (walls.length === 0) return null;
  const single = walls.length === 1 ? walls[0] : undefined;
  const standing = walls.filter((w) => !w.destroyed);
  const verbs: MasterWallKind[] = single ? masterWallVerbs(single) : standing.length ? ["destroy"] : [];
  const targetIds = single ? [single.id] : standing.map((w) => w.id);
  return (
    <Picker aria-label="Ação do Mestre">
      <WallHeader>
        <PanelTitle>
          Ação do Mestre · {single ? wallName(single) : `${walls.length} paredes`}
        </PanelTitle>
        <DismissButton type="button" aria-label="Soltar as paredes" title="Soltar as paredes" onClick={onDismiss}>
          ×
        </DismissButton>
      </WallHeader>
      {single ? (
        <WallFacts wall={single} />
      ) : (
        <WallList>
          {walls.map((w) => (
            <li key={w.id}>
              <strong>{wallName(w)}</strong> — {wallLifeText(w)}
            </li>
          ))}
        </WallList>
      )}
      <PanelHint>
        Acontece na hora, sem turno. {single ? "Segure em outra parede para juntar mais." : "Destruir derruba todas as que estão de pé."}
      </PanelHint>
      {verbs.length > 0 && (
        <PickerList>
          {verbs.map((v) => (
            <SmallButton
              key={v}
              type="button"
              onClick={() => (v === "destroy" ? setConfirmDestroy(true) : onInteract(v, targetIds))}
            >
              {v === "destroy" && !single ? `Destruir ${standing.length}` : MASTER_WALL_LABELS[v]}
            </SmallButton>
          ))}
        </PickerList>
      )}
      {confirmDestroy && (
        <Overlay onClick={() => setConfirmDestroy(false)}>
          <Dialog role="dialog" aria-modal aria-label="Destruir" onClick={(e) => e.stopPropagation()}>
            <DialogTitle>
              {single ? `Destruir ${wallName(single)}?` : `Destruir ${standing.length} paredes?`}
            </DialogTitle>
            <DialogHint>
              {single ? "Ela vai ao chão" : "Elas vão ao chão"} na hora, e não dá para desfazer: nenhuma ação da
              mesa levanta uma parede de novo.
            </DialogHint>
            <Buttons>
              <CancelButton type="button" onClick={() => setConfirmDestroy(false)}>Cancelar</CancelButton>
              <ConfirmButton
                type="button"
                onClick={() => {
                  setConfirmDestroy(false);
                  onInteract("destroy", targetIds);
                }}
              >
                Destruir
              </ConfirmButton>
            </Buttons>
          </Dialog>
        </Overlay>
      )}
    </Picker>
  );
}

function WallFacts({ wall }: { wall: WallSegment }) {
  const state: string[] = [];
  if (!wall.destroyed && (wall.wallType === "door" || wall.wallType === "window" || wall.wallType === "secret_door")) {
    state.push(wall.open ? "Aberta" : "Fechada");
    if (wall.locked) state.push("trancada");
  }
  if (wall.wallType === "secret_door") state.push(wall.revealed ? "revelada" : "escondida dos jogadores");
  return (
    <WallLife data-destroyed={wall.destroyed || undefined}>
      <strong>{wallLifeText(wall)}</strong>
      {wall.maxHp > 0 && (
        <LifeBar aria-hidden>
          <LifeFill style={{ width: `${Math.max(0, Math.min(100, (wall.hp / wall.maxHp) * 100))}%` }} />
        </LifeBar>
      )}
      {state.length > 0 && <span>{state.join(", ")}.</span>}
      {wall.resistance > 0 && !wall.destroyed && <span>Resistência {wall.resistance}.</span>}
    </WallLife>
  );
}

const WallLife = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: ${colors.textPrimary};

  &[data-destroyed] strong {
    color: ${colors.textMuted};
  }
`;

const LifeBar = styled.div`
  height: 6px;
  border-radius: 3px;
  background: ${colors.surfaceInput};
  overflow: hidden;
`;

const LifeFill = styled.div`
  height: 100%;
  background: ${colors.brandAccent};
`;

const WallList = styled.ul`
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: ${colors.textPrimary};
`;

const WallHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: ${colors.textMuted};
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
`;

/* Mora dentro da lista de cards (que já tem as margens): sem recuo lateral próprio. */
const AddBlock = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

// Pílula do site sobre o painel escuro. Refaz em px o desenho de `ProfilePillSelect`, que não serve aqui por usar `cqi` (container query da ficha).
const NpcSelect = styled(PillSelect)`
  width: 100%;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textPrimary};
  background-color: ${colors.brandAccent};
  border: 2px solid ${colors.brandAccent};
  border-radius: 999px;
  padding: 5px 32px 5px 12px;
  cursor: pointer;
  background-image: ${PILL_CHEVRON};
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 14px;

  &:focus {
    outline: none;
    border-color: ${colors.textPrimary};
  }
  &:hover {
    filter: brightness(1.1);
  }
`;

/** Painel da fila no celular: o regime vem para cá (ver `RoundModeSwitch`). */
export const PanelSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 12px 0;

  ${media.tabletUp} {
    display: none;
  }
`;

// BF5: sem isso a Regência nunca cedia espaço (flex-shrink: 0) e empurrava a barra toda
// além da viewport em 390px, deixando "Fechar turno" e "Histórico" inalcançáveis. Agora ela
// pode encolher até 0 e, se ainda não couber (telas bem estreitas), rola na horizontal POR
// DENTRO de si mesma — nunca a página.
const Regency = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
`;

const ModeGroup = styled.div<{ $placement: "topbar" | "panel" }>`
  display: inline-flex;
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  overflow: hidden;

  ${({ $placement }) =>
    $placement === "topbar" &&
    css`
      ${media.phone} {
        display: none;
      }
    `}
`;

const ModeButton = styled.button`
  font-size: 12px;
  border: none;
  padding: 6px 10px;
  cursor: pointer;
  background: transparent;
  color: ${colors.textPlaceholderStrong};

  &[aria-checked="true"] {
    background: ${colors.brandAccent};
    color: ${colors.textPrimary};
    font-weight: 600;
  }
`;

const PrimaryButton = styled(SmallButton)`
  border-color: ${colors.brandAccent};
  background: ${colors.brandAccent};

  &[aria-disabled="true"] {
    background: ${colors.surfaceDisabled};
    border-color: ${colors.surfaceDisabled};
    color: ${colors.textDisabledOnDark};
    filter: none;
    cursor: not-allowed;
  }
`;

/* BF5: some da topbar abaixo de tabletUp — o painel da Fila (PanelSection) já tem o dela. */
const NewSceneButton = styled(SmallButton)`
  ${media.phone} {
    display: none;
  }
`;

const Picker = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 12px 0;

  /* Último bloco do painel: o mesmo 12px que os blocos usam em cima, para as pílulas não
     encostarem na barra de abas de baixo (celular) nem no fim do painel. Com outro bloco
     depois, é o padding de cima dele que separa — sem dobrar. */
  &:last-child {
    padding-bottom: 12px;
  }
`;

const PickerList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const NpcChip = styled.button`
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.surfaceInput};
  color: ${colors.textMuted};
  cursor: pointer;

  &[aria-pressed="true"] {
    border-color: ${colors.mapSelectionRing};
    color: ${colors.textPrimary};
    font-weight: 600;
  }
`;
