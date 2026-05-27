import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ConfirmDialog from "./ConfirmDialog";
import penIcon from "../../assets/icons/pen.svg";
import { colors, gradients } from "../../styles/tokens";

interface ManageButtonProps {
  isFree: boolean;
  deleteDisabledReason?: string;
  isFloating: boolean;
  confirmMessage: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ManageButton({
  isFree,
  deleteDisabledReason,
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
      <Wrapper ref={ref}>
        {open && (
          <Menu>
            <MenuItem onClick={handleEdit}>
              <PenIcon src={penIcon} alt="" /> Editar
            </MenuItem>
            {isFree ? (
              <MenuItemDanger onClick={handleDelete}>🗑&nbsp; Excluir</MenuItemDanger>
            ) : deleteDisabledReason ? (
              <MenuItemDangerDisabled>
                🗑&nbsp; Excluir
                <DisabledReason>{deleteDisabledReason}</DisabledReason>
              </MenuItemDangerDisabled>
            ) : null}
          </Menu>
        )}
        <Button
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
          confirmBackground={gradients.orange}
          confirmTextColor={colors.textOnLight}
          dialogBackground={colors.overlayDark}
          cancelBackground={colors.grayBgPanel}
          cancelBorderColor={colors.grayMid}
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

const Wrapper = styled.div`
  position: relative;
  flex-shrink: 0;
  height: 100%;
`;

const Button = styled.button<{ $isFloating: boolean; $open: boolean }>`
  background: ${colors.grayBgPanel};
  border: 1px solid ${({ $open }) => ($open ? colors.orange : colors.grayMid)};
  color: ${colors.textPrimary};
  font-family: "Roboto", sans-serif;
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
        box-shadow: 0 4px 10px ${colors.shadowMedium};
        font-size: 3cqi;
        &:hover { transform: translateY(-3px); filter: brightness(1.2); }
      `
      : `
        border-radius: 8px;
        height: 100%;
        padding: 0 20px;
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
  background: ${colors.grayBgPanel};
  border: 1px solid ${colors.grayMid};
  border-radius: 8px;
  overflow: hidden;
  min-width: 160px;
  box-shadow: 0 -4px 16px ${colors.overlayMedium};
  z-index: 20;
`;

const PenIcon = styled.img`
  width: 1.4em;
  height: 1.4em;
`;

const MenuItem = styled.div`
  padding: 12px 14px;
  color: ${colors.textPrimary};
  font-family: "Roboto", sans-serif;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 1px solid ${colors.surfaceMuted};
  display: flex;
  align-items: center;
  gap: 4px;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${colors.grayBgModal};
  }
`;

const MenuItemDanger = styled(MenuItem)`
  color: ${colors.dangerLight};
  padding: 16px 0 16px 18px;
`;

const MenuItemDangerDisabled = styled(MenuItem)`
  color: ${colors.textDisabled};
  padding: 16px 0 16px 18px;
  cursor: not-allowed;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
`;

const DisabledReason = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${colors.textDisabled};
`;
