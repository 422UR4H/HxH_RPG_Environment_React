/**
 * Pan do mapa com um ponteiro só. Com dois dedos (pinça) o pan sai da frente e o plugin `pinch`
 * do pixi-viewport cuida do zoom e do arraste; se sobrar um dedo, o pan volta reancorado nele.
 * Tratar todo ponteiro como o mesmo fazia a câmera pular entre os dedos e desfazia o centro
 * da pinça.
 *
 * Fora do React, em closure, como `createTapTracker`.
 */

export type PanPoint = { x: number; y: number };

export function createPanTracker() {
  /** Ponteiros pressionados e a última posição conhecida de cada um. */
  const pointers = new Map<number, PanPoint>();
  let panner: number | null = null;
  let anchor: { client: PanPoint; camera: PanPoint } | null = null;
  /** Houve mais de um ponteiro neste gesto: só zera quando todos soltarem. */
  let pinched = false;

  const anchorOn = (pointerId: number, camera: PanPoint) => {
    const at = pointers.get(pointerId);
    if (!at) return false;
    panner = pointerId;
    anchor = { client: { ...at }, camera: { ...camera } };
    return true;
  };

  const reset = () => {
    pointers.clear();
    panner = null;
    anchor = null;
    pinched = false;
  };

  return {
    /** pointerdown. Um segundo ponteiro é pinça: encerra o pan e impede o armado de começar. */
    down(pointerId: number, at: PanPoint) {
      pointers.set(pointerId, { ...at });
      if (pointers.size > 1) {
        pinched = true;
        panner = null;
        anchor = null;
      }
    },
    /** No quadro seguinte ao down: arma o pan se este ponteiro ainda está pressionado e é o único. */
    arm(pointerId: number, camera: PanPoint): boolean {
      if (pointers.size !== 1 || !pointers.has(pointerId)) return false;
      return anchorOn(pointerId, camera);
    },
    /** pointermove. Nova posição da câmera, ou null se este ponteiro não a move. */
    move(pointerId: number, at: PanPoint): PanPoint | null {
      if (pointers.has(pointerId)) pointers.set(pointerId, { ...at });
      if (panner !== pointerId || !anchor) return null;
      return {
        x: anchor.camera.x + (at.x - anchor.client.x),
        y: anchor.camera.y + (at.y - anchor.client.y),
      };
    },
    /** pointerup / pointercancel. Fim de pinça com um dedo restante reancora o pan nele. */
    up(pointerId: number, camera: PanPoint) {
      pointers.delete(pointerId);
      if (panner === pointerId) {
        panner = null;
        anchor = null;
      }
      if (pointers.size === 0) {
        reset();
        return;
      }
      if (pointers.size === 1 && pinched) {
        const [remaining] = pointers.keys();
        anchorOn(remaining, camera);
      }
    },
    isPanning: () => panner !== null,
    reset,
  };
}
