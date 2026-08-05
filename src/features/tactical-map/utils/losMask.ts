/**
 * Minimal structural view of what applyLosMask needs from a Pixi Container. Keeping it
 * structural is what lets the tests drive it without a renderer.
 *
 * Pixi's own `Mask` type is `number | Container | null` (a numeric stencil channel is
 * a valid mask target), so this must include `number` to stay assignable from a real
 * `Container.mask` field.
 */
export type MaskSource = object | number;

export type MaskableContainer = {
  mask: MaskSource | null;
  setMask?: (options: { mask: MaskSource; inverse: boolean }) => void;
};

/**
 * Applies `mask` to `container`, optionally inverted, exactly once per mask instance.
 *
 * Always through setMask: `inverse` lives in `_maskOptions`, which Pixi defines as a
 * SHARED object on the mixin prototype. Mutating it directly turns inverse on for every
 * container in the application that never called setMask. setMask makes an own copy.
 */
export function applyLosMask(
  container: MaskableContainer | null,
  mask: MaskSource | null,
  inverse: boolean,
): void {
  if (!container || !mask || container.mask === mask) return;

  if (typeof container.setMask !== "function") {
    // Failing loudly matters: with no mask applied, an inverse pass covers the whole
    // board and a normal pass hides everything it was meant to show. Neither produces
    // a console error, which is exactly how the phase 10-D bugs stayed hidden.
    throw new Error("applyLosMask: Container.setMask is unavailable — cannot apply the LOS mask");
  }
  container.setMask({ mask, inverse });
}
