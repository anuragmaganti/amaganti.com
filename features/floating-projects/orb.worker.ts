import { createOrbPainter } from "./orb-painter";
import type { OrbMessage } from "./orb-worker-client";

const orbs = new Map<
  number,
  {
    paint: ReturnType<typeof createOrbPainter>;
    playing: boolean;
    speed: number;
  }
>();
let frame = 0;
let previousTime = 0;

function tick(time: number) {
  frame = 0;
  const delta = previousTime ? Math.min(time - previousTime, 100) : 0;
  previousTime = time;
  for (const orb of orbs.values()) {
    if (orb.playing) orb.paint(delta, orb.speed, false);
  }
  frame = requestAnimationFrame(tick);
}

function syncClock() {
  for (const orb of orbs.values()) {
    if (orb.playing) {
      if (!frame) frame = requestAnimationFrame(tick);
      return;
    }
  }
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  previousTime = 0;
}

self.onmessage = (event: MessageEvent<OrbMessage>) => {
  const message = event.data;
  try {
    if (message.type === "add") {
      const context = message.canvas.getContext("2d");
      if (!context || typeof requestAnimationFrame !== "function")
        throw new Error();
      const paint = createOrbPainter(
        context,
        message.pixelRatio,
        message.state,
        message.dark,
      );
      paint(0, 1, true);
      orbs.set(message.id, { paint, playing: false, speed: 1 });
    } else if (message.type === "remove") {
      orbs.delete(message.id);
    } else {
      const orb = orbs.get(message.id);
      if (orb) {
        orb.playing = message.playing;
        orb.speed = message.speed;
        if (message.still) orb.paint(0, 1, true);
      }
    }
    syncClock();
  } catch {
    orbs.delete(message.id);
    self.postMessage(message.id);
  }
};
