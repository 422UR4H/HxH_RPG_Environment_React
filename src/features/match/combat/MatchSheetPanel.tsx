import styled from "styled-components";
import { useMemo } from "react";
import CharacterSheetTemplate from "../../sheet/CharacterSheetTemplate";
import { MATCH_SHEET_MODE } from "../../sheet/types/sheetMode";
import { useCharacterSheet } from "../../../hooks/useCharacterSheet";
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
  emptyHint = "Toque num personagem para ver a ficha.",
}: {
  token: string;
  sheetUuid: string | undefined;
  liveHp?: { hp: number; maxHp: number };
  /** Texto sem ficha escolhida; o padrão é o do jogador. */
  emptyHint?: string;
}) {
  const { data, isLoading, error } = useCharacterSheet(token, sheetUuid);
  const charSheet = useMemo(() => {
    if (!data || !liveHp) return data;
    return {
      ...data,
      status: { ...data.status, health: { ...data.status.health, current: liveHp.hp, max: liveHp.maxHp } },
    };
  }, [data, liveHp]);

  if (!sheetUuid) return <PanelHint>{emptyHint}</PanelHint>;

  return (
    <Wrapper data-testid="match-sheet">
      <CharacterSheetTemplate
        sheetMode={MATCH_SHEET_MODE}
        data={{ charSheet, isLoading, error: error ? "Não foi possível carregar a ficha." : null }}
      />
    </Wrapper>
  );
}

// BF1: container de bloco, não flex — como item de um flex column (o Wrapper da página),
// margin auto cancelava o stretch e o container-type: inline-size do template ficava sem
// largura de conteúdo (media 0px). Bloco dá ao template a largura do painel.
const Wrapper = styled.div`
  min-height: 0;
`;
