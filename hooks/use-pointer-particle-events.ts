import { useEffect, useRef } from "react";
import type * as THREE from "three";

import {
  queuePressureRipple,
  type PointerParticleInteractionResources,
} from "@/lib/pointer-particle-interaction";

const CLICK_MOVE_TOLERANCE_PX = 8;
const CLICK_DURATION_LIMIT_MS = 900;

type PointerPress = {
  pointerId: number;
  clientX: number;
  clientY: number;
  startedAt: number;
};

export function usePointerParticleEvents({
  reducedMotion,
  pointerCurrent,
  pointerTarget,
  pointerPresenceTarget,
  resources,
  invalidate,
}: {
  reducedMotion: boolean;
  pointerCurrent: THREE.Vector2;
  pointerTarget: THREE.Vector2;
  pointerPresenceTarget: { current: number };
  resources: PointerParticleInteractionResources;
  invalidate: () => void;
}) {
  const activePress = useRef<PointerPress | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const finePointer = window.matchMedia("(pointer: fine)");

    const handlePointerMove = (event: PointerEvent) => {
      if (
        !event.isPrimary ||
        event.pointerType === "touch" ||
        (!finePointer.matches && event.pointerType !== "pen")
      ) {
        return;
      }

      pointerTarget.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      );

      if (pointerPresenceTarget.current === 0) {
        pointerCurrent.copy(pointerTarget);
      }

      pointerPresenceTarget.current = 1;
      invalidate();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) {
        return;
      }

      activePress.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        startedAt: performance.now(),
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const press = activePress.current;
      activePress.current = null;

      if (!press || press.pointerId !== event.pointerId || !event.isPrimary) {
        return;
      }

      const pointerTravel = Math.hypot(
        event.clientX - press.clientX,
        event.clientY - press.clientY,
      );
      const pressDuration = performance.now() - press.startedAt;

      if (
        pointerTravel > CLICK_MOVE_TOLERANCE_PX ||
        pressDuration > CLICK_DURATION_LIMIT_MS
      ) {
        return;
      }

      queuePressureRipple(
        resources,
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      );
      invalidate();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (activePress.current?.pointerId === event.pointerId) {
        activePress.current = null;
      }
    };

    const resetPointer = () => {
      pointerPresenceTarget.current = 0;
      activePress.current = null;
      invalidate();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("pointerleave", resetPointer);
    window.addEventListener("blur", resetPointer);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("pointerleave", resetPointer);
      window.removeEventListener("blur", resetPointer);
    };
  }, [
    invalidate,
    pointerCurrent,
    pointerPresenceTarget,
    pointerTarget,
    reducedMotion,
    resources,
  ]);
}
