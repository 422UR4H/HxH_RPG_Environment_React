import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { ChangeScenePayload, SceneCategory } from "./combatMessages";

const CATEGORY_LABELS: Record<SceneCategory, string> = { battle: "Batalha", roleplay: "Interpretação" };

/** `change_scene`: fecha cena e round correntes e abre a nova. A categoria vai minúscula (contrato). */
export default function SceneChangeDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (p: ChangeScenePayload) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<SceneCategory>("battle");
  const [description, setDescription] = useState("");
  // D1: o diálogo fica sempre montado (`!open` só esconde) — sem isso, category/description
  // sobrevivem a Cancelar/confirmar e o próximo open reabre com o que foi digitado antes.
  // Ajuste de estado durante a renderização (padrão do React para resetar ao mudar uma prop,
  // sem o flash de um useEffect): só dispara na transição PARA aberto.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCategory("battle");
      setDescription("");
    }
  }
  if (!open) return null;
  return (
    <Overlay onClick={onCancel}>
      <Dialog role="dialog" aria-modal aria-label="Nova cena" onClick={(e) => e.stopPropagation()}>
        <Title>Nova cena</Title>
        <Hint>Fecha a cena e o round atuais e abre uma cena nova.</Hint>
        <Radios role="radiogroup" aria-label="Categoria">
          {(Object.keys(CATEGORY_LABELS) as SceneCategory[]).map((c) => (
            <label key={c}>
              <input type="radio" name="scene-category" checked={category === c} onChange={() => setCategory(c)} />
              {CATEGORY_LABELS[c]}
            </label>
          ))}
        </Radios>
        <label htmlFor="scene-desc">Descrição inicial</label>
        <DescInput id="scene-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Buttons>
          <CancelButton type="button" onClick={onCancel}>Cancelar</CancelButton>
          <ConfirmButton
            type="button"
            onClick={() => onConfirm({ category, briefInitialDescription: description.trim() })}
          >
            Trocar de cena
          </ConfirmButton>
        </Buttons>
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.overlay};
`;

const Dialog = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 420px;
  width: 90%;
  padding: 24px;
  border-radius: 12px;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
`;

const Title = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
`;

const Radios = styled.div`
  display: flex;
  gap: 12px;
`;

const DescInput = styled.input`
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  border: 1px solid ${colors.surfaceInputHover};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 13px;
  padding: 4px 6px;
`;

const Buttons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ButtonBase = styled.button`
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 600;
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`;

const CancelButton = styled(ButtonBase)`
  background: transparent;
  border: 1px solid ${colors.textPrimary};
  color: ${colors.textPrimary};
`;

const ConfirmButton = styled(ButtonBase)`
  background: ${colors.dangerDark};
  color: ${colors.textPrimary};
`;
