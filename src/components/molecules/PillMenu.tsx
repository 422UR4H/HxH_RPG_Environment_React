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
import { ROW_FONT_VAR, useAttachedList } from "./useAttachedList";
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

// O corpo do menu de antes (17 px) é o teto; abaixo de 10 px o rótulo quebra linha em vez de encolher mais.
const MENU_ITEM_MAX_FONT_PX = 17;
const MENU_ITEM_MIN_FONT_PX = 10;
// Aberto, a forma (pílula + lista) não arredonda mais que isto: a pílula de 50 px de raio com uma
// lista curta virava uma bolha.
const MENU_MAX_OPEN_RADIUS_PX = 16;

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
    // A lista é sempre da largura da pílula: numa pílula estreita (celular) é o texto que encolhe
    // para ícone + rótulo + "?" de indisponível caberem, como o texto da própria pílula.
    fitRowFont: { min: MENU_ITEM_MIN_FONT_PX, max: MENU_ITEM_MAX_FONT_PX },
    maxOpenRadius: MENU_MAX_OPEN_RADIUS_PX,
  });
  const { open, mounted, placement, side, state, openRadius, listId, anchorName, triggerRef, listRef } = list;
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
        $capOpenRadius
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={mounted ? listId : undefined}
        // Até a lista ser medida, a pílula segue fechada: o lado da lista (quais cantos ficam retos e
        // quais diminuem) só se sabe depois, e a transição dos cantos partiria do valor errado. Tudo
        // antes da pintura: na tela, a pílula já abre do lado certo.
        data-state={state === "open" && !placement ? "closed" : state}
        style={{ "--pill-anchor": anchorName, "--attached-open-radius": openRadius } as CSSProperties}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        onBlur={handleBlur}
      >
        {label(open)}
      </Trigger>
      <AttachedList list={list} role="menu" aria-labelledby={triggerId} onKeyDown={handleListKeyDown} onBlur={handleBlur}>
        <Items role="none">
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
        </Items>
      </AttachedList>
    </>
  );
}

const Trigger = styled.button<{ $side: "below" | "above"; $capOpenRadius: boolean }>`
  ${attachedTrigger}
`;

// Respiro igual em cima e embaixo dos itens. Fica dentro da lista, depois da linha que a separa da
// pílula: a linha continua colada à junção.
const Items = styled.div`
  padding-block: 4px;
`;

// Itens de 44 px (o alvo de toque mínimo). O recuo é o da pílula: o ícone do item fica na coluna do primeiro caractere dela.
// Fora o recuo, tudo em `em` (vão, ícone, "?"): a largura escala com a fonte e o ajuste dela é uma conta só.
const Item = styled(BlockableButton)`
  display: flex;
  align-items: center;
  gap: calc(10em / 17); /* 10 px no corpo de 17 px */
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 4px var(--pill-padding-right) 4px var(--pill-padding-left);
  margin: 0;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  /* A fonte que cabe na largura da pílula (useAttachedList); antes de medir, a de referência. */
  font-size: var(${ROW_FONT_VAR}, min(1em, ${MENU_ITEM_MAX_FONT_PX}px));
  /* No piso de 10 px, se ainda assim não couber, o rótulo quebra em vez de passar por baixo do "?". */
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
  /* O "?" escala só com a fonte (sem o piso de 20 px do BlockableButton), como o resto do item. */
  & [data-help-mark] {
    min-height: 0;
  }
`;
