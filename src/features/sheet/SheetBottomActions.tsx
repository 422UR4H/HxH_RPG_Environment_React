import { useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import ManageButton from "../../components/molecules/ManageButton";
import type { ManageActions } from "../../components/molecules/ManageButton";
import styled from "styled-components";
import { colors, gradients } from "../../styles/tokens";
import { floatingElevation } from "../../styles/bottomBar";

interface SheetBottomActionsProps {
  onCampaignClick?: () => void;
  campaignLabel?: string;
  manage?: ManageActions;
}

export default function SheetBottomActions({
  onCampaignClick,
  campaignLabel = "Procurar Campanhas",
  manage,
}: SheetBottomActionsProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const debouncedScroll = useDebounce(scrollPosition, 50);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;
    const checkScroll = () => setScrollPosition(root.scrollTop);
    checkScroll();
    root.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      root.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;
    const check = () => {
      setIsFloating(
        root.scrollTop + root.clientHeight < root.scrollHeight - 30,
      );
    };
    const timers = [0, 50, 150, 300, 500].map((t) => setTimeout(check, t));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;
    setIsFloating(debouncedScroll + root.clientHeight < root.scrollHeight - 30);
  }, [debouncedScroll]);

  if (isFloating) {
    return (
      <FloatingWrapper>
        <FloatingGroup>
          {manage && <ManageButton {...manage} isFloating={true} />}
          {onCampaignClick && (
            <CampaignButton $isFloating onClick={onCampaignClick}>
              <span>{campaignLabel}</span>
            </CampaignButton>
          )}
        </FloatingGroup>
      </FloatingWrapper>
    );
  }

  return (
    <AnchoredWrapper>
      <DockedRow>
        {manage && <ManageButton {...manage} isFloating={false} />}
        {onCampaignClick && (
          <CampaignButton $isFloating={false} onClick={onCampaignClick}>
            <span>{campaignLabel}</span>
          </CampaignButton>
        )}
      </DockedRow>
    </AnchoredWrapper>
  );
}

const FloatingWrapper = styled.div`
  container-type: inline-size;
`;

// O container fica sem recuo para o cqi dos botões ser o mesmo do flutuante; o recuo vai na linha de dentro.
const AnchoredWrapper = styled.div`
  container-type: inline-size;
  position: absolute;
  bottom: 22px;
  left: 0;
  z-index: 10;
  height: 91px;
  width: 100%;
  display: flex;
  align-items: flex-end;

  @media (max-width: 440px) {
    height: 70px;
  }
`;

// Mesmo arranjo do FloatingGroup (Gerenciar à esquerda, campanha à direita, 12 px de respiro); só a posição muda.
const DockedRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 0 30px;
  box-sizing: border-box;
  margin-bottom: -2px;

  @media (max-width: 609px) {
    padding-inline: 20px;
  }
`;

// Um desenho só: encaixado ou flutuando, é a mesma pílula (CON-09). Muda a sombra.
const CampaignButton = styled.button<{ $isFloating: boolean }>`
  margin-left: auto;
  white-space: nowrap;
  border: none;
  border-radius: 50px;
  padding: min(15px, 3.6cqi) min(30px, 5cqi) min(15px, 3.6cqi) min(26px, 5cqi);
  background: ${gradients.orange};
  color: ${colors.textOnLight};
  font-size: min(26px, 5cqi);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  ${({ $isFloating }) =>
    $isFloating
      ? `box-shadow: ${floatingElevation(colors.shadowFloating, colors.borderFloating, colors.borderFloatingHighlight)};`
      : ""}
  transition: all 0.3s ease;

  @media (max-width: 609px) {
    padding: 0 0.9em;
    min-height: 44px;
    font-size: clamp(13px, 3.75cqi, 20px);
    gap: 4px;
  }

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;

// Uma única faixa fixa: os dois botões dividem a largura e nunca se sobrepõem.
// A faixa não captura toque; só os botões (e o menu de Gerenciar) capturam.
const FloatingGroup = styled.div`
  position: fixed;
  bottom: 20px;
  left: max(16px, min(60px, 5cqi));
  right: max(16px, min(60px, 5cqi));
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`;
