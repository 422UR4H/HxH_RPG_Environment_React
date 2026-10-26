/** Tempo total de tentativas a partir da primeira queda; depois disso a conexão desiste. */
export const RECONNECT_WINDOW_MS = 180_000;
export const RECONNECT_BASE_DELAY_MS = 500;
export const RECONNECT_MAX_DELAY_MS = 5_000;

export interface ReconnectPolicy {
  /**
   * Registra uma queda e devolve a espera até a próxima tentativa,
   * ou `null` quando a janela de reconexão já venceu.
   */
  nextDelay(now: number): number | null;
  /** Apaga a janela. Chame quando a conexão provar que está viva. */
  reset(): void;
}

export function createReconnectPolicy(): ReconnectPolicy {
  // `null` = nenhuma janela aberta; a primeira queda a abre.
  let windowStart: number | null = null;
  let failures = 0;

  return {
    nextDelay(now) {
      if (windowStart === null) {
        windowStart = now;
        failures = 0;
      }
      if (now - windowStart >= RECONNECT_WINDOW_MS) {
        return null;
      }
      // Dobra a cada falha: 500, 1000, 2000, 4000 e depois trava em 5000.
      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** failures,
        RECONNECT_MAX_DELAY_MS,
      );
      failures += 1;
      return delay;
    },
    reset() {
      windowStart = null;
      failures = 0;
    },
  };
}
