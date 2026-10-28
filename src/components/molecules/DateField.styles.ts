import styled from "styled-components";
import { colors } from "../../styles/tokens";

export const Wrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`;

/** Mesma aparência do `FormInput`, mas é um botão que abre o calendário. */
export const Trigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background-color: ${colors.surfaceInput};
  border: 2px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-size: 24px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${colors.brandAccent};
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const Placeholder = styled.span`
  color: ${colors.textMuted};
`;

export const CalendarIcon = styled.svg`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: ${colors.textPrimary};
`;

const selectStyle = `
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  min-height: 40px;
  padding: 6px 28px 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
`;

export const Popover = styled.div`
  position: fixed;
  z-index: 1000; /* mesma camada do Tooltip, num portal no body: acima de toda a página */
  box-sizing: border-box;
  width: min(320px, calc(100vw - 32px));
  max-height: calc(100dvh - 16px); /* garantia: se nem preso na janela couber, rola por dentro */
  overflow-y: auto;
  padding: 12px;
  background-color: ${colors.surfaceSidebar}; /* marrom mais escuro: os seletores (marrom de campo) se destacam */
  border: 2px solid ${colors.borderInput};
  border-radius: 8px;
  box-shadow: 0 8px 24px ${colors.shadowFloating};
  color: ${colors.textPrimary};

  /* Estilo do react-day-picker pelos nomes de classe estáveis, sem o CSS padrão da biblioteca. */
  .rdp-root {
    position: relative;
  }
  .rdp-months {
    position: relative;
  }
  .rdp-month_caption {
    display: flex;
    justify-content: center;
    min-height: 40px;
    margin-bottom: 12px;
    padding: 0 44px;
  }
  .rdp-dropdowns {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
  }
  .rdp-dropdown_root {
    position: relative;
    display: inline-flex;
  }
  .rdp-caption_label {
    display: none;
  }
  .rdp-dropdown {
    ${selectStyle}
    color: ${colors.textPrimary};
    background-color: ${colors.surfaceInput};
    border: 2px solid ${colors.borderInput};
  }
  .rdp-nav {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    pointer-events: none;
  }
  .rdp-button_previous,
  .rdp-button_next {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: ${colors.textPrimary};
    cursor: pointer;
  }
  .rdp-button_previous:hover,
  .rdp-button_next:hover {
    background-color: ${colors.surfaceInputHover};
  }
  .rdp-chevron {
    width: 20px;
    height: 20px;
    fill: ${colors.textPrimary};
  }
  .rdp-month_grid {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .rdp-weekday {
    height: 36px;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    color: ${colors.textMuted};
    text-transform: capitalize;
  }
  .rdp-day {
    padding: 1px;
    text-align: center;
  }
  .rdp-day_button {
    width: 100%;
    min-width: 40px;
    height: 40px;
    padding: 0;
    background: transparent;
    border: 2px solid transparent;
    border-radius: 6px;
    color: ${colors.textPrimary};
    font-family: inherit;
    font-size: 16px;
    cursor: pointer;
  }
  .rdp-day_button:hover {
    background-color: ${colors.surfaceInputHover};
  }
  .rdp-today .rdp-day_button {
    border-color: ${colors.actionHighlight};
  }
  .rdp-outside .rdp-day_button {
    color: ${colors.textFaint};
  }
  .rdp-disabled .rdp-day_button {
    color: ${colors.textFaint};
    cursor: not-allowed;
    text-decoration: line-through;
  }
  .rdp-disabled .rdp-day_button:hover {
    background: transparent;
  }
  .rdp-selected .rdp-day_button,
  .rdp-selected .rdp-day_button:hover {
    background-color: ${colors.brandAccent};
    color: ${colors.textPrimary};
  }
`;

export const TimeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid ${colors.borderInput};
  font-weight: 600;
`;

export const TimeSelect = styled.select`
  ${selectStyle}
  color: ${colors.textPrimary};
  background-color: ${colors.surfaceInput};
  border: 2px solid ${colors.borderInput};
`;

export const ClearButton = styled.button`
  display: block;
  margin: 8px auto 0;
  min-height: 40px;
  padding: 0 12px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: ${colors.textMuted};
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background-color: ${colors.surfaceInputHover};
  }
`;
