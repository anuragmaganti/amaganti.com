import { cancelFrame, frame, type FrameData } from "motion";

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

type FramePhase = "update" | "preRender" | "render";

type SceneFrameTaskRecord = {
  callback: SceneFrameTask;
  process: (data: FrameData) => void;
  phase: FramePhase;
  runOnScroll: boolean;
  runOnResize: boolean;
  continuous: boolean;
  scheduled: boolean;
  disposed: boolean;
};

const MAX_SCREEN_VELOCITY = 2400;
const SCROLL_VELOCITY_SMOOTHING = 12;

export const SCENE_FRAME_PRIORITY = {
  projectPhysics: 10,
  particleInvalidation: 20,
  actionOrb: 30,
} as const;

const tasks = new Set<SceneFrameTaskRecord>();
const sampledFrame: SceneFrameState = {
  timestamp: 0,
  deltaMs: 0,
  scrollY: 0,
  scrollVelocityY: 0,
};
let listenersAttached = false;
let sampledTimestamp = -1;
let lastTimestamp = 0;
let lastScrollTimestamp = 0;

export function registerSceneFrameTask(
  callback: SceneFrameTask,
  options: SceneFrameTaskOptions = {},
): SceneFrameTaskController {
  ensureListeners();

  const task: SceneFrameTaskRecord = {
    callback,
    process: () => {},
    phase: getFramePhase(options.priority ?? 0),
    runOnScroll: options.runOnScroll ?? false,
    runOnResize: options.runOnResize ?? false,
    continuous: false,
    scheduled: false,
    disposed: false,
  };

  task.process = (data) => {
    if (task.disposed) return;
    if (!task.continuous) task.scheduled = false;
    task.callback(sampleFrame(data));
  };
  tasks.add(task);

  const schedule = () => {
    if (task.disposed || task.scheduled) return;
    task.scheduled = true;
    frame[task.phase](task.process, task.continuous);
  };

  return {
    request: schedule,
    setContinuous(continuous) {
      if (task.disposed || task.continuous === continuous) return;

      cancelFrame(task.process);
      task.scheduled = false;
      task.continuous = continuous;
      if (continuous) schedule();
    },
    dispose() {
      if (task.disposed) return;

      task.disposed = true;
      task.continuous = false;
      task.scheduled = false;
      cancelFrame(task.process);
      tasks.delete(task);
      if (!tasks.size) detachListeners();
    },
  };
}

function sampleFrame(data: FrameData) {
  if (sampledTimestamp === data.timestamp) return sampledFrame;

  const timestamp = data.timestamp;
  const deltaMs = lastTimestamp ? clamp(data.delta, 0, 100) : 0;
  const scrollDeltaMs = lastScrollTimestamp
    ? Math.max(timestamp - lastScrollTimestamp, 0)
    : 0;
  const scrollDeltaSeconds = scrollDeltaMs
    ? clamp(scrollDeltaMs / 1000, 0.001, 0.08)
    : 0;
  const scrollY = window.scrollY;
  const rawScrollVelocityY = scrollDeltaSeconds
    ? clamp(
        (scrollY - sampledFrame.scrollY) / scrollDeltaSeconds,
        -MAX_SCREEN_VELOCITY,
        MAX_SCREEN_VELOCITY,
      )
    : 0;
  const velocityMix = scrollDeltaSeconds
    ? 1 - Math.exp(-scrollDeltaSeconds * SCROLL_VELOCITY_SMOOTHING)
    : 1;

  sampledFrame.timestamp = timestamp;
  sampledFrame.deltaMs = deltaMs;
  sampledFrame.scrollY = scrollY;
  sampledFrame.scrollVelocityY = lerp(
    sampledFrame.scrollVelocityY,
    rawScrollVelocityY,
    velocityMix,
  );
  sampledTimestamp = timestamp;
  lastTimestamp = timestamp;
  lastScrollTimestamp = timestamp;
  return sampledFrame;
}

function requestTasks(event: "scroll" | "resize") {
  for (const task of tasks) {
    if (
      (event === "scroll" && task.runOnScroll) ||
      (event === "resize" && task.runOnResize)
    ) {
      if (!task.scheduled) {
        task.scheduled = true;
        frame[task.phase](task.process, task.continuous);
      }
    }
  }
}

const requestScrollTasks = () => requestTasks("scroll");
const requestResizeTasks = () => requestTasks("resize");
const resetFrameSampling = () => {
  sampledTimestamp = -1;
  lastTimestamp = 0;
  lastScrollTimestamp = 0;
  sampledFrame.scrollY = window.scrollY;
  sampledFrame.scrollVelocityY = 0;
};

function ensureListeners() {
  if (listenersAttached) return;

  listenersAttached = true;
  resetFrameSampling();
  window.addEventListener("scroll", requestScrollTasks, { passive: true });
  window.addEventListener("resize", requestResizeTasks, { passive: true });
  window.visualViewport?.addEventListener("scroll", requestScrollTasks, {
    passive: true,
  });
  window.visualViewport?.addEventListener("resize", requestResizeTasks, {
    passive: true,
  });
  document.addEventListener("visibilitychange", resetFrameSampling);
}

function detachListeners() {
  if (!listenersAttached) return;

  listenersAttached = false;
  window.removeEventListener("scroll", requestScrollTasks);
  window.removeEventListener("resize", requestResizeTasks);
  window.visualViewport?.removeEventListener("scroll", requestScrollTasks);
  window.visualViewport?.removeEventListener("resize", requestResizeTasks);
  document.removeEventListener("visibilitychange", resetFrameSampling);
  resetFrameSampling();
}

function getFramePhase(priority: number): FramePhase {
  if (priority <= SCENE_FRAME_PRIORITY.projectPhysics) return "update";
  if (priority <= SCENE_FRAME_PRIORITY.particleInvalidation) {
    return "preRender";
  }
  return "render";
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
