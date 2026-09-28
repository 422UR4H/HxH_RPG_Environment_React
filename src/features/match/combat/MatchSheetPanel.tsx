import styled from "styled-components";
import { useMemo } from "react";
import CharacterSheetTemplate from "../../sheet/CharacterSheetTemplate";
import { MATCH_SHEET_MODE } from "../../sheet/types/sheetMode";
import { useCharacterSheet } from "../../../hooks/useCharacterSheet";
import { colors, fonts } from "../../../styles/tokens";
import { PanelHint } from "./panelStyles";

/**
 * A ficha dentro da partida (F3), na zona `panel`. Só leitura. O HP é o ao vivo
 * (`character_hp_changed`) sobre o REST; o REST é rebuscado a cada reconexão
 * (`match_full_state` invalida a query `["characterSheet", token]`).
 */
export default function MatchSheetPanel({
  token,
  sheetUuid,
  liveHp,
  onClose,
}: {
  token: string;
  sheetUuid: string | undefined;
  liveHp?: { hp: number; maxHp: number };
  onClose?: () => void;
}) {
  const { data, isLoading, error } = useCharacterSheet(token, sheetUuid);
  const charSheet = useMemo(() => {
    if (!data || !liveHp) return data;
    return {
      ...data,
      status: { ...data.status, health: { ...data.status.health, current: liveHp.hp, max: liveHp.maxHp } },
    };
  }, [data, liveHp]);

  if (!sheetUuid) return <PanelHint>Toque num personagem para ver a ficha.</PanelHint>;

  return (
    <Wrapper data-testid="match-sheet">
      {onClose && (
        <Head>
          <span>{charSheet?.profile.nickname ?? "Ficha"}</span>
          <Close type="button" aria-label="Fechar ficha" onClick={onClose}>
            ×
          </Close>
        </Head>
      )}
      <CharacterSheetTemplate
        sheetMode={MATCH_SHEET_MODE}
        data={{ charSheet, isLoading, error: error ? "Não foi possível carregar a ficha." : null }}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
`;

const Close = styled.button`
  background: transparent;
  border: none;
  color: ${colors.textPlaceholderStrong};
  font-size: 18px;
  cursor: pointer;
`;
