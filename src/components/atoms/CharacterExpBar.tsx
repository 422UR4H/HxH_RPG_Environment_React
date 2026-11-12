import styled from "styled-components";
import { colors } from "../../styles/tokens";
import BarBubble, { BAR_BUBBLE_FONT_SIZE, BAR_BUBBLE_RIGHT } from "../ions/BarBubble";

interface CharacterExpBarProps {
  currExp: number;
  maxExp: number;
  level?: number;
  /** Manda só os números da EXP para o tooltip (criação/edição, onde colidem com o select); o Lv continua visível no canto. */
  labelsInTooltip?: boolean;
}

export default function CharacterExpBar({ currExp, maxExp, level, labelsInTooltip = false }: CharacterExpBarProps) {
  const percentage = maxExp > 0 ? Math.min((currExp / maxExp) * 100, 100) : 0;
  const hasLevel = level !== undefined;
  const hasExp = maxExp > 0;
  const expLabel = `${currExp} / ${maxExp}`;

  const bar = (
    <BarBorder
      role="progressbar"
      aria-valuenow={currExp}
      aria-valuemin={0}
      aria-valuemax={maxExp}
      aria-label="Experiência"
    >
      <BarBackground>
        <BarFill $percentage={percentage} />
      </BarBackground>
    </BarBorder>
  );

  if (labelsInTooltip) {
    const lvText = `Lv ${level}`;
    return (
      <Container $bubbleClearsChars={hasLevel ? lvText.length : undefined}>
        {/* O Lv fica sozinho no canto (sem a margem que o separa do número da EXP); o balão leva
            só os números, sem repetir o Lv que já está na tela. Sem EXP (antes de escolher a
            classe) não há balão. */}
        {hasLevel && (
          <RightLabels>
            <LvLabel $alone>{lvText}</LvLabel>
          </RightLabels>
        )}
        {hasExp ? (
          <BarBubble label={expLabel} align="right">
            {bar}
          </BarBubble>
        ) : (
          bar
        )}
      </Container>
    );
  }

  return (
    <Container>
      {/* Os filhos ficam divididos em nós de texto como no original: o Chrome modela o texto por nó e o card é pixel-tuned. */}
      <RightLabels>
        {hasLevel && <LvLabel>Lv {level}</LvLabel>}
        {hasExp && <ExpLabel>{currExp} / {maxExp}</ExpLabel>}
      </RightLabels>
      {bar}
    </Container>
  );
}

// O balão tem o tamanho das etiquetas que ele substitui.
const labelFontSize = (property: string) => `
  ${property}: 3cqi;

  @container (max-width: 609px) {
    ${property}: 4cqi;
  }
  /* Piso de 10 px (e não os 11 do plano: com 11 a classe encostava no Lv), só em card de
     220 px ou mais. No card do lobby (cerca de 180 px) qualquer piso cobre o fim da classe:
     ali o tamanho fica como estava, pendente do designer. */
  @container (min-width: 220px) and (max-width: 609px) {
    ${property}: max(4cqi, 10px);
  }
`;

/* Afasta o balão para a esquerda do Lv sozinho: a borda do Lv (mesma de RightLabels) + a
   largura estimada do texto (~0,5 em por caractere na fonte do LvLabel) + um respiro. Em tela
   muito estreita o balão pode cobrir o Lv, e tudo bem. */
const bubbleClearsLv = (chars: number) => {
  const lvWidth = `${chars} * 0.5 * max(4cqi, 10px)`;
  return `
    ${BAR_BUBBLE_RIGHT}: calc(12px + ${lvWidth} + 2cqi);

    @container (max-width: 609px) {
      ${BAR_BUBBLE_RIGHT}: calc(3% + ${lvWidth} + 2cqi);
    }
  `;
};

const Container = styled.div<{ $bubbleClearsChars?: number }>`
  position: relative;
  width: 100%;
  ${labelFontSize(BAR_BUBBLE_FONT_SIZE)}
  ${({ $bubbleClearsChars }) => ($bubbleClearsChars ? bubbleClearsLv($bubbleClearsChars) : "")}
`;

const sharedLabelStyles = `
  color: ${colors.textPrimary};
  ${labelFontSize("font-size")}
  font-weight: 600;
  text-shadow: 1px 1px 4px ${colors.shadowText};
  white-space: nowrap;
`;

const RightLabels = styled.div`
  position: absolute;
  bottom: calc(100% + 2px);
  right: 12px;
  display: flex;
  align-items: baseline;
  gap: 6px;
  pointer-events: none;
  z-index: 10;

  @container (max-width: 609px) {
    right: 3%;
  }
`;

const LvLabel = styled.span<{ $alone?: boolean }>`
  ${sharedLabelStyles}
  font-size: 4cqi;
  margin-right: ${({ $alone }) => ($alone ? "0" : "2cqi")};

  /* Mesmo piso e mesma faixa do número da EXP (ver sharedLabelStyles). */
  @container (min-width: 220px) {
    font-size: max(4cqi, 10px);
  }
`;

const ExpLabel = styled.span`
  ${sharedLabelStyles}
`;

const BarBorder = styled.div`
  width: 100%;
  border: 3px solid ${colors.textOnLight};

  @container (max-width: 609px) {
    border-width: 0.6cqi;
  }
`;

const BarBackground = styled.div`
  width: 100%;
  height: 1.3cqi;
  background-color: ${colors.surfaceControl};
  overflow: hidden;
`;

const BarFill = styled.div<{ $percentage: number }>`
  width: ${({ $percentage }) => $percentage}%;
  height: 100%;
  background-color: ${colors.vitalExp};
  transition: width 0.3s ease;
`;
