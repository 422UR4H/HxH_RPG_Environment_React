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

    const checkFloat = () => {
      const scrollBottom = root.scrollTop + root.clientHeight;
      const contentHeight = root.scrollHeight;
      setIsFloating(scrollBottom < contentHeight - 30);
    };
    const timers = [0, 50, 150, 300, 500].map((t) => setTimeout(checkFloat, t));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;

    const scrollBottom = debouncedScrollPosition + root.clientHeight;
    const contentHeight = root.scrollHeight;
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
  bottom: 22px;
  left: 0px;
  z-index: 10;
  height: 91px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
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
        right: 60px;
        border-radius: 50px;
        padding: 15px 30px 15px 26px;
        background: linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%);
        color: black;
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
        width: 93.6%;
        height: 100%;
        justify-content: center;
        padding: 15px;
        border-radius: 8px;
        background: linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%);
        color: black;
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
