import { useState } from "react";
import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import {
  Buttons, CancelButton, ConfirmButton, Dialog, DialogHint, DialogTitle, Overlay,
} from "./dialogStyles";
import { ChoiceLabel, Toggle, Toggles } from "./choiceStyles";
import type { ChangeScenePayload, SceneCategory } from "./combatMessages";
import { combatErrorText } from "./combatErrorMessages";
import type { WsError } from "./combatErrorMessages";
import { SCENE_LABEL } from "./sceneLabels";
import ClockEditor from "../clock/ClockEditor";
import CombatSummaryBlock from "../clock/CombatSummaryBlock";
import type { CombatSummary } from "../clock/clockMessages";

/** `scenes.brief_final_description` no banco. */
const FINAL_MAX = 255;

/**
 * `change_scene`: fecha cena e rodada correntes e abre a nova. A categoria vai minúscula (contrato).
 * Se a cena que fecha é de combate, o diálogo vira "Encerrar combate" (spec 2026-11-08 §4): o
 * resumo do combate, a hora exata do fim (o editor do relógio, sem descer do mínimo) e a
 * descrição final; em roleplay entra só a descrição final opcional.
 */
export default function SceneChangeDialog({
  open,
  currentCategory,
  summary,
  summaryFailed,
  nameOf,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  /** A categoria da cena que fecha. */
  currentCategory: SceneCategory;
  /** A resposta do `get_combat_summary` desta abertura (null enquanto não chega). */
  summary: CombatSummary | null;
  /** O resumo foi recusado: cai no layout de roleplay. */
  summaryFailed: boolean;
  nameOf: (characterId: string) => string;
  /** A recusa do `change_scene` desta abertura. */
  error: WsError | null;
  /** `false`: o envio nem saiu (socket fechado) — o diálogo não fica esperando. */
  onConfirm: (p: ChangeScenePayload) => boolean | void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<SceneCategory>("battle");
  const [description, setDescription] = useState("");
  const [finalDescription, setFinalDescription] = useState("");
  // Enviado, esperando o servidor: o diálogo fica aberto até a cena trocar ou chegar a recusa.
  const [pending, setPending] = useState(false);
  const [seenError, setSeenError] = useState<WsError | null>(error);
  if (error !== seenError) {
    setSeenError(error);
    if (error) setPending(false);
  }
  // D1: o diálogo fica sempre montado (`!open` só esconde) — sem isso, os campos sobrevivem a
  // Cancelar/confirmar e o próximo open reabre com o que foi digitado antes.
  // Ajuste de estado durante a renderização (padrão do React para resetar ao mudar uma prop,
  // sem o flash de um useEffect): só dispara na transição PARA aberto.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCategory("battle");
      setDescription("");
      setFinalDescription("");
      setPending(false);
    }
  }
  if (!open) return null;

  const battle = currentCategory === "battle" && !summaryFailed;
  const loading = battle && summary === null;
  const title = battle ? "Encerrar combate e trocar de cena" : "Nova cena";

  const send = (clock?: { storyAt: string; confirmLongSkip: boolean }) => {
    if (pending) return;
    const final = finalDescription.trim();
    const sent = onConfirm({
      category,
      briefInitialDescription: description.trim(),
      ...(final ? { briefFinalDescription: final } : {}),
      ...(clock ?? {}),
    });
    setPending(sent !== false);
  };

  const shownError = error && !pending ? error : null;

  return (
    <Overlay onClick={onCancel}>
      <ScrollDialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-change-title"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle id="scene-change-title">{title}</DialogTitle>
        {!battle && <DialogHint>Fecha a cena e a rodada atuais e abre uma cena nova.</DialogHint>}

        <Section aria-labelledby="scene-current">
          <SectionTitle id="scene-current">Cena atual</SectionTitle>
          {battle && (loading
            ? <Loading role="status">Calculando o combate…</Loading>
            : summary && <CombatSummaryBlock summary={summary} nameOf={nameOf} />)}
          <Field>
            <LabelRow>
              <ChoiceLabel as="label" htmlFor="scene-final-desc">
                Descrição final <Optional>(opcional)</Optional>
              </ChoiceLabel>
              <Counter aria-hidden="true">{`${finalDescription.length}/${FINAL_MAX}`}</Counter>
            </LabelRow>
            <FinalInput
              id="scene-final-desc"
              rows={3}
              maxLength={FINAL_MAX}
              value={finalDescription}
              onChange={(e) => setFinalDescription(e.target.value)}
            />
          </Field>
        </Section>

        <Section aria-labelledby="scene-next">
          <SectionTitle id="scene-next">Nova cena</SectionTitle>
          <Field>
            <ChoiceLabel id="scene-category">Categoria</ChoiceLabel>
            <Toggles role="radiogroup" aria-labelledby="scene-category">
              {(Object.keys(SCENE_LABEL) as SceneCategory[]).map((c) => (
                <Toggle
                  key={c}
                  type="button"
                  role="radio"
                  $tone="move"
                  aria-checked={category === c}
                  onClick={() => setCategory(c)}
                >
                  {SCENE_LABEL[c]}
                </Toggle>
              ))}
            </Toggles>
          </Field>
          <Field>
            <ChoiceLabel as="label" htmlFor="scene-desc">Descrição inicial</ChoiceLabel>
            <DescInput id="scene-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </Section>

        {shownError && (
          <ErrorText role="alert">{combatErrorText(shownError.code, shownError.message, shownError.sentType)}</ErrorText>
        )}

        {battle && summary ? (
          // O botão principal é o do editor: ele é quem conhece o mínimo e a confirmação do salto longo.
          <Field>
            <ChoiceLabel>Hora exata do fim do combate</ChoiceLabel>
            <ClockEditor
              base={summary.minimumStoryAt}
              minimum={summary.minimumStoryAt}
              minimumReason="os rounds do combate já estão no relógio"
              allowUnchanged
              submitLabel="Encerrar combate e trocar de cena"
              onSubmit={(storyAt, confirmLongSkip) => send({ storyAt, confirmLongSkip })}
              onCancel={onCancel}
            />
          </Field>
        ) : (
          <Buttons>
            <CancelButton type="button" onClick={onCancel}>Cancelar</CancelButton>
            <ConfirmButton
              type="button"
              disabled={loading}
              aria-disabled={pending || undefined}
              onClick={() => send()}
            >
              Trocar de cena
            </ConfirmButton>
          </Buttons>
        )}
      </ScrollDialog>
    </Overlay>
  );
}

// Em celular o combate com hiatos e o editor não cabem: rola por dentro, sem sair da tela.
const ScrollDialog = styled(Dialog)`
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  overscroll-behavior: contain;

  @media (max-width: 400px) {
    padding: 20px 16px;
    width: calc(100% - 24px);
  }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid ${colors.borderInput};
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${colors.textMuted};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`;

const Optional = styled.span`
  font-weight: 400;
  color: ${colors.textPlaceholderStrong};
`;

const Counter = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${colors.textPlaceholderStrong};
`;

const Loading = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${colors.textMuted};
`;

const DescInput = styled.input`
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  border: 1px solid ${colors.surfaceInputHover};
  border-radius: 8px;
  font-size: 14px;
  min-height: 40px;
  padding: 0 10px;
`;

const FinalInput = styled.textarea`
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  border: 1px solid ${colors.surfaceInputHover};
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  padding: 8px 10px;
  resize: vertical;
`;

const ErrorText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.feedbackDanger};
`;
