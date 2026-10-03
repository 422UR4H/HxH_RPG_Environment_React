// Os controles que só a tela do mestre monta: regência (regime, abrir, fechar), a escolha
// do NPC por quem agir e o painel de arrumar o tabuleiro. Nenhum pergunta "sou mestre?" — a página é que decide montá-los.
import { useState } from "react";
import styled, { css } from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import { media } from "../../../styles/breakpoints";
import type { Participant } from "../../../types/match";
import type { RoundMode } from "./combatMessages";
import { ROUND_MODE_LABELS } from "./combatText";
import { SmallButton } from "./MatchTopBar";
import { PanelHint, PanelTitle } from "./panelStyles";

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
}: {
  mode: RoundMode | "";
  onModeChange: (mode: RoundMode) => void;
  onOpenNext: () => void;
  onCloseTurn: () => void;
  canCloseTurn: boolean;
  onNewScene: () => void;
  canChangeScene: boolean;
}) {
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
      <PrimaryButton type="button" onClick={onOpenNext}>
        Abrir próxima
      </PrimaryButton>
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
          Nenhum NPC nesta partida. Ponha um NPC no mapa ou escolha abaixo.
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
 * Pôr na partida um NPC da campanha que ainda não está nela (`add_npc`). Ele vira
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
    <Picker>
      <PanelTitle as="label" htmlFor="add-npc-select">Pôr na partida</PanelTitle>
      <AddRow>
        <NpcSelect id="add-npc-select" value={chosen} onChange={(e) => setChosen(e.target.value)}>
          <option value="">Escolha um NPC da campanha</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NpcSelect>
        <SmallButton type="button" disabled={!chosen} onClick={() => { onAdd(chosen); setChosen(""); }}>
          Pôr
        </SmallButton>
      </AddRow>
    </Picker>
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

const AddRow = styled.div`
  display: flex;
  gap: 6px;
`;

const NpcSelect = styled.select`
  flex: 1;
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
