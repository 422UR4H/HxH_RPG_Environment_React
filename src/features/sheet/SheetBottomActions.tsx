import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import ManageButton from "../../components/molecules/ManageButton";
import type { ManageActions } from "../../components/molecules/ManageButton";
import styled from "styled-components";
import { colors, gradients } from "../../styles/tokens";
import { dockThresholdPx, floatingBottomPx, floatingElevation } from "../../styles/bottomBar";

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Folga entre a janela e a coluna da ficha (só existe quando a coluna está
  // limitada pelo max-width): o grupo fixo se prende às bordas da coluna.
  const [columnGap, setColumnGap] = useState({ left: 0, right: 0 });

  useLayoutEffect(() => {
    if (!isFloating) return;
    const measure = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      // Coluna ocupando a largura toda (telas estreitas): comportamento atual.
      const capped = rect.width < viewportWidth - 1 && rect.left > 1;
      const next = capped
        ? { left: Math.round(rect.left), right: Math.round(viewportWidth - rect.right) }
        : { left: 0, right: 0 };
      setColumnGap((prev) =>
        prev.left === next.left && prev.right === next.right ? prev : next,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isFloating]);

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
        root.scrollTop + root.clientHeight < root.scrollHeight - dockThresholdPx,
      );
    };
    const timers = [0, 50, 150, 300, 500].map((t) => setTimeout(check, t));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;
    setIsFloating(debouncedScroll + root.clientHeight < root.scrollHeight - dockThresholdPx);
  }, [debouncedScroll]);

  if (isFloating) {
    return (
      <FloatingWrapper ref={wrapperRef}>
        <FloatingGroup
          style={{
            "--column-left": `${columnGap.left}px`,
            "--column-right": `${columnGap.right}px`,
          } as CSSProperties}
        >
          {manage && <ManageButton {...manage} isFloating={true} />}
          {onCampaignClick && (
            <FloatingCampaignButton onClick={onCampaignClick}>
              <span>{campaignLabel}</span>
            </FloatingCampaignButton>
          )}
        </FloatingGroup>
      </FloatingWrapper>
    );
  }

  return (
    <AnchoredWrapper>
      {manage && <ManageButton {...manage} isFloating={false} />}
      {onCampaignClick && (
        <CampaignButton onClick={onCampaignClick}>
          <span>{campaignLabel}</span>
        </CampaignButton>
      )}
    </AnchoredWrapper>
  );
}

const FloatingWrapper = styled.div`
  container-type: inline-size;
`;

const AnchoredWrapper = styled.div`
  container-type: inline-size;
  position: absolute;
  bottom: 22px;
  left: 0;
  z-index: 10;
  height: 91px;
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 30px;
  gap: 20px;
  box-sizing: border-box;

  @media (max-width: 609px) {
    padding-inline: 20px;
    gap: 15px;
  }

  @media (max-width: 440px) {
    height: 70px;
  }
`;

const CampaignButton = styled.button`
  flex: 1;
  height: 100%;
  border: none;
  border-radius: 8px;
  background: ${gradients.orange};
  color: ${colors.textOnLight};
  font-size: min(26px, 5cqi);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: min(15px, 2cqi);
  cursor: pointer;
  transition: all 0.3s ease;
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
  bottom: ${floatingBottomPx}px;
  left: calc(var(--column-left, 0px) + max(16px, min(60px, 5cqi)));
  right: calc(var(--column-right, 0px) + max(16px, min(60px, 5cqi)));
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

const FloatingCampaignButton = styled.button`
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
  box-shadow: ${floatingElevation(colors.shadowFloating, colors.borderFloating, colors.borderFloatingHighlight)};
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
