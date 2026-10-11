// Os controles que só a tela do mestre monta: regência (regime, abrir, fechar), a escolha
// do NPC por quem agir, a ação direta numa porta/janela e o painel de arrumar o tabuleiro. Nenhum pergunta "sou mestre?" — a página é que decide montá-los.
import { useState } from "react";
import styled, { css } from "styled-components";
import Tooltip from "../../../components/ions/Tooltip";
import { colors, fonts } from "../../../styles/tokens";
import { media } from "../../../styles/breakpoints";
import type { Participant } from "../../../types/match";
import type { WallSegment } from "../../../types/tacticalMap";
import type { RoundMode } from "./combatMessages";
import { ROUND_MODE_LABELS } from "./combatText";
import { SmallButton } from "./MatchTopBar";
import { PanelHint, PanelTitle } from "./panelStyles";
import { MASTER_WALL_LABELS, WALL_TYPE_LABELS, masterWallVerbs } from "./wallVerbs";
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
}) {
  // Na Corrida o servidor encerra a rodada quando abrir a próxima não acha quem pague
  // (`bars_updated.order` vazio): este botão é como o mestre a encerra, nunca desabilita.
  const endsRound = mode === "Race" && orderLength === 0;
  const empty = !endsRound && queueLength === 0;
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
      <Tooltip label="A fila de ações está vazia" enabled={empty}>
        <PrimaryButton type="button" aria-disabled={empty || undefined} onClick={empty ? undefined : onOpenNext}>
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
      <PanelTitle as="label" htmlFor="add-npc-select">Adicionar à partida</PanelTitle>
      <NpcSelect id="add-npc-select" value={chosen} onChange={(e) => setChosen(e.target.value)}>
        <option value="">Escolha um NPC da campanha</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </NpcSelect>
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
  return (
    <Picker aria-label="Arrumar o tabuleiro">
      <PanelTitle>Arrumar o tabuleiro</PanelTitle>
      <PanelHint>
        Arraste uma peça para movê-la, ou toque nela para tirá-la do mapa. Nada muda antes de
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
export function WallMasterPanel({
  wall,
  onInteract,
  onDismiss,
  withActor = false,
}: {
  wall: WallSegment;
  onInteract: (kind: MasterWallKind) => void;
  /** Ausente: a parede não é do card (é o alvo do NPC, no compositor) — sem ×. */
  onDismiss?: () => void;
  /** Um NPC está escolhido: a parede também é o alvo dele, e o card é o atalho do mestre. */
  withActor?: boolean;
}) {
  const verbs = masterWallVerbs(wall);
  if (verbs.length === 0) return null;
  return (
    <Picker aria-label="Ação do Mestre">
      <WallHeader>
        <PanelTitle>Ação do Mestre · {WALL_TYPE_LABELS[wall.wallType]}</PanelTitle>
        {onDismiss && (
          <DismissButton type="button" aria-label="Soltar a parede" title="Soltar a parede" onClick={onDismiss}>
            ×
          </DismissButton>
        )}
      </WallHeader>
      <PanelHint>
        {wallStateText(wall)} Acontece na hora, sem turno
        {withActor ? " — o NPC não age." : ". Para agir por um NPC, escolha-o acima."}
      </PanelHint>
      <PickerList>
        {verbs.map((v) => (
          <SmallButton key={v} type="button" onClick={() => onInteract(v)}>
            {MASTER_WALL_LABELS[v]}
          </SmallButton>
        ))}
      </PickerList>
    </Picker>
  );
}

/** "Fechada e trancada." — o estado que só o mestre lê por inteiro. */
function wallStateText(w: WallSegment): string {
  const parts = [w.open ? "Aberta" : "Fechada"];
  if (w.locked) parts.push("trancada");
  if (w.wallType === "secret_door") parts.push(w.revealed ? "revelada" : "escondida dos jogadores");
  return `${parts.join(", ")}.`;
}

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

const NpcSelect = styled.select`
  width: 100%;
  min-width: 0;
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  border: 1px solid ${colors.surfaceInputHover};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 13px;
  padding: 4px 6px;
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
  font-family: ${fonts.sans};
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
  border-color: ${colors.brandAccentBright};
  background: ${colors.brandAccent};

  &[aria-disabled="true"] {
    opacity: 0.4;
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
`;

const PickerList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const NpcChip = styled.button`
  font-family: ${fonts.sans};
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.surfaceInput};
  color: ${colors.textMuted};
  cursor: pointer;

  &[aria-pressed="true"] {
    border-color: ${colors.pieceSelectionRing};
    color: ${colors.textPrimary};
    font-weight: 600;
  }
`;
