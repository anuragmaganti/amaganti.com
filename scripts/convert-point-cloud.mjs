#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PLYLoader } from "three/addons/loaders/PLYLoader.js";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error(
    "Usage: npm run point-cloud:convert -- <input.ply> <output.bin>",
  );
  process.exitCode = 1;
} else {
  try {
    await convertPly(inputPath, outputPath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

async function convertPly(sourcePath, destinationPath) {
  const source = await readFile(sourcePath);
  const sourceBuffer = source.buffer.slice(
    source.byteOffset,
    source.byteOffset + source.byteLength,
  );
  const geometry = new PLYLoader().parse(sourceBuffer);
  const positions = geometry.getAttribute("position");

  if (!positions || positions.itemSize < 3 || positions.count === 0) {
    geometry.dispose();
    throw new Error(`No XYZ vertex positions found in ${sourcePath}`);
  }

  const pointCount = positions.count;
  const bytesPerPoint = 3 * Float32Array.BYTES_PER_ELEMENT;
  const output = Buffer.allocUnsafe(pointCount * bytesPerPoint);

  for (let index = 0; index < pointCount; index += 1) {
    const byteOffset = index * bytesPerPoint;
    output.writeFloatLE(positions.getX(index), byteOffset);
    output.writeFloatLE(positions.getY(index), byteOffset + 4);
    output.writeFloatLE(positions.getZ(index), byteOffset + 8);
  }

  geometry.dispose();
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, output);

  console.log(
    `Converted ${pointCount.toLocaleString()} points to ${destinationPath}`,
  );
}
