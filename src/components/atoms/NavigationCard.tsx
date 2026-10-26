import { Link } from "react-router-dom";
import styled from "styled-components";
import { colors, fonts, gradients } from "../../styles/tokens";

interface NavigationCardProps {
  to: string;
  title: string;
  description: string;
  bgImage: string;
}

/**
 * Card-link com imagem de fundo. O texto fica no rodapé, sobre um véu escuro — a imagem
 * respira no topo e o texto continua legível sobre qualquer trecho dela. Ocupa a largura
 * que o pai der e se mantém quadrado; a tipografia escala com essa largura (cqi).
 */
export default function NavigationCard({
  to,
  title,
  description,
  bgImage,
}: NavigationCardProps) {
  return (
    <Card to={to}>
      <Background $bgImage={bgImage} aria-hidden="true" />
      <Content>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </Content>
    </Card>
  );
}

const Background = styled.span<{ $bgImage: string }>`
  position: absolute;
  inset: 0;
  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  transition: transform 400ms ease;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: ${gradients.cardScrim};
  }
`;

const Content = styled.span`
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 2cqi;
  padding: 7cqi;
  text-shadow: 0 2px 6px ${colors.shadowText};
`;

const Title = styled.span`
  font-family: ${fonts.display};
  font-size: clamp(22px, 10cqi, 48px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${colors.textPrimary};
`;

const Description = styled.span`
  font-family: ${fonts.sans};
  font-size: clamp(13px, 4.4cqi, 20px);
  line-height: 1.35;
  color: ${colors.textMuted};
`;

const Card = styled(Link)`
  container-type: inline-size;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;

  border: 4px solid ${colors.textOnLight};
  border-radius: 16px;
  box-shadow: 0 4px 6px ${colors.shadowSoft};
  text-decoration: none;
  transition:
    transform 200ms ease,
    box-shadow 200ms ease,
    border-color 200ms ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-5px);
    border-color: ${colors.borderAccent};
    box-shadow: 0 8px 15px ${colors.shadowStrong};

    ${Background} {
      transform: scale(1.06);
    }
  }
  &:focus-visible {
    outline: 2px solid ${colors.textPrimary};
    outline-offset: 3px;
  }
  &:active {
    transform: scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    ${Background} {
      transition: none;
    }
    &:hover,
    &:focus-visible,
    &:active {
      transform: none;

      ${Background} {
        transform: none;
      }
    }
  }
`;
