// src/components/templates/GamePageTemplate.tsx
import { useState } from "react";
import type { ReactNode } from "react";
import styled, { keyframes } from "styled-components";
import { colors } from "../../styles/tokens";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
};

export default function GamePageTemplate({ sidebar, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Root>
      <CanvasArea>{children}</CanvasArea>

      <SidebarOverlay $open={sidebarOpen} onClick={() => setSidebarOpen(false)} />

      <SidebarPanel $open={sidebarOpen}>
        <SidebarHeader>
          <CloseButton
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar painel"
          >
            ✕
          </CloseButton>
        </SidebarHeader>
        <SidebarBody>{sidebar}</SidebarBody>
      </SidebarPanel>

      <ToggleButton
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Abrir painel"
      >
        ☰
      </ToggleButton>
    </Root>
  );
}

// ─── Animations ──────────────────────────────────────────────────────────────

const slideInFromRight = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`;

// ─── Layout ──────────────────────────────────────────────────────────────────

const Root = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  background-color: ${colors.grayBgDeeper};
  overflow: hidden;
`;

const CanvasArea = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
`;

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const SidebarPanel = styled.aside<{ $open: boolean }>`
  background-color: ${colors.surfaceSidebar};
  border-left: 1px solid ${colors.borderInput};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 11;
  width: 260px;
  flex-shrink: 0;

  /* Mobile: hidden off-screen; slides in when open */
  @media (max-width: 767px) {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    transform: ${({ $open }) => ($open ? "translateX(0)" : "translateX(100%)")};
    transition: transform 250ms ease;
    animation: ${({ $open }) => ($open ? slideInFromRight : "none")} 250ms ease;
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 8px 10px 4px;

  /* On desktop the close button is not needed — hide it */
  @media (min-width: 768px) {
    display: none;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${colors.textMuted};
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    color: ${colors.textPrimary};
    background-color: ${colors.grayBgPanel};
  }
`;

const SidebarBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
`;

// ─── Mobile overlay & toggle ─────────────────────────────────────────────────

const SidebarOverlay = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: 767px) {
    display: ${({ $open }) => ($open ? "block" : "none")};
    position: fixed;
    inset: 0;
    background-color: ${colors.overlay};
    z-index: 10;
  }
`;

const ToggleButton = styled.button`
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 20;
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
  font-size: 18px;
  line-height: 1;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: filter 0.15s;

  &:hover {
    filter: brightness(1.15);
  }

  /* Hidden on desktop — sidebar is always visible */
  @media (min-width: 768px) {
    display: none;
  }
`;
