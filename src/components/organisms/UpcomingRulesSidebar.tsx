import styled from "styled-components";
import RulesSidebar from "./RulesSidebar";
import RuleSection from "../molecules/RuleSection";
import ComingSoonBadge from "../ions/ComingSoonBadge";

type RulesScope = "campaign" | "match";

// Os mesmos quatro cards em todas as telas; só o texto muda entre campanha e partida.
const SECTIONS: Record<RulesScope, { title: string; body: string }[]> = {
  campaign: [
    { title: "Configurações Gerais", body: "As regras da campanha serão configuradas aqui." },
    { title: "Sistema de Combate", body: "Configure o sistema de combate da sua campanha." },
    { title: "Progressão de Personagens", body: "Define como os personagens evoluem durante a campanha." },
    { title: "Nen & Habilidades", body: "Configure as regras para uso e desenvolvimento de Nen." },
  ],
  match: [
    { title: "Configurações Gerais", body: "As regras da partida seguem as definições da campanha." },
    { title: "Sistema de Combate", body: "Configure o sistema de combate da partida." },
    { title: "Progressão de Personagens", body: "Define como os personagens evoluem durante a partida." },
    { title: "Nen & Habilidades", body: "Configure as regras para uso e desenvolvimento de Nen." },
  ],
};

/** Coluna REGRAS enquanto o sistema de regras não existe: selo "Em breve" e a mesma nota em toda tela. */
export default function UpcomingRulesSidebar({ scope }: { scope: RulesScope }) {
  return (
    <RulesSidebar
      badge={<ComingSoonBadge />}
      footer={<Note>Mais opções de configuração serão adicionadas em breve.</Note>}
    >
      {SECTIONS[scope].map(({ title, body }) => (
        <RuleSection key={title} title={title}>
          {body}
        </RuleSection>
      ))}
    </RulesSidebar>
  );
}

// O reset global zera a entrelinha; a nota quebra em duas linhas na coluna estreita.
const Note = styled.span`
  line-height: 1.35;
`;
