import { useRef, useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import PlusIcon from "../../components/ions/PlusIcon";
import styled from "styled-components";

interface AdaptiveActionButtonProps {
  label: string;
  type: "character" | "match";
  onClick: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  contentChangeSignal?: any;
}

export default function AdaptiveActionButton({
  label,
  type,
  onClick,
  containerRef,
  contentChangeSignal,
}: AdaptiveActionButtonProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const debouncedScrollPosition = useDebounce(scrollPosition, 50);

  const checkScroll = () => {
    if (!containerRef.current || !buttonRef.current) return;

    const container = containerRef.current;
    setScrollPosition(container.scrollTop);
  };

  // Check if should float based on scroll
  useEffect(() => {
    if (!containerRef.current) return;
    // Initial check
    checkScroll();

    // Add scroll listner
    const currentRef = containerRef.current;
    currentRef.addEventListener("scroll", checkScroll);
    // Check when screen size changes
    window.addEventListener("resize", checkScroll);

    return () => {
      if (currentRef) {
        currentRef.removeEventListener("scroll", checkScroll);
      }
      window.removeEventListener("resize", checkScroll);
    };
  }, [containerRef]);

  // Recalculate when the content changes (such as expanding description)
  useEffect(() => {
    if (contentChangeSignal === undefined) return;
    // Check multiple times at different intervals to ensure that
    // the change in the DOM is captured after the animation/transition
    const checkTimes = [50, 150, 300, 500];
    const timers: number[] = [];

    checkTimes.forEach((time) => {
      const timer = setTimeout(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        // Force direct update of Floating state as well
        const scrollBottom = container.scrollTop + container.clientHeight;
        const contentHeight = container.scrollHeight;

        setScrollPosition(container.scrollTop);
        // Force direct state update
        setIsFloating(scrollBottom < contentHeight - 30);
      }, time);

      timers.push(timer);
    });
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [contentChangeSignal, containerRef]);

  // Use the debounced value to avoid flickering
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollBottom = debouncedScrollPosition + container.clientHeight;
    const contentHeight = container.scrollHeight;

    // Larger margin to avoid overly sensitive activation
    // The button only floats if it's far from the end
    setIsFloating(scrollBottom < contentHeight - 30);
  }, [debouncedScrollPosition, containerRef]);

  return (
    <ButtonWrapper $type={type} $isFloating={isFloating}>
      <ActionButton
        ref={buttonRef}
        $type={type}
        $isFloating={isFloating}
        onClick={onClick}
      >
        <PlusIcon />
        <span>{label}</span>
      </ActionButton>
    </ButtonWrapper>
  );
}

const ButtonWrapper = styled.div<{
  $type: "character" | "match";
  $isFloating?: boolean;
}>`
  /* Absolute positioning so it doesn't affect document flow */
  position: absolute;
  bottom: 0px;
  ${({ $type }) => ($type === "character" ? "left: 0px;" : "left: 0px;")}
  z-index: 10;
  height: 91px;
  width: 100%;

  ${({ $type, $isFloating }) =>
    $type === "match" && $isFloating && "left: 0px;"}
`;

const ActionButton = styled.button<{
  $type: "character" | "match";
  $isFloating: boolean;
}>`
  border: none;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;

  /* Styles based on floating state */
  ${({ $isFloating, $type }) =>
    $isFloating
      ? `
        /* Floating */
        position: fixed;
        bottom: 20px;
        ${$type === "character" ? "left: 20px;" : "left: 340px;"}
        border-radius: 50px;
        padding: 15px 24px 15px 20px;
        background-color: #ffa216;
        color: #1d1d1d;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        gap: 10px;

        font-family: "Roboto", sans-serif;
        font-size: 20px;
        font-weight: 500;

        &:hover {
          background-color: #ff8c00;
        }
      `
      : `
        /* Normal (like a card) */
        position: relative;
        width: 100%;
        height: 100%;
        justify-content: center;
        padding: ${$type === "character" ? "15px" : "20px"};
        border-radius: 8px;
        background-color: #ffa216;
        color: #1d1d1d;
        box-shadow: none;
        gap: 15px;

        border-left: ${$type === "character" ? "4px solid #ffa216" : "none"};
        font-family: "Roboto", sans-serif;
        font-size: 20px;
        font-weight: 500;
        &:hover {
          background-color: #ff8c00;
        }
      `}
`;
