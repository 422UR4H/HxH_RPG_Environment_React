import { useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import PlusIcon from "../../components/ions/PlusIcon";
import ManageButton from "../../components/molecules/ManageButton";
import styled from "styled-components";
import { colors, gradients } from "../../styles/tokens";

interface SheetBottomActionsProps {
  onCampaignClick?: () => void;
  campaignLabel?: string;
  manage?: {
    isFree: boolean;
    onEdit: () => void;
    onDelete: () => void;
    confirmMessage: string;
  };
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
        {manage && (
          <FloatingLeft>
            <ManageButton {...manage} isFloating={true} />
          </FloatingLeft>
        )}
        {onCampaignClick && (
          <FloatingRight onClick={onCampaignClick}>
            <CampaignPlusIcon />
            <span>{campaignLabel}</span>
          </FloatingRight>
        )}
      </FloatingWrapper>
    );
  }

  return (
    <AnchoredWrapper>
      {manage && <ManageButton {...manage} isFloating={false} />}
      {onCampaignClick && (
        <CampaignButton onClick={onCampaignClick}>
          <CampaignPlusIcon />
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
  font-family: "Roboto", sans-serif;
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

const CampaignPlusIcon = styled(PlusIcon)`
  && {
    font-size: min(36px, 6cqi);
  }
`;

const FloatingLeft = styled.div`
  position: fixed;
  bottom: 20px;
  left: min(60px, 5cqi);
  z-index: 10;
`;

const FloatingRight = styled.button`
  position: fixed;
  bottom: 20px;
  right: min(60px, 5cqi);
  z-index: 10;
  border: none;
  border-radius: 50px;
  padding: min(15px, 2.4cqi) min(30px, 5cqi) min(15px, 2.4cqi) min(26px, 5cqi);
  background: ${gradients.orange};
  color: ${colors.textOnLight};
  font-family: "Roboto", sans-serif;
  font-size: 4cqi;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 4px 10px ${colors.shadowSoft};
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
    box-shadow: 0 8px 15px ${colors.shadowStrong};
  }
  &:active {
    transform: scale(0.98);
  }
`;
