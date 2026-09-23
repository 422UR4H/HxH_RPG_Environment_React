import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import { media } from "../../../styles/breakpoints";

export type RailNavItem = { id: string; label: string };

/**
 * Burro (R6/I2): um componente só para o rail em pé e o rodapé deitado — o `MatchStageTemplate`
 * decide a orientação por CSS (§3.2/§5.4 do mestre), não um segundo componente. Nenhum
 * `isMaster` aqui: cada página monta a lista de `items` que faz sentido para o papel dela.
 */
export default function RailNav({
  items,
  active,
  onSelect,
}: {
  items: RailNavItem[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Nav>
      {items.map((item) => (
        <NavButton
          key={item.id}
          type="button"
          aria-pressed={item.id === active}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </NavButton>
      ))}
    </Nav>
  );
}

// F4 (B2): the rail and the phone footer are the SAME component (R6) — RailZone
// (MatchStageTemplate) decides the orientation by CSS, row below railUp and column from
// it on. Hard-coding row here fought that: above railUp the buttons stayed a horizontal
// strip crammed into a 72px-wide column. `inherit` lets Nav follow whatever RailZone set.
const Nav = styled.div`
  display: flex;
  flex-direction: inherit;
  justify-content: inherit;
  width: 100%;
  height: 100%;
`;

const NavButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: ${colors.textPlaceholderStrong};
  font-family: ${fonts.sans};
  font-size: 12px;
  border: none;
  padding: 10px 4px;
  cursor: pointer;

  // flex: 1 on a column stretches every button to fill the rail's full height equally;
  // above railUp they should size to content and stack at the top instead.
  ${media.railUp} {
    flex: 0 0 auto;
  }

  &[aria-pressed="true"] {
    color: ${colors.textPrimary};
    background: ${colors.surfaceInput};
  }
`;
