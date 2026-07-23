export type SceneFrameState = {
  timestamp: number;
  deltaMs: number;
  scrollY: number;
  scrollVelocityY: number;
};

export type SceneFrameTask = (frame: SceneFrameState) => void;

export type SceneFrameTaskOptions = {
  priority?: number;
  runOnScroll?: boolean;
  runOnResize?: boolean;
};

export type SceneFrameTaskController = {
  request: () => void;
  setContinuous: (continuous: boolean) => void;
  dispose: () => void;
};

export type SceneFrameHost = {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frameId: number) => void;
  getScrollY: () => number;
};

type SceneFrameTaskRecord = {
  id: number;
  callback: SceneFrameTask;
  priority: number;
  runOnScroll: boolean;
  runOnResize: boolean;
  continuous: boolean;
  requested: boolean;
};

const MAX_SCREEN_VELOCITY = 2400;
const SCROLL_VELOCITY_SMOOTHING = 12;

export const SCENE_FRAME_PRIORITY = {
  projectPhysics: 10,
  particleInvalidation: 20,
  actionOrb: 30,
} as const;

export function createSceneFrameScheduler(host: SceneFrameHost) {
  const tasks: SceneFrameTaskRecord[] = [];
  const frame: SceneFrameState = {
    timestamp: 0,
    deltaMs: 0,
    scrollY: host.getScrollY(),
    scrollVelocityY: 0,
  };
  let nextTaskId = 1;
  let frameId = 0;
  let lastTimestamp = 0;
  let lastScrollTimestamp = 0;
  let documentVisible = true;

  const hasPendingWork = () => {
    for (const task of tasks) {
      if (task.continuous || task.requested) {
        return true;
      }
    }

    return false;
  };

  const schedule = () => {
    if (!frameId && documentVisible && hasPendingWork()) {
      frameId = host.requestFrame(flush);
    }
  };

  function flush(timestamp: number) {
    frameId = 0;

    if (!documentVisible) {
      lastTimestamp = 0;
      return;
    }

    const deltaMs = lastTimestamp
      ? Math.max(0, Math.min(timestamp - lastTimestamp, 100))
      : 0;
    const scrollDeltaMs = lastScrollTimestamp
      ? Math.max(0, timestamp - lastScrollTimestamp)
      : 0;
    const scrollDeltaSeconds = scrollDeltaMs
      ? clamp(scrollDeltaMs / 1000, 0.001, 0.08)
      : 0;
    const scrollY = host.getScrollY();
    const rawScrollVelocityY = scrollDeltaSeconds
      ? clamp(
          (scrollY - frame.scrollY) / scrollDeltaSeconds,
          -MAX_SCREEN_VELOCITY,
          MAX_SCREEN_VELOCITY,
        )
      : 0;
    const scrollVelocityLerp = scrollDeltaSeconds
      ? 1 - Math.exp(-scrollDeltaSeconds * SCROLL_VELOCITY_SMOOTHING)
      : 1;

    frame.timestamp = timestamp;
    frame.deltaMs = deltaMs;
    frame.scrollY = scrollY;
    frame.scrollVelocityY = lerp(
      frame.scrollVelocityY,
      rawScrollVelocityY,
      scrollVelocityLerp,
    );
    lastTimestamp = timestamp;
    lastScrollTimestamp = timestamp;

    for (const task of tasks) {
      if (!task.continuous && !task.requested) {
        continue;
      }

      task.requested = false;
      task.callback(frame);
    }

    if (hasPendingWork()) {
      schedule();
    } else {
      lastTimestamp = 0;
    }
  }

  return {
    register(
      callback: SceneFrameTask,
      options: SceneFrameTaskOptions = {},
    ): SceneFrameTaskController {
      const task: SceneFrameTaskRecord = {
        id: nextTaskId,
        callback,
        priority: options.priority ?? 0,
        runOnScroll: options.runOnScroll ?? false,
        runOnResize: options.runOnResize ?? false,
        continuous: false,
        requested: false,
      };
      nextTaskId += 1;

      const insertionIndex = tasks.findIndex(
        (candidate) => candidate.priority > task.priority,
      );
      if (insertionIndex === -1) {
        tasks.push(task);
      } else {
        tasks.splice(insertionIndex, 0, task);
      }

      return {
        request() {
          task.requested = true;
          schedule();
        },
        setContinuous(continuous: boolean) {
          if (task.continuous === continuous) {
            return;
          }

          task.continuous = continuous;
          if (continuous) {
            schedule();
          }
        },
        dispose() {
          const index = tasks.findIndex(
            (candidate) => candidate.id === task.id,
          );
          if (index !== -1) {
            tasks.splice(index, 1);
          }

          if (!hasPendingWork() && frameId) {
            host.cancelFrame(frameId);
            frameId = 0;
            lastTimestamp = 0;
          }
        },
      };
    },
    requestScrollFrame() {
      for (const task of tasks) {
        if (task.runOnScroll) {
          task.requested = true;
        }
      }
      schedule();
    },
    requestResizeFrame() {
      for (const task of tasks) {
        if (task.runOnResize) {
          task.requested = true;
        }
      }
      schedule();
    },
    setDocumentVisible(visible: boolean) {
      documentVisible = visible;

      if (!visible) {
        if (frameId) {
          host.cancelFrame(frameId);
          frameId = 0;
        }
        lastTimestamp = 0;
        lastScrollTimestamp = 0;
        frame.scrollVelocityY = 0;
        return;
      }

      frame.scrollY = host.getScrollY();
      lastScrollTimestamp = 0;
      schedule();
    },
    dispose() {
      if (frameId) {
        host.cancelFrame(frameId);
      }
      frameId = 0;
      lastTimestamp = 0;
      lastScrollTimestamp = 0;
      tasks.length = 0;
    },
  };
}

let browserScheduler: ReturnType<typeof createSceneFrameScheduler> | null =
  null;

export function registerSceneFrameTask(
  callback: SceneFrameTask,
  options?: SceneFrameTaskOptions,
) {
  return getBrowserScheduler().register(callback, options);
}

function getBrowserScheduler() {
  if (browserScheduler) {
    return browserScheduler;
  }

  browserScheduler = createSceneFrameScheduler({
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
    getScrollY: () => window.scrollY,
  });

  const requestScrollFrame = () => {
    browserScheduler?.requestScrollFrame();
  };
  const requestResizeFrame = () => {
    browserScheduler?.requestResizeFrame();
  };
  const handleVisibilityChange = () => {
    browserScheduler?.setDocumentVisible(
      document.visibilityState !== "hidden",
    );
  };

  window.addEventListener("scroll", requestScrollFrame, { passive: true });
  window.addEventListener("resize", requestResizeFrame, { passive: true });
  window.visualViewport?.addEventListener("scroll", requestScrollFrame, {
    passive: true,
  });
  window.visualViewport?.addEventListener("resize", requestResizeFrame, {
    passive: true,
  });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  handleVisibilityChange();

  return browserScheduler;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
