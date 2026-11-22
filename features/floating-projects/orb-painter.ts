import { MODE_DRAWS, resolvePreset, type OrbState } from "thinking-orbs";

export const ORB_SIZE = 64;

export function createOrbPainter(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  pixelRatio: number,
  state: OrbState,
  dark: boolean,
) {
  const preset = resolvePreset(state, ORB_SIZE);
  const draw = MODE_DRAWS[preset.mode];
  let phase = performance.now() * 0.001 * preset.speed;

  return (deltaMs: number, speed: number, still: boolean) => {
    phase += deltaMs * 0.001 * preset.speed * speed;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, ORB_SIZE, ORB_SIZE);
    // These two library painters only use 2D drawing primitives shared by both contexts.
    draw(
      context as CanvasRenderingContext2D,
      ORB_SIZE,
      still ? 0.6 : phase,
      dark,
      preset.opts,
    );
  };
}
