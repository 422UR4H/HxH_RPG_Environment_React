import styled from "styled-components";
import { colors } from "../../../styles/tokens";

export type RailNavItem = {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
  /** Quando definido, substitui o cálculo `id === active && panelOpen` (ex.: "Ficha" marcada com o painel em outra aba). */
  pressed?: boolean;
};

/**
 * Um componente só para o rail em pé e o rodapé deitado — o `MatchStageTemplate` decide a
 * orientação por CSS, não um segundo componente. Tocar no item ativo abre/fecha o painel.
 */
export default function RailNav({
  items,
  active,
  panelOpen,
  onSelect,
}: {
  items: RailNavItem[];
  active: string;
  panelOpen: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Nav>
      {items.map((item) => (
        <NavButton
          key={item.id}
          type="button"
          aria-pressed={item.pressed ?? (item.id === active && panelOpen)}
          onClick={() => onSelect(item.id)}
        >
          {item.icon && <Icon aria-hidden>{item.icon}</Icon>}
          <span>{item.label}</span>
          {!!item.badge && <Badge>{item.badge}</Badge>}
        </NavButton>
      ))}
    </Nav>
  );
}

const Nav = styled.div`
  display: flex;
  flex-direction: inherit;
  justify-content: inherit;
  width: 100%;
  height: 100%;
`;

const NavButton = styled.button`
  position: relative;
  /* As variáveis vêm do RailZone, que sabe se o rail está deitado, em pé ou no celular deitado. */
  flex: var(--rail-item-flex, 1);
  min-height: var(--rail-item-min-height, auto);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: transparent;
  color: ${colors.textPlaceholderStrong};
  font-size: 12px;
  border: none;
  padding: 8px 4px;
  cursor: pointer;

  &[aria-pressed="true"] {
    color: ${colors.textPrimary};
    background: ${colors.surfaceInput};
  }
`;

const Icon = styled.span`
  font-size: 16px;
  line-height: 1;
`;

const Badge = styled.span`
  position: absolute;
  top: 6px;
  right: calc(50% - 22px);
  min-width: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-size: 10px;
  line-height: 16px;
`;
