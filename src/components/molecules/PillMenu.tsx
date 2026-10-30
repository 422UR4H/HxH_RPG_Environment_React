import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import styled from "styled-components";
import AttachedList from "./AttachedList";
import BlockableButton from "./BlockableButton";
import { attachedTrigger } from "./AttachedList.styles";
import { useAttachedList } from "./useAttachedList";
import { colors } from "../../styles/tokens";

export interface PillMenuItem {
  key: string;
  /** Conteúdo livre (ícone + rótulo); a cor é de quem usa. */
  content: ReactNode;
  onSelect: () => void;
  /** Com motivo, o item fica indisponível (`BlockableButton`): foca e explica, mas não age. */
  blockedReason?: string;
}

interface PillMenuProps {
  items: PillMenuItem[];
  /** Conteúdo da pílula, conforme o menu está aberto ou não. */
  label: (open: boolean) => ReactNode;
  /** Estilo da pílula fechada: `styled(PillMenu)`. */
  className?: string;
}

type Edge = "first" | "last";

const MENU_ITEM_MAX_FONT_PX = 17;

/**
 * Menu de ações (padrão WAI-ARIA APG *menu button*) com a mesma lista presa à pílula do
 * `PillSelect`: o foco entra nos itens (roving focus), Esc devolve o foco à pílula e Tab fecha
 * deixando o foco seguir a partir dela.
 */
export default function PillMenu({ items, label, className }: PillMenuProps) {
  const list = useAttachedList<HTMLButtonElement>({
    rowSelector: '[role="menuitem"]',
    // Assinatura, não o array: quem usa costuma montar os itens a cada render.
    remeasureKey: items.map((it) => `${it.key}:${it.blockedReason ?? ""}`).join("|"),
    // Ícone + rótulo + "?" de indisponível não cabem numa pílula estreita (celular): a lista cresce.
    growToContent: true,
  });
  const { open, mounted, placement, side, state, listId, anchorName, triggerRef, listRef } = list;
  const triggerId = useId();
  // Item a focar assim que a lista estiver posicionada (antes disso ela está invisível).
  const pendingFocus = useRef<Edge | null>(null);

  const menuItems = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  function focusEdge(edge: Edge) {
    const all = menuItems();
    all[edge === "first" ? 0 : all.length - 1]?.focus();
  }

  useEffect(() => {
    if (!open || !placement || !pendingFocus.current) return;
    focusEdge(pendingFocus.current);
    pendingFocus.current = null;
  });

  function openAt(edge: Edge | null) {
    if (open) {
      if (edge) focusEdge(edge);
      return;
    }
    pendingFocus.current = edge;
    list.openList();
  }

  // Fechar por teclado ou ao escolher: o foco volta à pílula antes de a lista ficar inerte.
  function closeToTrigger() {
    triggerRef.current?.focus();
    list.closeList();
  }

  // Fecha quando o foco sai da pílula e da lista juntas (ir de uma para a outra não conta).
  function handleBlur(e: FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (next && (triggerRef.current?.contains(next) || listRef.current?.contains(next))) return;
    list.closeList();
  }

  function handleTriggerClick(e: MouseEvent) {
    if (open) list.closeList();
    // Clique de teclado/leitor de tela (detail 0) já entra no 1º item.
    else openAt(e.detail === 0 ? "first" : null);
  }

  function handleTriggerKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "Enter":
      case " ":
      case "ArrowDown":
        e.preventDefault();
        openAt("first");
        break;
      case "ArrowUp":
        e.preventDefault();
        openAt("last");
        break;
      case "Escape":
        if (!open) return;
        // Não deixa o Esc fechar também o modal/gaveta que contém o menu.
        e.preventDefault();
        e.stopPropagation();
        list.closeList();
        break;
    }
  }

  function handleListKeyDown(e: KeyboardEvent) {
    const all = menuItems();
    const current = all.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => all[(i + all.length) % all.length]?.focus();
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusAt(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusAt(current < 0 ? -1 : current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(-1);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        closeToTrigger();
        break;
      case "Tab":
        // Sem preventDefault: o navegador leva o foco ao próximo depois da pílula, não ao fim do body.
        closeToTrigger();
        break;
    }
  }

  return (
    <>
      <Trigger
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={className}
        $side={side}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={mounted ? listId : undefined}
        data-state={state}
        style={{ "--pill-anchor": anchorName } as CSSProperties}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        onBlur={handleBlur}
      >
        {label(open)}
      </Trigger>
      <AttachedList list={list} role="menu" aria-labelledby={triggerId} onKeyDown={handleListKeyDown} onBlur={handleBlur}>
        {items.map((it) => (
          <Item
            key={it.key}
            role="menuitem"
            tabIndex={-1}
            blockedReason={it.blockedReason}
            stretch
            labelAlign="start"
            onClick={() => {
              closeToTrigger();
              it.onSelect();
            }}
          >
            {it.content}
          </Item>
        ))}
      </AttachedList>
    </>
  );
}

const Trigger = styled.button<{ $side: "below" | "above" }>`
  ${attachedTrigger}
`;

// Itens de 48 px (o alvo de toque do menu de antes). O recuo é o da pílula: o ícone do item fica na coluna do primeiro caractere dela.
const Item = styled(BlockableButton)`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  min-height: 48px;
  padding: 4px var(--pill-padding-right) 4px var(--pill-padding-left);
  margin: 0;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  /* O corpo do menu de antes (17 px), ou o da pílula, se ela for menor (celular). */
  font-size: min(1em, ${MENU_ITEM_MAX_FONT_PX}px);
  /* Defesa: se ainda assim não couber, o rótulo quebra em vez de passar por baixo do "?". */
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: left;
  cursor: pointer;

  /* O item focado (teclado) e o sob o mouse ganham o mesmo realce da opção ativa do PillSelect. */
  &:focus {
    outline: none;
  }
  &:focus,
  &:not([aria-disabled="true"]):hover {
    background-color: ${colors.overlayHighlight};
  }
  &[aria-disabled="true"] {
    cursor: not-allowed;
  }
`;
