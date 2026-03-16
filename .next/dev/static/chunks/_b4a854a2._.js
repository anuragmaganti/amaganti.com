(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/scene-config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FACE_SCAN_GLB_PATH",
    ()=>FACE_SCAN_GLB_PATH,
    "POINT_CLOUD_ASSET_PATH",
    ()=>POINT_CLOUD_ASSET_PATH,
    "POINT_CLOUD_TEXT_TARGETS",
    ()=>POINT_CLOUD_TEXT_TARGETS,
    "RENDER_DEFAULTS",
    ()=>RENDER_DEFAULTS,
    "SCENE_PHASES",
    ()=>SCENE_PHASES
]);
const POINT_CLOUD_ASSET_PATH = "/models/face.ply";
const FACE_SCAN_GLB_PATH = "/models/face.glb";
const POINT_CLOUD_TEXT_TARGETS = {
    projects: {
        id: "projects",
        label: "Projects",
        fontFamily: "Montserrat",
        fontWeight: 700,
        fillDensity: 0.84,
        haloDensity: 0.18,
        width: 2.72,
        height: 0.84,
        depth: 0.14,
        haloRadius: 0.18
    }
};
const RENDER_DEFAULTS = {
    desktopMaxPoints: 8000,
    mobileMaxPoints: 3200,
    reducedMaxPoints: 1600,
    desktopDpr: [
        1,
        1.35
    ],
    mobileDpr: [
        1,
        1.1
    ]
};
const SCENE_PHASES = [
    {
        key: "intro",
        range: [
            0,
            0.15
        ],
        camera: {
            position: [
                -0.04,
                0.02,
                4.72
            ],
            target: [
                0.05,
                0.02,
                0
            ],
            fov: 29
        },
        cloud: {
            shape: "face",
            position: [
                0.22,
                0.02,
                0
            ],
            rotation: [
                0.02,
                0.04,
                0
            ],
            scale: 1.14,
            pointSize: 0.0185,
            noise: 0.03,
            intensity: 0.22,
            opacity: 0.98
        }
    },
    {
        key: "transform",
        range: [
            0.15,
            0.205
        ],
        camera: {
            position: [
                0.01,
                0.03,
                4.26
            ],
            target: [
                0.01,
                0.03,
                0
            ],
            fov: 30
        },
        cloud: {
            shape: "text",
            textTargetId: "projects",
            position: [
                0.02,
                0.04,
                0
            ],
            rotation: [
                0.01,
                0.02,
                0
            ],
            scale: 1.04,
            pointSize: 0.0172,
            noise: 0.038,
            intensity: 0.3,
            opacity: 0.96
        }
    },
    {
        key: "hero",
        range: [
            0.205,
            0.255
        ],
        camera: {
            position: [
                0.02,
                0.04,
                4.24
            ],
            target: [
                0.01,
                0.03,
                0
            ],
            fov: 30
        },
        cloud: {
            shape: "text",
            textTargetId: "projects",
            position: [
                0.03,
                0.04,
                0
            ],
            rotation: [
                0,
                0.03,
                0
            ],
            scale: 1.02,
            pointSize: 0.017,
            noise: 0.022,
            intensity: 0.22,
            opacity: 0.98
        }
    },
    {
        key: "reveal",
        range: [
            0.255,
            0.335
        ],
        camera: {
            position: [
                0.02,
                0.05,
                4.56
            ],
            target: [
                0,
                0.03,
                0
            ],
            fov: 35
        },
        cloud: {
            shape: "ribbon",
            position: [
                0,
                0.04,
                -0.08
            ],
            rotation: [
                0.03,
                -0.12,
                -0.02
            ],
            scale: 1.56,
            pointSize: 0.0162,
            noise: 0.036,
            intensity: 0.34,
            opacity: 0.52
        }
    },
    {
        key: "project-1",
        range: [
            0.335,
            0.5
        ],
        camera: {
            position: [
                0.02,
                0.02,
                4.62
            ],
            target: [
                0,
                0.03,
                0
            ],
            fov: 36
        },
        cloud: {
            shape: "ribbon",
            position: [
                0,
                0.03,
                -0.1
            ],
            rotation: [
                -0.08,
                -0.42,
                0.12
            ],
            scale: 1.78,
            pointSize: 0.0158,
            noise: 0.06,
            intensity: 0.38,
            opacity: 0.42
        }
    },
    {
        key: "project-2",
        range: [
            0.5,
            0.66
        ],
        camera: {
            position: [
                0.01,
                0.04,
                4.58
            ],
            target: [
                0,
                0.02,
                0
            ],
            fov: 36
        },
        cloud: {
            shape: "helix",
            position: [
                0,
                0.02,
                -0.1
            ],
            rotation: [
                0.16,
                0.2,
                -0.14
            ],
            scale: 1.72,
            pointSize: 0.0156,
            noise: 0.054,
            intensity: 0.34,
            opacity: 0.4
        }
    },
    {
        key: "project-3",
        range: [
            0.66,
            0.82
        ],
        camera: {
            position: [
                0.02,
                0.08,
                4.52
            ],
            target: [
                0,
                0.04,
                0
            ],
            fov: 35
        },
        cloud: {
            shape: "veil",
            position: [
                0,
                0.06,
                -0.08
            ],
            rotation: [
                -0.2,
                0.12,
                0.04
            ],
            scale: 1.62,
            pointSize: 0.0154,
            noise: 0.048,
            intensity: 0.32,
            opacity: 0.38
        }
    },
    {
        key: "about",
        range: [
            0.82,
            0.92
        ],
        camera: {
            position: [
                0.08,
                0,
                4.24
            ],
            target: [
                -0.04,
                0.03,
                0
            ],
            fov: 32
        },
        cloud: {
            shape: "orbital",
            position: [
                -0.12,
                0.06,
                -0.02
            ],
            rotation: [
                -0.12,
                0.26,
                -0.06
            ],
            scale: 1.06,
            pointSize: 0.0158,
            noise: 0.032,
            intensity: 0.2,
            opacity: 0.28
        }
    },
    {
        key: "contact",
        range: [
            0.92,
            1
        ],
        camera: {
            position: [
                0,
                0.02,
                4.62
            ],
            target: [
                0,
                0.02,
                0
            ],
            fov: 29
        },
        cloud: {
            shape: "face",
            position: [
                0,
                0.03,
                0
            ],
            rotation: [
                0.02,
                0.02,
                0
            ],
            scale: 1.02,
            pointSize: 0.0185,
            noise: 0.015,
            intensity: 0.12,
            opacity: 0.98
        }
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/point-cloud.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createMorphTargets",
    ()=>createMorphTargets,
    "generateFallbackFacePoints",
    ()=>generateFallbackFacePoints,
    "normalizePositions",
    ()=>normalizePositions,
    "orientImportedPositions",
    ()=>orientImportedPositions,
    "samplePositions",
    ()=>samplePositions
]);
const TWO_PI = Math.PI * 2;
const IMPORT_SCAN_ORIENTATION = {
    x: -Math.PI / 2,
    y: 0,
    z: 0
};
function samplePositions(source, maxPoints) {
    const pointCount = Math.floor(source.length / 3);
    if (!pointCount || pointCount <= maxPoints) {
        return source.slice();
    }
    const sampled = new Float32Array(maxPoints * 3);
    const stride = pointCount / maxPoints;
    for(let index = 0; index < maxPoints; index += 1){
        const sourceIndex = Math.floor(index * stride) * 3;
        const targetIndex = index * 3;
        sampled[targetIndex] = source[sourceIndex];
        sampled[targetIndex + 1] = source[sourceIndex + 1];
        sampled[targetIndex + 2] = source[sourceIndex + 2];
    }
    return sampled;
}
function normalizePositions(source) {
    if (!source.length) {
        return source.slice();
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    for(let index = 0; index < source.length; index += 3){
        const x = source[index];
        const y = source[index + 1];
        const z = source[index + 2];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
    }
    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;
    const centerZ = (minZ + maxZ) * 0.5;
    const scale = 2 / Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.001);
    const normalized = new Float32Array(source.length);
    for(let index = 0; index < source.length; index += 3){
        normalized[index] = (source[index] - centerX) * scale;
        normalized[index + 1] = (source[index + 1] - centerY) * scale;
        normalized[index + 2] = (source[index + 2] - centerZ) * scale;
    }
    return normalized;
}
function orientImportedPositions(source) {
    if (!source.length) {
        return source.slice();
    }
    const rotation = {
        cosX: Math.cos(IMPORT_SCAN_ORIENTATION.x),
        sinX: Math.sin(IMPORT_SCAN_ORIENTATION.x),
        cosY: Math.cos(IMPORT_SCAN_ORIENTATION.y),
        sinY: Math.sin(IMPORT_SCAN_ORIENTATION.y),
        cosZ: Math.cos(IMPORT_SCAN_ORIENTATION.z),
        sinZ: Math.sin(IMPORT_SCAN_ORIENTATION.z)
    };
    const oriented = new Float32Array(source.length);
    for(let index = 0; index < source.length; index += 3){
        let x = source[index];
        let y = source[index + 1];
        let z = source[index + 2];
        const rotatedY = y * rotation.cosX - z * rotation.sinX;
        const rotatedZ = y * rotation.sinX + z * rotation.cosX;
        y = rotatedY;
        z = rotatedZ;
        const rotatedX = x * rotation.cosY + z * rotation.sinY;
        z = -x * rotation.sinY + z * rotation.cosY;
        x = rotatedX;
        const finalX = x * rotation.cosZ - y * rotation.sinZ;
        const finalY = x * rotation.sinZ + y * rotation.cosZ;
        oriented[index] = finalX;
        oriented[index + 1] = finalY;
        oriented[index + 2] = z;
    }
    return oriented;
}
function generateFallbackFacePoints(pointCount) {
    const positions = new Float32Array(pointCount * 3);
    let cursor = 0;
    let attempts = 0;
    while(cursor < positions.length && attempts < pointCount * 18){
        const x = randomBetween(-0.86, 0.86);
        const y = randomBetween(-1.08, 1.08);
        const silhouette = x * x / 0.72 + y * y / 1.2;
        attempts += 1;
        if (silhouette > 1) {
            continue;
        }
        let z = 0.44 * (1 - silhouette);
        z += gaussian(x, y + 0.03, 0.04, 0.12) * 0.24;
        z -= gaussian(x - 0.24, y - 0.2, 0.02, 0.016) * 0.085;
        z -= gaussian(x + 0.24, y - 0.2, 0.02, 0.016) * 0.085;
        z -= gaussian(x, y + 0.38, 0.08, 0.016) * 0.05;
        z += gaussian(x, y + 0.66, 0.1, 0.03) * 0.03;
        z += randomBetween(-0.02, 0.02);
        positions[cursor] = x;
        positions[cursor + 1] = y;
        positions[cursor + 2] = z;
        cursor += 3;
    }
    return normalizePositions(positions);
}
function createMorphTargets(basePositions, options = {}) {
    const pointCount = Math.floor(basePositions.length / 3);
    const orbital = new Float32Array(basePositions.length);
    const ribbon = new Float32Array(basePositions.length);
    const helix = new Float32Array(basePositions.length);
    const veil = new Float32Array(basePositions.length);
    const settle = new Float32Array(basePositions.length);
    const textTargets = options.textTargets ?? [];
    const haloDensityMultiplier = options.haloDensityMultiplier ?? 1;
    const columns = Math.max(18, Math.round(Math.sqrt(pointCount * 1.45)));
    const rows = Math.ceil(pointCount / columns);
    const depthBands = 7;
    for(let index = 0; index < pointCount; index += 1){
        const offset = index * 3;
        const column = index % columns;
        const row = Math.floor(index / columns);
        const u = columns === 1 ? 0 : column / (columns - 1);
        const v = rows === 1 ? 0 : row / (rows - 1);
        const waveU = u * TWO_PI;
        const waveV = v * TWO_PI;
        const gridY = (0.5 - v) * 1.8;
        const bandIndex = index % depthBands;
        const band = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : bandIndex / (depthBands - 1) - 0.5;
        const jitterA = pseudoRandom(index, 0.17) - 0.5;
        const jitterB = pseudoRandom(index, 0.47) - 0.5;
        const jitterC = pseudoRandom(index, 0.81) - 0.5;
        const side = u < 0.5 ? -1 : 1;
        const innerToOuter = side < 0 ? 1 - clamp(u / 0.5, 0, 1) : clamp((u - 0.5) / 0.5, 0, 1);
        const sideCore = 1.12 + innerToOuter * 0.7;
        const sideWave = Math.sin(waveV * 2.8 + band * 4.1 + side * 0.35);
        const sideLift = Math.cos(waveU * 1.9 + band * 2.2 + side * 0.7);
        // Keep transforms as layered particle fields rather than single-strand splines.
        const orbitalAngle = waveU * 1.75 + band * 0.9 + Math.sin(waveV * 1.2 + jitterA * 2) * 0.16;
        const orbitalRadius = 0.38 + v * 0.54 + jitterA * 0.08;
        orbital[offset] = Math.cos(orbitalAngle) * orbitalRadius + band * 0.12 + jitterB * 0.06;
        orbital[offset + 1] = (v - 0.5) * 1.5 + Math.sin(waveU * 2.4 + band * 3.2) * 0.26 + jitterC * 0.08;
        orbital[offset + 2] = Math.sin(orbitalAngle) * orbitalRadius * 0.78 + Math.cos(waveV * 3.2 + waveU) * 0.14 + jitterA * 0.08;
        ribbon[offset] = side * (sideCore + sideWave * 0.12 + jitterA * 0.08);
        ribbon[offset + 1] = gridY + Math.sin(innerToOuter * 5.2 + waveV * 1.7 + side * 0.5) * 0.18;
        ribbon[offset + 2] = Math.cos(innerToOuter * 5.8 + waveV * 3.4) * 0.22 + band * 0.26 + jitterC * 0.08;
        helix[offset] = side * (1.18 + innerToOuter * 0.62 + Math.cos(waveV * 3.1 + band * 3.8 + side * 0.4) * 0.12) + jitterA * 0.05;
        helix[offset + 1] = (v - 0.5) * 2.12 + Math.sin(waveV * 3.8 + innerToOuter * 2.4 + side * 0.7) * 0.22;
        helix[offset + 2] = Math.sin(waveV * 4.4 + innerToOuter * 4.2) * 0.3 + band * 0.28 + jitterB * 0.08;
        veil[offset] = side * (1.06 + innerToOuter * 0.78 + sideLift * 0.1) + jitterB * 0.05;
        veil[offset + 1] = (v - 0.5) * 2.24 + Math.sin(waveU * 1.4 + waveV * 1.9 + side * 0.6) * 0.12;
        veil[offset + 2] = Math.cos(waveV * 4.8 + innerToOuter * 5.1 + band * 2.1) * 0.34 + band * 0.24 + jitterC * 0.07;
        settle[offset] = basePositions[offset] * 0.78;
        settle[offset + 1] = basePositions[offset + 1] * 0.78 - 0.04;
        settle[offset + 2] = basePositions[offset + 2] * 0.78 + 0.06;
    }
    const targets = {
        face: basePositions,
        text: ribbon,
        orbital,
        ribbon,
        helix,
        veil,
        settle
    };
    for (const textTarget of textTargets){
        targets[textTarget.id] = createTextMorphTarget(pointCount, textTarget, haloDensityMultiplier, ribbon);
    }
    return targets;
}
function gaussian(x, y, radiusX, radiusY) {
    return Math.exp(-(x * x / radiusX + y * y / radiusY));
}
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}
function pseudoRandom(index, seed) {
    const value = Math.sin(index * 91.345 + seed * 713.17) * 43758.5453123;
    return value - Math.floor(value);
}
function createTextMorphTarget(pointCount, target, haloDensityMultiplier, fallback) {
    if (typeof document === "undefined") {
        return fallback.slice();
    }
    const canvas = document.createElement("canvas");
    const canvasWidth = Math.max(960, Math.round(target.width * 720));
    const canvasHeight = Math.max(260, Math.round(target.height * 620));
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d", {
        willReadFrequently: true
    });
    if (!context) {
        return fallback.slice();
    }
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    const maxTextWidth = canvasWidth * 0.88;
    let fontSize = Math.floor(canvasHeight * 0.66);
    context.font = `${target.fontWeight} ${fontSize}px "${target.fontFamily}", sans-serif`;
    const metrics = context.measureText(target.label);
    if (metrics.width > maxTextWidth && metrics.width > 0) {
        fontSize = Math.floor(fontSize * (maxTextWidth / metrics.width));
        context.font = `${target.fontWeight} ${fontSize}px "${target.fontFamily}", sans-serif`;
    }
    context.fillText(target.label, canvasWidth * 0.5, canvasHeight * 0.5);
    const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
    const fillPixels = [];
    const edgePixels = [];
    const sampleStep = 2;
    const alphaThreshold = 28;
    for(let y = 1; y < canvasHeight - 1; y += sampleStep){
        for(let x = 1; x < canvasWidth - 1; x += sampleStep){
            if (!isOpaquePixel(imageData.data, canvasWidth, x, y, alphaThreshold)) {
                continue;
            }
            fillPixels.push(x, y);
            if (isEdgePixel(imageData.data, canvasWidth, x, y, alphaThreshold)) {
                edgePixels.push(x, y);
            }
        }
    }
    if (!fillPixels.length) {
        return fallback.slice();
    }
    const minimumFillCount = Math.round(pointCount * target.fillDensity);
    const maxHaloCount = Math.max(0, pointCount - minimumFillCount);
    const haloCount = edgePixels.length > 0 ? Math.min(maxHaloCount, Math.round(pointCount * target.haloDensity * haloDensityMultiplier)) : 0;
    const fillCount = Math.max(1, pointCount - haloCount);
    const positions = new Float32Array(pointCount * 3);
    for(let index = 0; index < fillCount; index += 1){
        const offset = index * 3;
        const pairIndex = pickDistributedIndex(fillPixels.length / 2, index, fillCount, 0.17) * 2;
        const x = fillPixels[pairIndex];
        const y = fillPixels[pairIndex + 1];
        const worldX = (x / (canvasWidth - 1) - 0.5) * target.width;
        const worldY = (0.5 - y / (canvasHeight - 1)) * target.height;
        const depthNoise = (pseudoRandom(index, 0.43) - 0.5) * target.depth;
        positions[offset] = worldX;
        positions[offset + 1] = worldY;
        positions[offset + 2] = depthNoise + Math.sin(worldX * 2.8 + worldY * 4.2) * (target.depth * 0.12);
    }
    for(let index = fillCount; index < pointCount; index += 1){
        const offset = index * 3;
        const haloIndex = index - fillCount;
        const pairIndex = pickDistributedIndex(edgePixels.length / 2, haloIndex, haloCount, 0.61) * 2;
        const x = edgePixels[pairIndex];
        const y = edgePixels[pairIndex + 1];
        const baseX = (x / (canvasWidth - 1) - 0.5) * target.width;
        const baseY = (0.5 - y / (canvasHeight - 1)) * target.height;
        const angle = pseudoRandom(index, 0.73) * TWO_PI;
        const radius = target.haloRadius * (0.24 + pseudoRandom(index, 0.91) * 0.76);
        positions[offset] = baseX + Math.cos(angle) * radius;
        positions[offset + 1] = baseY + Math.sin(angle) * radius * 0.72;
        positions[offset + 2] = (pseudoRandom(index, 0.57) - 0.5) * target.depth * 1.8 + target.depth * 0.28;
    }
    return positions;
}
function pickDistributedIndex(itemCount, index, total, seed) {
    if (itemCount <= 1 || total <= 1) {
        return 0;
    }
    const base = (index + 0.5) / total * itemCount;
    const jitter = (pseudoRandom(index, seed) - 0.5) * Math.max(1, itemCount / total);
    return clamp(Math.floor(base + jitter), 0, itemCount - 1);
}
function isOpaquePixel(data, width, x, y, threshold) {
    const alphaIndex = (y * width + x) * 4 + 3;
    return data[alphaIndex] >= threshold;
}
function isEdgePixel(data, width, x, y, threshold) {
    return !isOpaquePixel(data, width, x + 1, y, threshold) || !isOpaquePixel(data, width, x - 1, y, threshold) || !isOpaquePixel(data, width, x, y + 1, threshold) || !isOpaquePixel(data, width, x, y - 1, threshold);
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/scene-canvas.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SceneCanvas",
    ()=>SceneCanvas
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$AdaptiveDpr$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@react-three/drei/core/AdaptiveDpr.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$react$2d$three$2d$fiber$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/react-three-fiber.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-5a94e5eb.esm.js [app-client] (ecmascript) <export D as useFrame>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__C__as__useThree$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-5a94e5eb.esm.js [app-client] (ecmascript) <export C as useThree>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/utils/reduced-motion/use-reduced-motion.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$GLTFLoader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/loaders/GLTFLoader.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$math$2f$MeshSurfaceSampler$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/math/MeshSurfaceSampler.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$PLYLoader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/loaders/PLYLoader.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/scene-config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$point$2d$cloud$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/point-cloud.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
function SceneCanvas({ progress }) {
    _s();
    const reducedMotion = Boolean((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useReducedMotion"])());
    const profile = useQualityProfile(reducedMotion);
    const basePositions = usePointCloudSource(profile.maxPoints);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$react$2d$three$2d$fiber$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Canvas"], {
        dpr: profile.dpr,
        camera: {
            position: [
                0,
                0,
                4.9
            ],
            fov: 30
        },
        frameloop: "demand",
        gl: {
            alpha: true,
            antialias: false,
            depth: false,
            powerPreference: "high-performance",
            stencil: false
        },
        performance: {
            min: 0.55
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$AdaptiveDpr$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AdaptiveDpr"], {
                pixelated: true
            }, void 0, false, {
                fileName: "[project]/components/scene-canvas.tsx",
                lineNumber: 69,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PointCloudSystem, {
                basePositions: basePositions,
                progress: progress,
                reducedMotion: reducedMotion,
                profile: profile
            }, void 0, false, {
                fileName: "[project]/components/scene-canvas.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/scene-canvas.tsx",
        lineNumber: 56,
        columnNumber: 5
    }, this);
}
_s(SceneCanvas, "lnqQjzMdSGb6xL082hxjMvT7hkQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useReducedMotion"],
        useQualityProfile,
        usePointCloudSource
    ];
});
_c = SceneCanvas;
function PointCloudSystem({ basePositions, progress, reducedMotion, profile }) {
    _s1();
    const invalidate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__C__as__useThree$3e$__["useThree"])({
        "PointCloudSystem.useThree[invalidate]": (state)=>state.invalidate
    }["PointCloudSystem.useThree[invalidate]"]);
    const pointCount = Math.floor(basePositions.length / 3);
    const renderPositions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[renderPositions]": ()=>new Float32Array(basePositions.length)
    }["PointCloudSystem.useMemo[renderPositions]"], [
        basePositions.length
    ]);
    const typographyVersion = useTypographyVersion('700 220px "Montserrat"');
    const geometry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[geometry]": ()=>{
            const nextGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferGeometry"]();
            const attribute = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferAttribute"](renderPositions, 3);
            attribute.setUsage(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DynamicDrawUsage"]);
            nextGeometry.setAttribute("position", attribute);
            nextGeometry.computeBoundingSphere();
            return nextGeometry;
        }
    }["PointCloudSystem.useMemo[geometry]"], [
        renderPositions
    ]);
    const seeds = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[seeds]": ()=>{
            const values = new Float32Array(pointCount * 2);
            for(let index = 0; index < pointCount; index += 1){
                values[index * 2] = hash(index, 0.13);
                values[index * 2 + 1] = hash(index, 0.79);
            }
            return values;
        }
    }["PointCloudSystem.useMemo[seeds]"], [
        pointCount
    ]);
    const morphTargets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[morphTargets]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$point$2d$cloud$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createMorphTargets"])(basePositions, {
                textTargets: Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POINT_CLOUD_TEXT_TARGETS"]),
                haloDensityMultiplier: profile.textHaloMultiplier
            })
    }["PointCloudSystem.useMemo[morphTargets]"], [
        basePositions,
        profile.textHaloMultiplier,
        typographyVersion
    ]);
    const cloudMaterial = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[cloudMaterial]": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PointsMaterial"]({
                color: new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Color"]("#ffffff"),
                size: 0.018,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.92,
                depthWrite: false,
                blending: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AdditiveBlending"]
            })
    }["PointCloudSystem.useMemo[cloudMaterial]"], []);
    const cloud = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[cloud]": ()=>{
            const points = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Points"](geometry, cloudMaterial);
            points.frustumCulled = false;
            return points;
        }
    }["PointCloudSystem.useMemo[cloud]"], [
        cloudMaterial,
        geometry
    ]);
    const cameraTarget = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[cameraTarget]": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"](0, 0, 0)
    }["PointCloudSystem.useMemo[cameraTarget]"], []);
    const desiredCamera = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[desiredCamera]": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"](0, 0, 4.9)
    }["PointCloudSystem.useMemo[desiredCamera]"], []);
    const pointerTarget = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[pointerTarget]": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector2"](0, 0)
    }["PointCloudSystem.useMemo[pointerTarget]"], []);
    const pointerCurrent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PointCloudSystem.useMemo[pointerCurrent]": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector2"](0, 0)
    }["PointCloudSystem.useMemo[pointerCurrent]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PointCloudSystem.useEffect": ()=>{
            const unsubscribe = progress.on("change", {
                "PointCloudSystem.useEffect.unsubscribe": ()=>{
                    invalidate();
                }
            }["PointCloudSystem.useEffect.unsubscribe"]);
            return ({
                "PointCloudSystem.useEffect": ()=>{
                    unsubscribe();
                }
            })["PointCloudSystem.useEffect"];
        }
    }["PointCloudSystem.useEffect"], [
        invalidate,
        progress
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PointCloudSystem.useEffect": ()=>{
            renderPositions.set(morphTargets.face);
            geometry.attributes.position.needsUpdate = true;
            invalidate();
        }
    }["PointCloudSystem.useEffect"], [
        geometry,
        invalidate,
        morphTargets,
        renderPositions
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PointCloudSystem.useEffect": ()=>{
            if (reducedMotion || !window.matchMedia("(pointer: fine)").matches) {
                return;
            }
            const handlePointerMove = {
                "PointCloudSystem.useEffect.handlePointerMove": (event)=>{
                    pointerTarget.set(event.clientX / window.innerWidth * 2 - 1, event.clientY / window.innerHeight * 2 - 1);
                    invalidate();
                }
            }["PointCloudSystem.useEffect.handlePointerMove"];
            const resetPointer = {
                "PointCloudSystem.useEffect.resetPointer": ()=>{
                    pointerTarget.set(0, 0);
                    invalidate();
                }
            }["PointCloudSystem.useEffect.resetPointer"];
            window.addEventListener("pointermove", handlePointerMove, {
                passive: true
            });
            window.addEventListener("pointerleave", resetPointer);
            window.addEventListener("blur", resetPointer);
            return ({
                "PointCloudSystem.useEffect": ()=>{
                    window.removeEventListener("pointermove", handlePointerMove);
                    window.removeEventListener("pointerleave", resetPointer);
                    window.removeEventListener("blur", resetPointer);
                }
            })["PointCloudSystem.useEffect"];
        }
    }["PointCloudSystem.useEffect"], [
        invalidate,
        pointerTarget,
        reducedMotion
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PointCloudSystem.useEffect": ()=>{
            return ({
                "PointCloudSystem.useEffect": ()=>{
                    geometry.dispose();
                    cloudMaterial.dispose();
                }
            })["PointCloudSystem.useEffect"];
        }
    }["PointCloudSystem.useEffect"], [
        cloudMaterial,
        geometry
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"])({
        "PointCloudSystem.useFrame": ({ camera, clock }, delta)=>{
            const perspectiveCamera = camera;
            const phaseState = sampleSceneProgress(progress.get());
            const shapeFrom = morphTargets[resolveMorphTargetId(phaseState.current.cloud)] ?? morphTargets.face;
            const shapeTo = morphTargets[resolveMorphTargetId(phaseState.next.cloud)] ?? morphTargets.face;
            const noise = phaseState.cloud.noise * profile.noiseMultiplier;
            const blend = reducedMotion ? Math.min(phaseState.mix, 0.6) : phaseState.mix;
            const pulse = reducedMotion ? 0.24 : 0.34 + 0.26 * Math.sin(progress.get() * Math.PI * 6 + clock.elapsedTime * 0.2);
            for(let index = 0; index < pointCount; index += 1){
                const offset = index * 3;
                let x = lerp(shapeFrom[offset], shapeTo[offset], blend);
                let y = lerp(shapeFrom[offset + 1], shapeTo[offset + 1], blend);
                let z = lerp(shapeFrom[offset + 2], shapeTo[offset + 2], blend);
                const drift = noise * (0.01 + index % 5 * 0.0012) * phaseState.cloud.intensity * pulse;
                const seedA = seeds[index * 2];
                const seedB = seeds[index * 2 + 1];
                const spreadX = seedA - 0.5;
                const spreadY = seedB - 0.5;
                const spreadZ = (seedA + seedB) * 0.5 - 0.5;
                x += spreadX * drift;
                y += spreadY * drift * 0.8;
                z += spreadZ * drift * 1.15;
                renderPositions[offset] = x;
                renderPositions[offset + 1] = y;
                renderPositions[offset + 2] = z;
            }
            geometry.attributes.position.needsUpdate = true;
            cloud.position.set(...phaseState.cloud.position);
            pointerCurrent.lerp(pointerTarget, 1 - Math.exp(-delta * 14));
            const trackingStrength = getFaceTrackingWeight(phaseState.current.cloud.shape, phaseState.next.cloud.shape, blend) * (reducedMotion ? 0.45 : 1);
            const pointerPitch = pointerCurrent.y * 0.08 * trackingStrength;
            const pointerYaw = pointerCurrent.x * 0.14 * trackingStrength;
            cloud.rotation.set(phaseState.cloud.rotation[0] + pointerPitch, phaseState.cloud.rotation[1] + pointerYaw, phaseState.cloud.rotation[2]);
            cloud.scale.setScalar(phaseState.cloud.scale);
            cloudMaterial.size = phaseState.cloud.pointSize * profile.sizeMultiplier;
            cloudMaterial.opacity = phaseState.cloud.opacity;
            desiredCamera.set(...phaseState.camera.position);
            cameraTarget.set(...phaseState.camera.target);
            perspectiveCamera.position.copy(desiredCamera);
            perspectiveCamera.lookAt(cameraTarget);
            perspectiveCamera.fov = phaseState.camera.fov;
            perspectiveCamera.updateProjectionMatrix();
            if (pointerCurrent.distanceToSquared(pointerTarget) > 0.00004) {
                invalidate();
            }
        }
    }["PointCloudSystem.useFrame"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("primitive", {
        object: cloud
    }, void 0, false, {
        fileName: "[project]/components/scene-canvas.tsx",
        lineNumber: 261,
        columnNumber: 10
    }, this);
}
_s1(PointCloudSystem, "n+d6A9HZ4AD2PVE6vMP1SUQUdOE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__C__as__useThree$3e$__["useThree"],
        useTypographyVersion,
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"]
    ];
});
_c1 = PointCloudSystem;
function usePointCloudSource(maxPoints) {
    _s2();
    const [rawAssetPositions, setRawAssetPositions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fallbackPositions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "usePointCloudSource.useMemo[fallbackPositions]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$point$2d$cloud$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateFallbackFacePoints"])(maxPoints)
    }["usePointCloudSource.useMemo[fallbackPositions]"], [
        maxPoints
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "usePointCloudSource.useEffect": ()=>{
            let cancelled = false;
            const commitPositions = {
                "usePointCloudSource.useEffect.commitPositions": (positions)=>{
                    if (cancelled || !positions || !positions.length) {
                        return;
                    }
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startTransition"])({
                        "usePointCloudSource.useEffect.commitPositions": ()=>{
                            setRawAssetPositions(positions);
                        }
                    }["usePointCloudSource.useEffect.commitPositions"]);
                }
            }["usePointCloudSource.useEffect.commitPositions"];
            const loadGlbFallback = {
                "usePointCloudSource.useEffect.loadGlbFallback": ()=>{
                    const gltfLoader = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$GLTFLoader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GLTFLoader"]();
                    gltfLoader.load(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FACE_SCAN_GLB_PATH"], {
                        "usePointCloudSource.useEffect.loadGlbFallback": (gltf)=>{
                            if (cancelled) {
                                return;
                            }
                            commitPositions(samplePointsFromScene(gltf.scene, 18000));
                        }
                    }["usePointCloudSource.useEffect.loadGlbFallback"], undefined, {
                        "usePointCloudSource.useEffect.loadGlbFallback": ()=>undefined
                    }["usePointCloudSource.useEffect.loadGlbFallback"]);
                }
            }["usePointCloudSource.useEffect.loadGlbFallback"];
            const plyLoader = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$PLYLoader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLYLoader"]();
            plyLoader.load(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POINT_CLOUD_ASSET_PATH"], {
                "usePointCloudSource.useEffect": (geometry)=>{
                    if (cancelled) {
                        return;
                    }
                    const positions = geometry.getAttribute("position");
                    if (!positions || positions.count === 0) {
                        loadGlbFallback();
                        return;
                    }
                    commitPositions(new Float32Array(positions.array));
                }
            }["usePointCloudSource.useEffect"], undefined, {
                "usePointCloudSource.useEffect": ()=>{
                    loadGlbFallback();
                }
            }["usePointCloudSource.useEffect"]);
            return ({
                "usePointCloudSource.useEffect": ()=>{
                    cancelled = true;
                }
            })["usePointCloudSource.useEffect"];
        }
    }["usePointCloudSource.useEffect"], []);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "usePointCloudSource.useMemo": ()=>{
            if (!rawAssetPositions) {
                return fallbackPositions;
            }
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$point$2d$cloud$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizePositions"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$point$2d$cloud$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["orientImportedPositions"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$point$2d$cloud$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["samplePositions"])(rawAssetPositions, maxPoints)));
        }
    }["usePointCloudSource.useMemo"], [
        fallbackPositions,
        maxPoints,
        rawAssetPositions
    ]);
}
_s2(usePointCloudSource, "o1bTqgGVL6NcEwi1gBFfFZNrnrU=");
function useQualityProfile(reducedMotion) {
    _s3();
    const [profile, setProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        maxPoints: reducedMotion ? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].reducedMaxPoints : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].desktopMaxPoints,
        dpr: reducedMotion ? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].mobileDpr : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].desktopDpr,
        sizeMultiplier: reducedMotion ? 1.2 : 1,
        noiseMultiplier: reducedMotion ? 0.5 : 1,
        textHaloMultiplier: reducedMotion ? 0.2 : 1
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useQualityProfile.useEffect": ()=>{
            const computeProfile = {
                "useQualityProfile.useEffect.computeProfile": ()=>{
                    const width = window.innerWidth;
                    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
                    const memory = "deviceMemory" in navigator ? navigator.deviceMemory ?? 8 : 8;
                    const cores = navigator.hardwareConcurrency ?? 8;
                    const constrainedDevice = coarsePointer || width < 900 || memory <= 4 || cores <= 4;
                    if (reducedMotion) {
                        setProfile({
                            maxPoints: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].reducedMaxPoints,
                            dpr: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].mobileDpr,
                            sizeMultiplier: 1.18,
                            noiseMultiplier: 0.18,
                            textHaloMultiplier: 0.12
                        });
                        return;
                    }
                    setProfile({
                        maxPoints: constrainedDevice ? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].mobileMaxPoints : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].desktopMaxPoints,
                        dpr: constrainedDevice ? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].mobileDpr : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RENDER_DEFAULTS"].desktopDpr,
                        sizeMultiplier: constrainedDevice ? 1.12 : 1,
                        noiseMultiplier: constrainedDevice ? 0.3 : 0.48,
                        textHaloMultiplier: constrainedDevice ? 0.42 : 1
                    });
                }
            }["useQualityProfile.useEffect.computeProfile"];
            computeProfile();
            window.addEventListener("resize", computeProfile);
            return ({
                "useQualityProfile.useEffect": ()=>{
                    window.removeEventListener("resize", computeProfile);
                }
            })["useQualityProfile.useEffect"];
        }
    }["useQualityProfile.useEffect"], [
        reducedMotion
    ]);
    return profile;
}
_s3(useQualityProfile, "WAqXhkSijH3BDn1JcHKcJ/8xpDI=");
function sampleSceneProgress(progress) {
    const clampedProgress = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MathUtils"].clamp(progress, 0, 1);
    let activeIndex = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE_PHASES"].findIndex((phase, index)=>clampedProgress >= phase.range[0] && (clampedProgress <= phase.range[1] || index === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE_PHASES"].length - 1));
    if (activeIndex < 0) {
        activeIndex = 0;
    }
    const current = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE_PHASES"][activeIndex];
    const next = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE_PHASES"][Math.min(activeIndex + 1, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$scene$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SCENE_PHASES"].length - 1)];
    const rangeSpan = Math.max(current.range[1] - current.range[0], 0.0001);
    const linearMix = (clampedProgress - current.range[0]) / rangeSpan;
    const mix = smoothstep(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MathUtils"].clamp(linearMix, 0, 1));
    return {
        current,
        next,
        mix,
        camera: {
            position: lerpVector3(current.camera.position, next.camera.position, mix),
            target: lerpVector3(current.camera.target, next.camera.target, mix),
            fov: lerp(current.camera.fov, next.camera.fov, mix)
        },
        cloud: {
            shape: blendShape(current.cloud.shape, next.cloud.shape, mix),
            textTargetId: blendTextTargetId(current.cloud.textTargetId, next.cloud.textTargetId, mix),
            position: lerpVector3(current.cloud.position, next.cloud.position, mix),
            rotation: lerpVector3(current.cloud.rotation, next.cloud.rotation, mix),
            scale: lerp(current.cloud.scale, next.cloud.scale, mix),
            pointSize: lerp(current.cloud.pointSize, next.cloud.pointSize, mix),
            noise: lerp(current.cloud.noise, next.cloud.noise, mix),
            intensity: lerp(current.cloud.intensity, next.cloud.intensity, mix),
            opacity: lerp(current.cloud.opacity, next.cloud.opacity, mix)
        }
    };
}
function blendShape(current, next, mix) {
    return mix < 0.5 ? current : next;
}
function blendTextTargetId(current, next, mix) {
    return mix < 0.5 ? current : next;
}
function lerp(start, end, progress) {
    return start + (end - start) * progress;
}
function lerpVector3(start, end, progress) {
    return [
        lerp(start[0], end[0], progress),
        lerp(start[1], end[1], progress),
        lerp(start[2], end[2], progress)
    ];
}
function smoothstep(value) {
    return value * value * (3 - 2 * value);
}
function getFaceTrackingWeight(current, next, mix) {
    const currentWeight = current === "face" ? 1 : 0;
    const nextWeight = next === "face" ? 1 : 0;
    return lerp(currentWeight, nextWeight, mix);
}
function hash(index, seed) {
    const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123;
    return value - Math.floor(value);
}
function resolveMorphTargetId(cloud) {
    if (cloud.shape === "text" && cloud.textTargetId) {
        return cloud.textTargetId;
    }
    return cloud.shape === "text" ? "settle" : cloud.shape;
}
function useTypographyVersion(fontDescriptor) {
    _s4();
    const [version, setVersion] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTypographyVersion.useEffect": ()=>{
            if (typeof document === "undefined" || !("fonts" in document)) {
                return;
            }
            let cancelled = false;
            if (document.fonts.check(fontDescriptor)) {
                return;
            }
            Promise.all([
                document.fonts.load(fontDescriptor).catch({
                    "useTypographyVersion.useEffect": ()=>undefined
                }["useTypographyVersion.useEffect"]),
                document.fonts.ready.catch({
                    "useTypographyVersion.useEffect": ()=>undefined
                }["useTypographyVersion.useEffect"])
            ]).then({
                "useTypographyVersion.useEffect": ()=>{
                    if (cancelled) {
                        return;
                    }
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startTransition"])({
                        "useTypographyVersion.useEffect": ()=>{
                            setVersion({
                                "useTypographyVersion.useEffect": (current)=>current + 1
                            }["useTypographyVersion.useEffect"]);
                        }
                    }["useTypographyVersion.useEffect"]);
                }
            }["useTypographyVersion.useEffect"]);
            return ({
                "useTypographyVersion.useEffect": ()=>{
                    cancelled = true;
                }
            })["useTypographyVersion.useEffect"];
        }
    }["useTypographyVersion.useEffect"], [
        fontDescriptor
    ]);
    return version;
}
_s4(useTypographyVersion, "wl/odVD8wVUDLhTU0L9z9/g5EVY=");
function samplePointsFromScene(scene, pointCount) {
    const meshes = [];
    scene.updateMatrixWorld(true);
    scene.traverse((child)=>{
        if ("isMesh" in child && child.isMesh) {
            const mesh = child;
            if (mesh.geometry.getAttribute("position")) {
                meshes.push(mesh);
            }
        }
    });
    if (!meshes.length) {
        return new Float32Array();
    }
    const totalWeight = meshes.reduce((sum, mesh)=>{
        return sum + mesh.geometry.getAttribute("position").count;
    }, 0);
    const samples = [];
    const tempPosition = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]();
    meshes.forEach((mesh, meshIndex)=>{
        const weight = mesh.geometry.getAttribute("position").count / totalWeight;
        const sampleCount = meshIndex === meshes.length - 1 ? pointCount - Math.floor(samples.length / 3) : Math.max(256, Math.floor(pointCount * weight));
        const sampler = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$math$2f$MeshSurfaceSampler$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MeshSurfaceSampler"](mesh).build();
        for(let index = 0; index < sampleCount; index += 1){
            sampler.sample(tempPosition);
            tempPosition.applyMatrix4(mesh.matrixWorld);
            samples.push(tempPosition.x, tempPosition.y, tempPosition.z);
        }
    });
    return new Float32Array(samples);
}
var _c, _c1;
__turbopack_context__.k.register(_c, "SceneCanvas");
__turbopack_context__.k.register(_c1, "PointCloudSystem");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/scene-canvas.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/components/scene-canvas.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=_b4a854a2._.js.map