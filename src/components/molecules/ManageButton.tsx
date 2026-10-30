import { useState } from "react";
import styled from "styled-components";
import ConfirmDialog from "./ConfirmDialog";
import PillMenu from "./PillMenu";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <Wrapper $isFloating={isFloating}>
        <Menu
          $isFloating={isFloating}
          label={(open) => `⚙ Gerenciar ${open ? "▴" : "▾"}`}
          items={[
            {
              key: "edit",
              content: (
                <>
                  <IconSlot>
                    <PenIcon src={penIcon} alt="" />
                  </IconSlot>
                  Editar
                </>
              ),
              onSelect: onEdit,
            },
            {
              key: "delete",
              content: (
                <DeleteTone>
                  <IconSlot aria-hidden="true">🗑</IconSlot>
                  Excluir
                </DeleteTone>
              ),
              onSelect: () => setShowDeleteConfirm(true),
              blockedReason: deleteBlockedReason,
            },
          ]}
        />
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
  flex-shrink: 0;
  height: ${({ $isFloating }) => ($isFloating ? "auto" : "100%")};
`;

// A pílula fechada é a escura de sempre; aberta, o PillMenu a deixa com a borda branca e o lado da
// lista reto, e a lista copia daqui fundo, cor, fonte, borda, recuo e raio.
const Menu = styled(PillMenu)<{ $isFloating: boolean }>`
  background: ${colors.surfacePanel};
  border: 1px solid ${colors.borderMuted};
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

  /* Aberta, a pílula fica parada no lugar: a lista se prende a ela (e a mede) sem o deslocamento
     do hover/clique, e os cantos mudam na hora, como no PillSelect. */
  &&[data-state="open"],
  &&[data-state="closing"] {
    transform: none;
    transition: none;
  }
`;

// Ícone numa coluna de largura fixa, para "Editar" e "Excluir" (e o "?" de indisponível) alinharem.
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

// Só a cor: `display: contents` deixa ícone e rótulo como filhos diretos do item (mesmo espaçamento).
const DeleteTone = styled.span`
  display: contents;
  color: ${colors.actionDestructiveText};

  [aria-disabled="true"] & {
    color: ${colors.textDisabled};
  }
`;
