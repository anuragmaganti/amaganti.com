type ViewportProximityOptions = {
  marginViewportRatio?: number;
  once?: boolean;
};

const DEFAULT_MARGIN_VIEWPORT_RATIO = 0.75;

export function observeViewportProximity(
  target: Element,
  onChange: (isNearViewport: boolean) => void,
  options: ViewportProximityOptions = {},
) {
  if (!("IntersectionObserver" in window)) {
    onChange(true);
    return () => {};
  }

  const marginViewportRatio =
    options.marginViewportRatio ?? DEFAULT_MARGIN_VIEWPORT_RATIO;
  let observer: IntersectionObserver | null = null;
  let resizeFrame = 0;
  let previousValue: boolean | null = null;
  let disposed = false;

  const cleanup = () => {
    if (disposed) return;

    disposed = true;
    window.cancelAnimationFrame(resizeFrame);
    window.removeEventListener("resize", scheduleReconnect);
    observer?.disconnect();
  };
  const connect = () => {
    observer?.disconnect();
    const margin = Math.round(window.innerHeight * marginViewportRatio);

    observer = new IntersectionObserver(
      ([entry]) => {
        const isNearViewport = entry.isIntersecting;

        if (previousValue !== isNearViewport) {
          previousValue = isNearViewport;
          onChange(isNearViewport);
        }
        if (isNearViewport && options.once) cleanup();
      },
      {
        rootMargin: `${margin}px 0px`,
        threshold: 0,
      },
    );
    observer.observe(target);
  };
  function scheduleReconnect() {
    if (disposed || resizeFrame) return;

    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      connect();
    });
  }

  connect();
  window.addEventListener("resize", scheduleReconnect, { passive: true });
  return cleanup;
}
