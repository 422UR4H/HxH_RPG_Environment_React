import { useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import PlusIcon from "../../components/ions/PlusIcon";
import styled from "styled-components";

interface SheetCampaignButtonProps {
  label: string;
  onClick: () => void;
}

export default function SheetCampaignButton({
  label,
  onClick,
}: SheetCampaignButtonProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const debouncedScrollPosition = useDebounce(scrollPosition, 50);

  useEffect(() => {
    const checkScroll = () => setScrollPosition(window.scrollY);
    checkScroll();
    window.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  useEffect(() => {
    const scrollBottom = debouncedScrollPosition + window.innerHeight;
    const contentHeight = document.documentElement.scrollHeight;
    setIsFloating(scrollBottom < contentHeight - 30);
  }, [debouncedScrollPosition]);

  return (
    <ButtonWrapper $isFloating={isFloating}>
      <ActionButton $isFloating={isFloating} onClick={onClick}>
        <PlusIcon />
        <span>{label}</span>
      </ActionButton>
    </ButtonWrapper>
  );
}

const ButtonWrapper = styled.div<{ $isFloating: boolean }>`
  position: absolute;
  bottom: 0px;
  left: 0px;
  z-index: 10;
  height: 91px;
  width: 100%;
`;

const ActionButton = styled.button<{ $isFloating: boolean }>`
  border: none;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;

  ${({ $isFloating }) =>
    $isFloating
      ? `
        position: fixed;
        bottom: 20px;
        right: 20px;
        border-radius: 50px;
        padding: 15px 30px 15px 26px;
        background-color: #107135;
        color: white;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        gap: 10px;

        font-family: "Roboto", sans-serif;
        font-size: 26px;
        font-weight: 600;

        &:hover {
          transform: translateY(-5px);
          filter: brightness(1.1);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
        }
        &:active {
          transform: scale(0.98);
        }
      `
      : `
        position: relative;
        width: 100%;
        height: 100%;
        justify-content: center;
        padding: 15px;
        border-radius: 8px;
        background-color: #107135;
        color: white;
        box-shadow: none;
        gap: 15px;

        font-family: "Roboto", sans-serif;
        font-size: 26px;
        font-weight: 600;

        &:hover {
          transform: translateY(-5px);
          filter: brightness(1.1);
        }
        &:active {
          transform: scale(0.98);
        }
      `}
`;
