import { useRef, useEffect, useState, type ReactNode } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import styled from "styled-components";
import { colors } from "../../styles/tokens";
import { floatingElevation } from "../../styles/bottomBar";

interface AdaptiveActionButtonProps {
  label: string;
  /** Antes do rótulo. "+" (`<PlusIcon />`) só em ação que cria algo; navegar ou enviar vai sem ícone. */
  icon?: ReactNode;
  type: "character" | "match";
  onClick: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  contentChangeSignal?: unknown;
}

export default function AdaptiveActionButton({
  label,
  icon,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- listeners attach once per containerRef; checkScroll is recreated each render and only touches refs and a state setter, so the captured closure never goes stale
  }, [containerRef]);

  // Recalculate when the content changes (such as expanding description)
  useEffect(() => {
    if (contentChangeSignal === undefined) return;
    // Check multiple times at different intervals to ensure that
    // the change in the DOM is captured after the animation/transition
    const checkTimes = [50, 150, 300, 500];
    const timers: ReturnType<typeof setTimeout>[] = [];

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
        {icon}
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
  height: var(--bottom-bar-height, 91px);
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
        padding: 15px 30px 15px 26px;
        background-color: ${colors.brandAccent};
        color: ${colors.textPrimary};
        box-shadow: ${floatingElevation(colors.shadowFloating, colors.borderFloating, colors.borderFloatingHighlight)};
        gap: 10px;

        font-size: 26px;
        font-weight: 600;

        &:hover {
          transform: translateY(-5px);
          filter: brightness(1.1);
        }
        &:active {
          transform: scale(0.98);
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
        background-color: ${colors.brandAccent};
        color: ${colors.textPrimary};
        box-shadow: none;
        gap: 15px;

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
