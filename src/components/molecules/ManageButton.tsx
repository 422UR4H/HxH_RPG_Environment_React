import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ConfirmDialog from "./ConfirmDialog";
import BlockableButton from "./BlockableButton";
import penIcon from "../../assets/icons/pen.svg";
import { colors } from "../../styles/tokens";
import { floatingElevation } from "../../styles/bottomBar";

interface ManageButtonProps {
  /** Com motivo, Excluir fica indisponível e o motivo aparece no toque/hover/foco. */
  deleteBlockedReason?: string;
  isFloating: boolean;
  confirmMessage: string;
  onEdit: () => void;
  onDelete: () => void;
}

/** O que a página entrega aos botões de baixo; a posição (flutuante ou não) é deles. */
export type ManageActions = Omit<ManageButtonProps, "isFloating">;

export default function ManageButton({
  deleteBlockedReason,
  isFloating,
  confirmMessage,
  onEdit,
  onDelete,
}: ManageButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleEdit = () => {
    setOpen(false);
    onEdit();
  };

  const handleDelete = () => {
    setOpen(false);
    setShowDeleteConfirm(true);
  };

  return (
    <>
      <Wrapper ref={ref} $isFloating={isFloating}>
        {open && (
          <Menu>
            <MenuItem type="button" onClick={handleEdit}>
              <IconSlot>
                <PenIcon src={penIcon} alt="" />
              </IconSlot>
              Editar
            </MenuItem>
            <DeleteItem blockedReason={deleteBlockedReason} stretch labelAlign="start" onClick={handleDelete}>
              <IconSlot aria-hidden="true">🗑</IconSlot>
              Excluir
            </DeleteItem>
          </Menu>
        )}
        <Button
          type="button"
          $isFloating={isFloating}
          $open={open}
          onClick={() => setOpen((v) => !v)}
        >
          ⚙ Gerenciar {open ? "▴" : "▾"}
        </Button>
      </Wrapper>
      {showDeleteConfirm && (
        <ConfirmDialog
          message={confirmMessage}
          confirmLabel="Excluir"
          confirmVariant="danger"
          dialogBackground={colors.overlayDark}
          cancelBackground={colors.surfacePanel}
          cancelBorderColor={colors.borderMuted}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

// Flutuando, a altura é "auto": na ficha o grupo estica o wrapper e o `height: 100%` do botão segue o
// vizinho; na campanha o grupo fixa a altura por `--manage-floating-height`. Encaixado, preenche a barra.
const Wrapper = styled.div<{ $isFloating: boolean }>`
  position: relative;
  flex-shrink: 0;
  height: ${({ $isFloating }) => ($isFloating ? "auto" : "100%")};
`;

const Button = styled.button<{ $isFloating: boolean; $open: boolean }>`
  background: ${colors.surfacePanel};
  border: 1px solid ${({ $open }) => ($open ? colors.actionAccent : colors.borderMuted)};
  color: ${colors.textPrimary};
  font-size: min(22px, 4cqi);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  transition: all 0.2s ease;

  @media (max-width: 609px) {
    padding-inline: 5cqi;
    gap: 15px;
  }

  ${({ $isFloating }) =>
    $isFloating
      ? `
        border-radius: 50px;
        padding: 14px 22px;
        box-shadow: ${floatingElevation(colors.shadowFloating, colors.borderFloating, colors.borderFloatingHighlight)};
        /* Ao lado do botão principal, o BottomActions define --floating-label-size (mesmo corpo) e
           --manage-floating-height (altura fixa, menor que a do principal). */
        height: var(--manage-floating-height, 100%);
        font-size: var(--floating-label-size, min(24px, 4cqi));
        @media (max-width: 609px) {
          padding: 0 0.9em;
          min-height: 44px;
          font-size: var(--floating-label-size, clamp(13px, 3.75cqi, 20px));
        }
        &:hover { transform: translateY(-3px); filter: brightness(1.2); }
      `
      : `
        border-radius: 8px;
        height: 100%;
        padding: 0 20px;
        /* CON-09: mesmo corpo do rótulo do bloco primário (antes 22px/4cqi, 12px no celular). */
        font-size: min(26px, 5cqi);
        &:hover { filter: brightness(1.2); }
      `}

  &:active {
    transform: scale(0.98);
  }
`;

const Menu = styled.div`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  background: ${colors.surfacePanel};
  border: 1px solid ${colors.borderMuted};
  border-radius: 8px;
  overflow: hidden;
  min-width: 200px;
  box-shadow: 0 -4px 16px ${colors.overlayMedium};
  z-index: 20;
`;

// Os dois itens com a mesma altura, o mesmo recuo e o ícone numa coluna de largura fixa,
// para "Editar" e "Excluir" (e o "?" de indisponível) ficarem alinhados.
const itemCss = `
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 0 18px;
  background: none;
  border: none;
  border-bottom: 1px solid ${colors.surfaceMuted};
  font: inherit;
  font-size: 17px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${colors.surfaceModal};
  }
`;

const MenuItem = styled.button`
  ${itemCss}
  color: ${colors.textPrimary};
`;

const DeleteItem = styled(BlockableButton)`
  ${itemCss}
  color: ${colors.actionDestructiveText};

  &[aria-disabled="true"] {
    color: ${colors.textDisabled};
    cursor: not-allowed;
  }
  &[aria-disabled="true"]:hover {
    background: none;
  }
`;

const IconSlot = styled.span`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 1.4em;
  flex-shrink: 0;
`;

const PenIcon = styled.img`
  width: 1.4em;
  height: 1.4em;
`;
