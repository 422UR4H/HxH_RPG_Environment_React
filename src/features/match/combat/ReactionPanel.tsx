import styled from "styled-components";
import ReactionButtons from "./ReactionButtons";
import { buttonOfKind } from "./reactionModel";
import type { ReactionButton, ReactionStatus } from "./reactionModel";
import type { ReactionKind } from "./combatMessages";
import { PanelTitle } from "./panelStyles";

/**
 * A seção "Você é alvo" do painel (D2): os mesmos botões que aparecem ao lado da peça, um
 * grupo por alvo, sempre com o nome. Cobre o alvo sem peça visível e o celular com a peça
 * fora da tela, e é o lugar fixo do estado ("aguardando o mestre"). Sem alvos, nada.
 * O mestre usa a mesma seção pelos NPCs, com outro título — "você" ali não é ele.
 */
export default function ReactionPanel({
  targets,
  nameOf,
  onQuick,
  onConfigure,
  title = "Você é alvo",
  pick,
  onCancelPick,
}: {
  targets: Array<{ actorId: string; status: ReactionStatus }>;
  nameOf: (id: string) => string;
  onQuick: (actorId: string, b: ReactionButton) => void;
  onConfigure: (actorId: string, b: ReactionButton) => void;
  title?: string;
  /** A fuga armada (escolhendo a casa no mapa). */
  pick?: { actorId: string; kind: ReactionKind } | null;
  onCancelPick?: () => void;
}) {
  if (targets.length === 0) return null;
  return (
    <Section aria-label={title}>
      <PanelTitle>{title}</PanelTitle>
      {targets.map((t) => (
        <ReactionButtons
          key={t.actorId}
          status={t.status}
          name={nameOf(t.actorId)}
          showName
          onQuick={(b) => onQuick(t.actorId, b)}
          onConfigure={(b) => onConfigure(t.actorId, b)}
          armed={pick?.actorId === t.actorId ? buttonOfKind(pick.kind) : undefined}
          onCancelArmed={onCancelPick}
        />
      ))}
    </Section>
  );
}

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 12px 0;
`;
