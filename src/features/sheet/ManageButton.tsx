import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";

interface ManageButtonProps {
  isFree: boolean;
  isFloating: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ManageButton({
  isFree,
  isFloating,
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
            <MenuItem onClick={handleEdit}>✏ Editar</MenuItem>
            {isFree && (
              <MenuItemDanger onClick={handleDelete}>🗑 Excluir</MenuItemDanger>
            )}
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
          message="Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          confirmBackground="linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%)"
          confirmTextColor="black"
          dialogBackground="rgba(0, 0, 0, 0.85)"
          cancelBackground="#1c1c1c"
          cancelBorderColor="#555"
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
  background: #1c1c1c;
  border: 1px solid ${({ $open }) => ($open ? "#ffa216" : "#555")};
  color: white;
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
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
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
  background: #1c1c1c;
  border: 1px solid #555;
  border-radius: 8px;
  overflow: hidden;
  min-width: 160px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.6);
  z-index: 20;
`;

const MenuItem = styled.div`
  padding: 12px 18px;
  color: white;
  font-family: "Roboto", sans-serif;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 1px solid #333;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: #2a2a2a;
  }
`;

const MenuItemDanger = styled(MenuItem)`
  color: #f38ba8;
`;
