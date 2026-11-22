import type { OrbState } from "thinking-orbs";

export type OrbMessage =
  | {
      type: "add";
      id: number;
      canvas: OffscreenCanvas;
      pixelRatio: number;
      state: OrbState;
      dark: boolean;
    }
  | {
      type: "playback";
      id: number;
      playing: boolean;
      still: boolean;
      speed: number;
    }
  | { type: "remove"; id: number };

let worker: Worker | null = null;
let nextId = 0;
let workerUnavailable = false;
const clients = new Map<number, () => void>();

export function attachWorkerOrb(
  canvas: HTMLCanvasElement,
  pixelRatio: number,
  state: OrbState,
  dark: boolean,
  onFailure: () => void,
) {
  if (
    workerUnavailable ||
    !canvas.transferControlToOffscreen ||
    typeof Worker === "undefined"
  )
    return null;
  const id = ++nextId;
  try {
    if (!worker) {
      worker = new Worker(new URL("./orb.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onerror = () => {
        workerUnavailable = true;
        for (const fallback of [...clients.values()]) fallback();
      };
      worker.onmessage = (event: MessageEvent<number>) =>
        clients.get(event.data)?.();
    }
    const surface = canvas.transferControlToOffscreen();
    worker.postMessage(
      {
        type: "add",
        id,
        canvas: surface,
        pixelRatio,
        state,
        dark,
      } satisfies OrbMessage,
      [surface],
    );
    clients.set(id, onFailure);
  } catch {
    if (!clients.size) {
      worker?.terminate();
      worker = null;
    }
    return null;
  }
  return {
    playback(playing: boolean, still: boolean, speed: number) {
      worker?.postMessage({
        type: "playback",
        id,
        playing,
        still,
        speed,
      } satisfies OrbMessage);
    },
    dispose() {
      clients.delete(id);
      if (!clients.size) {
        worker?.terminate();
        worker = null;
      } else {
        worker?.postMessage({ type: "remove", id } satisfies OrbMessage);
      }
    },
  };
}
