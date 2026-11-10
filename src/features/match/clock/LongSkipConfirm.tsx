import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { formatDelta } from "./storyTime";

/** Mais de 2 dias para frente custa dias de treino aos personagens: o mestre confirma antes. */
export default function LongSkipConfirm({
  deltaSeconds,
  onConfirm,
  onCancel,
}: {
  deltaSeconds: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      message={`Avançar ${formatDelta(deltaSeconds)}? Os personagens perdem os dias de treino desse período.`}
      confirmLabel="Avançar"
      cancelLabel="Voltar"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
