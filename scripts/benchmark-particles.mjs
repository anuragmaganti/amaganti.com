import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const label = process.env.PARTICLE_BENCHMARK_LABEL ?? "local";
const runCount = Number(process.env.PARTICLE_BENCHMARK_RUNS ?? 3);
const port = Number(process.env.PARTICLE_BENCHMARK_PORT ?? 3210);
const externalUrl = process.env.PARTICLE_BENCHMARK_URL;
const baseUrl = externalUrl ?? `http://127.0.0.1:${port}`;
const browserChannel = process.env.PARTICLE_BENCHMARK_BROWSER_CHANNEL;
const headless = process.env.PARTICLE_BENCHMARK_HEADLESS !== "false";
const backendPreference =
  process.env.PARTICLE_BENCHMARK_BACKEND ?? "auto";
const outputPath =
  process.env.PARTICLE_BENCHMARK_OUTPUT ??
  `/tmp/portfolio-particle-benchmark-${label}.json`;
const scenarioDurationMs = Number(
  process.env.PARTICLE_BENCHMARK_DURATION_MS ?? 8_000,
);

const profiles = [
  {
    id: "desktop",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    hasTouch: false,
    isMobile: false,
    cpuThrottleRate: 1,
  },
  {
    id: "mobile-stress",
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    cpuThrottleRate: 4,
  },
];

const server = externalUrl ? null : await startServer(port);
let browser;

try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({
    headless,
    ...(browserChannel ? { channel: browserChannel } : {}),
  });
  const results = {};

  for (const profile of profiles) {
    const runs = [];

    for (let index = 0; index < runCount; index += 1) {
      runs.push(await runBenchmark(browser, profile));
    }

    results[profile.id] = {
      profile,
      runs,
      median: aggregateRuns(runs),
    };
  }

  const report = {
    label,
    commit: readCommit(),
    generatedAt: new Date().toISOString(),
    scenario: {
      id: "project-scroll",
      durationMs: scenarioDurationMs,
      description:
        "Linear native-scroll traversal from the Projects particle title through every project card to Skills.",
    },
    caveat:
      "The mobile profile is Chromium device emulation with CPU throttling, not physical iOS Safari hardware.",
    runner: {
      browserChannel: browserChannel ?? "bundled-chromium",
      headless,
      backendPreference,
    },
    results,
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`Benchmark written to ${outputPath}\n`);
} finally {
  await browser?.close().catch(() => {});
  await stopServer(server);
}

async function runBenchmark(browserInstance, profile) {
  const context = await browserInstance.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    hasTouch: profile.hasTouch,
    isMobile: profile.isMobile,
    colorScheme: "dark",
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  try {
    await cdp.send("Performance.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", {
      rate: profile.cpuThrottleRate,
    });
    await page.addInitScript((backend) => {
      window.localStorage.setItem("portfolio-theme", "dark");
      window.__portfolioParticleBackendPreference = backend;
    }, backendPreference);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".scene-frame canvas");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1_000);

    const environment = await page.evaluate(() => {
      const canvas = document.querySelector(".scene-frame canvas");
      const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
      const extension = gl?.getExtension("WEBGL_debug_renderer_info");

      return {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        devicePixelRatio: window.devicePixelRatio,
        particleBackend: canvas?.dataset.particleBackend ?? "unknown",
        renderer:
          gl && extension
            ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
            : "unavailable",
      };
    });
    const beforeMetrics = indexMetrics(await cdp.send("Performance.getMetrics"));
    const scenario = await page.evaluate(async (durationMs) => {
      const firstProject = document.querySelector(
        '.scroll-section--project[data-portfolio-section-id]',
      );
      const skills = document.querySelector(
        '[data-portfolio-section-id="skills-stage"]',
      );

      if (!(firstProject instanceof HTMLElement) || !(skills instanceof HTMLElement)) {
        throw new Error("Benchmark sections were not found.");
      }

      const documentTop = (element) =>
        element.getBoundingClientRect().top + window.scrollY;
      const startY = documentTop(firstProject);
      const endY = documentTop(skills);
      const frameTimestamps = [];
      const longTasks = [];
      const observer =
        typeof PerformanceObserver === "undefined"
          ? null
          : new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                longTasks.push(entry.duration);
              }
            });

      try {
        observer?.observe({ type: "longtask", buffered: false });
      } catch {
        observer?.disconnect();
      }

      window.scrollTo(0, startY);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const startedAt = performance.now();

      await new Promise((resolve) => {
        const advance = (timestamp) => {
          const elapsed = timestamp - startedAt;
          const progress = Math.min(elapsed / durationMs, 1);
          const eased = progress * progress * (3 - 2 * progress);

          frameTimestamps.push(timestamp);
          window.scrollTo(0, startY + (endY - startY) * eased);

          if (progress < 1) {
            requestAnimationFrame(advance);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(advance);
      });

      await new Promise((resolve) => setTimeout(resolve, 150));
      const bufferedLongTasks = observer?.takeRecords() ?? [];
      for (const entry of bufferedLongTasks) longTasks.push(entry.duration);
      observer?.disconnect();

      const intervals = frameTimestamps
        .slice(1)
        .map((timestamp, index) => timestamp - frameTimestamps[index]);

      return {
        elapsedMs: frameTimestamps.at(-1) - frameTimestamps[0],
        frameCount: frameTimestamps.length,
        intervals,
        longTasks,
        projectCount: document.querySelectorAll(".scroll-section--project")
          .length,
      };
    }, scenarioDurationMs);
    const afterMetrics = indexMetrics(await cdp.send("Performance.getMetrics"));

    return {
      environment,
      elapsedMs: round(scenario.elapsedMs),
      frameCount: scenario.frameCount,
      framesPerSecond: round(
        (scenario.frameCount / Math.max(scenario.elapsedMs, 1)) * 1_000,
      ),
      frameIntervalMs: summarizeSamples(scenario.intervals),
      framesOver20Ms: countAbove(scenario.intervals, 20),
      framesOver33Ms: countAbove(scenario.intervals, 33.34),
      longTasks: {
        count: scenario.longTasks.length,
        totalMs: round(sum(scenario.longTasks)),
        maxMs: round(Math.max(0, ...scenario.longTasks)),
      },
      mainThread: {
        taskMs: metricDelta(beforeMetrics, afterMetrics, "TaskDuration"),
        scriptMs: metricDelta(beforeMetrics, afterMetrics, "ScriptDuration"),
        layoutMs: metricDelta(beforeMetrics, afterMetrics, "LayoutDuration"),
        styleMs: metricDelta(
          beforeMetrics,
          afterMetrics,
          "RecalcStyleDuration",
        ),
      },
      projectCount: scenario.projectCount,
    };
  } finally {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }).catch(() => {});
    await cdp.detach().catch(() => {});
    await context.close();
  }
}

function aggregateRuns(runs) {
  const paths = [
    ["framesPerSecond"],
    ["frameIntervalMs", "median"],
    ["frameIntervalMs", "p95"],
    ["frameIntervalMs", "p99"],
    ["frameIntervalMs", "max"],
    ["framesOver20Ms"],
    ["framesOver33Ms"],
    ["longTasks", "count"],
    ["longTasks", "totalMs"],
    ["mainThread", "taskMs"],
    ["mainThread", "scriptMs"],
    ["mainThread", "layoutMs"],
    ["mainThread", "styleMs"],
  ];

  return Object.fromEntries(
    paths.map((path) => [path.join("."), median(runs.map((run) => readPath(run, path)))]),
  );
}

function summarizeSamples(samples) {
  return {
    median: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
    p99: percentile(samples, 0.99),
    max: round(Math.max(0, ...samples)),
  };
}

function indexMetrics({ metrics }) {
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
}

function metricDelta(before, after, name) {
  return round(((after[name] ?? 0) - (before[name] ?? 0)) * 1_000);
}

function countAbove(samples, threshold) {
  return samples.filter((sample) => sample > threshold).length;
}

function percentile(samples, ratio) {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  return round(sorted[Math.min(Math.floor(sorted.length * ratio), sorted.length - 1)]);
}

function median(samples) {
  return percentile(samples, 0.5);
}

function readPath(value, path) {
  return path.reduce((current, key) => current[key], value);
}

function sum(samples) {
  return samples.reduce((total, sample) => total + sample, 0);
}

function round(value) {
  return Number(value.toFixed(2));
}

function readCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function startServer(serverPort) {
  const child = spawn(
    "npm",
    ["run", "start", "--", "--hostname", "127.0.0.1", "-p", String(serverPort)],
    {
      cwd: process.cwd(),
      detached: true,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => process.stderr.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function stopServer(serverProcess) {
  if (!serverProcess?.pid || serverProcess.exitCode !== null) return;

  try {
    process.kill(-serverProcess.pid, "SIGTERM");
  } catch {
    return;
  }

  await Promise.race([
    new Promise((resolve) => serverProcess.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);

  if (serverProcess.exitCode === null) {
    try {
      process.kill(-serverProcess.pid, "SIGKILL");
    } catch {
      // The process group already exited.
    }
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}
