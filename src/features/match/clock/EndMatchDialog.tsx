// Encerrar a partida (spec 2026-11-08 §5). Dois passos (dono): primeiro a confirmação de que
// não dá para desfazer; depois a hora exata do fim na história (obrigatória) e o resumo final
// opcional. Enviado, o diálogo fica de pé esperando o servidor: o `match_ended` leva todo mundo
// para a página da partida; uma recusa aparece aqui dentro.
import { useState } from "react";
import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { ChoiceLabel } from "../combat/choiceStyles";
import { combatErrorText } from "../combat/combatErrorMessages";
import type { WsError } from "../combat/combatErrorMessages";
import { Dialog, DialogHint, DialogTitle, Overlay } from "../combat/dialogStyles";
import ClockEditor from "./ClockEditor";
import FinalDescriptionField from "./FinalDescriptionField";
import type { EndMatchPayload, LimitReason } from "./clockMessages";
import { LIMIT_REASON_COPY } from "./limitReasons";

const CONFIRM_MESSAGE =
  "Encerrar a partida? Não dá para desfazer: depois de encerrada, a partida não volta para a mesa.";

export default function EndMatchDialog({
  open,
  now,
  limitAt,
  limitReason,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  /** A hora da história ao vivo (com o tempo real ligado ela anda). */
  now: string | null;
  limitAt: string | null;
  limitReason: LimitReason | "";
  /** A recusa do `end_match` desta abertura. */
  error: WsError | null;
  /** `false`: o envio nem saiu (socket fechado) — o diálogo não fica esperando. */
  onConfirm: (p: EndMatchPayload) => boolean | void;
  onCancel: () => void;
}) {
  // A base do editor é congelada ao continuar: com o tempo real correndo, a prévia "+x" e o
  // valor escolhido não podem andar sozinhos enquanto o mestre digita (como no painel, R10).
  const [editing, setEditing] = useState<{ base: string; minimum: string | null } | null>(null);
  const [summary, setSummary] = useState("");
  const [pending, setPending] = useState(false);
  const [seenError, setSeenError] = useState<WsError | null>(error);
  if (error !== seenError) {
    setSeenError(error);
    if (error) setPending(false);
  }
  // Reabrir começa de novo pela confirmação (ajuste durante a renderização, como no Nova cena).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setEditing(null);
      setSummary("");
      setPending(false);
    }
  }
  if (!open) return null;

  if (editing === null) {
    return (
      <ConfirmDialog
        message={CONFIRM_MESSAGE}
        confirmLabel="Continuar"
        confirmVariant="danger"
        cancelLabel="Cancelar"
        // Sem hora não há o que encerrar — o botão da mesa já trava nesse caso.
        onConfirm={() => {
          if (now) setEditing({ base: now, minimum: limitAt });
        }}
        onCancel={onCancel}
      />
    );
  }

  const send = (storyAt: string, confirmLongSkip: boolean) => {
    if (pending) return;
    const final = summary.trim();
    const sent = onConfirm({ storyAt, ...(final ? { briefFinalDescription: final } : {}), confirmLongSkip });
    setPending(sent !== false);
  };

  const shownError = error && !pending ? error : null;

  return (
    <Overlay onClick={onCancel}>
      <ScrollDialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-match-title"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle id="end-match-title">Encerrar partida</DialogTitle>
        <DialogHint>Todos saem da mesa e vão para a página da partida.</DialogHint>

        <FinalDescriptionField
          id="end-match-summary"
          label="Resumo final"
          value={summary}
          onChange={setSummary}
        />

        {shownError && (
          <ErrorText role="alert">{combatErrorText(shownError.code, shownError.message, shownError.sentType)}</ErrorText>
        )}

        <Field>
          <ChoiceLabel>Hora exata do fim na história</ChoiceLabel>
          {/* O mínimo é o limite do relógio; o +1 s de um round que conta o front não sabe —
              a recusa clock_below_limit do servidor aparece acima. */}
          <ClockEditor
            base={editing.base}
            minimum={editing.minimum}
            minimumReason={limitReason ? LIMIT_REASON_COPY[limitReason] : undefined}
            allowUnchanged
            submitLabel="Encerrar partida"
            onSubmit={send}
            onCancel={onCancel}
          />
        </Field>
      </ScrollDialog>
    </Overlay>
  );
}

// Em celular o editor e o resumo não cabem: rola por dentro, sem sair da tela.
const ScrollDialog = styled(Dialog)`
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  overscroll-behavior: contain;

  @media (max-width: 400px) {
    padding: 20px 16px;
    width: calc(100% - 24px);
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ErrorText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.feedbackDanger};
`;
