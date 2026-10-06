import styled from "styled-components";
import ReactionButtons from "./ReactionButtons";
import type { ReactionButton, ReactionStatus } from "./reactionModel";
import { PanelTitle } from "./panelStyles";

/**
 * A seção "Você é alvo" do painel (D2): os mesmos botões que aparecem ao lado da peça, um
 * grupo por alvo, sempre com o nome. Cobre o alvo sem peça visível e o celular com a peça
 * fora da tela, e é o lugar fixo do estado ("aguardando o mestre"). Sem alvos, nada.
 */
export default function ReactionPanel({
  targets,
  nameOf,
  onQuick,
  onConfigure,
}: {
  targets: Array<{ actorId: string; status: ReactionStatus }>;
  nameOf: (id: string) => string;
  onQuick: (actorId: string, b: ReactionButton) => void;
  onConfigure: (actorId: string, b: ReactionButton) => void;
}) {
  if (targets.length === 0) return null;
  return (
    <Section aria-label="Você é alvo">
      <PanelTitle>Você é alvo</PanelTitle>
      {targets.map((t) => (
        <ReactionButtons
          key={t.actorId}
          status={t.status}
          name={nameOf(t.actorId)}
          showName
          onQuick={(b) => onQuick(t.actorId, b)}
          onConfigure={(b) => onConfigure(t.actorId, b)}
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
