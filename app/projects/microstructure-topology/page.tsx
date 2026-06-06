"use client";

import { ChangeEvent, memo, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  FileUp,
  Layers3,
  Network,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";
import Navbar from "@/components/Navbar";

type Axis = "XY" | "XZ" | "YZ";
type Objective = "transport" | "stability" | "balanced";

type Volume = {
  dims: [number, number, number];
  values: Float32Array;
};

type DescriptorSummary = {
  volumeFraction: number;
  components: number;
  enclosedVoids: number;
  eulerCharacteristic: number;
  beta1: number;
  surfaceDensity: number;
  throughX: boolean;
  throughY: boolean;
  throughZ: boolean;
  fragmentation: number;
  topologyScore: number;
};

type PersistencePair = { birth: number; death: number };

type SweepPoint = { t: number; beta0: number; beta1: number; beta2: number; chi: number };

const volumeSize = 34;

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function index3D(x: number, y: number, z: number, dims: [number, number, number]) {
  return x + y * dims[0] + z * dims[0] * dims[1];
}

function generateVolume(seed: number, correlation: number, anisotropy: number, noise: number): Volume {
  const random = rng(seed);
  const dims: [number, number, number] = [volumeSize, volumeSize, volumeSize];
  const waves = Array.from({ length: 10 }, () => ({
    theta: random() * Math.PI * 2,
    phi: random() * Math.PI,
    phase: random() * Math.PI * 2,
    amp: 0.45 + random() * 0.75,
  }));
  const raw: number[] = [];
  let min = Infinity;
  let max = -Infinity;

  for (let z = 0; z < dims[2]; z += 1) {
    for (let y = 0; y < dims[1]; y += 1) {
      for (let x = 0; x < dims[0]; x += 1) {
        const nx = x / dims[0] - 0.5;
        const ny = y / dims[1] - 0.5;
        const nz = z / dims[2] - 0.5;
        let value = 0;

        for (const wave of waves) {
          const kx = Math.sin(wave.phi) * Math.cos(wave.theta) * correlation * (1 + anisotropy);
          const ky = Math.sin(wave.phi) * Math.sin(wave.theta) * correlation;
          const kz = Math.cos(wave.phi) * correlation * (1 - anisotropy * 0.45);
          value += wave.amp * Math.sin((nx * kx + ny * ky + nz * kz) * Math.PI * 2 + wave.phase);
        }

        value += (random() - 0.5) * noise * 5.5;
        min = Math.min(min, value);
        max = Math.max(max, value);
        raw.push(value);
      }
    }
  }

  return {
    dims,
    values: Float32Array.from(raw.map((value) => (value - min) / (max - min || 1))),
  };
}

function thresholdVolume(volume: Volume, threshold: number) {
  return Array.from(volume.values, (value) => value >= threshold);
}

function countComponents3D(mask: boolean[], dims: [number, number, number]) {
  const visited = new Uint8Array(mask.length);
  let components = 0;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    components += 1;
    const stack = [start];
    visited[start] = 1;

    while (stack.length) {
      const current = stack.pop() ?? 0;
      const xy = dims[0] * dims[1];
      const z = Math.floor(current / xy);
      const rem = current - z * xy;
      const y = Math.floor(rem / dims[0]);
      const x = rem - y * dims[0];
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < dims[0] - 1 ? current + 1 : -1,
        y > 0 ? current - dims[0] : -1,
        y < dims[1] - 1 ? current + dims[0] : -1,
        z > 0 ? current - xy : -1,
        z < dims[2] - 1 ? current + xy : -1,
      ];

      for (const next of neighbors) {
        if (next >= 0 && mask[next] && !visited[next]) {
          visited[next] = 1;
          stack.push(next);
        }
      }
    }
  }

  return components;
}

function surfaceDensity3D(mask: boolean[], dims: [number, number, number]) {
  let boundaryFaces = 0;
  let totalFaces = 0;

  for (let z = 0; z < dims[2]; z += 1) {
    for (let y = 0; y < dims[1]; y += 1) {
      for (let x = 0; x < dims[0]; x += 1) {
        const current = index3D(x, y, z, dims);
        const neighbors = [
          x < dims[0] - 1 ? index3D(x + 1, y, z, dims) : -1,
          y < dims[1] - 1 ? index3D(x, y + 1, z, dims) : -1,
          z < dims[2] - 1 ? index3D(x, y, z + 1, dims) : -1,
        ];

        for (const next of neighbors) {
          if (next >= 0) {
            boundaryFaces += Number(mask[current] !== mask[next]);
            totalFaces += 1;
          }
        }
      }
    }
  }

  return boundaryFaces / totalFaces;
}

function hasThroughPath(mask: boolean[], dims: [number, number, number], axis: "x" | "y" | "z") {
  const visited = new Uint8Array(mask.length);
  const stack: number[] = [];
  const [xDim, yDim, zDim] = dims;

  for (let z = 0; z < zDim; z += 1) {
    for (let y = 0; y < yDim; y += 1) {
      for (let x = 0; x < xDim; x += 1) {
        const onStart =
          (axis === "x" && x === 0) ||
          (axis === "y" && y === 0) ||
          (axis === "z" && z === 0);
        if (!onStart) continue;

        const index = index3D(x, y, z, dims);
        if (mask[index]) {
          stack.push(index);
          visited[index] = 1;
        }
      }
    }
  }

  while (stack.length) {
    const current = stack.pop() ?? 0;
    const xy = xDim * yDim;
    const z = Math.floor(current / xy);
    const rem = current - z * xy;
    const y = Math.floor(rem / xDim);
    const x = rem - y * xDim;

    if (
      (axis === "x" && x === xDim - 1) ||
      (axis === "y" && y === yDim - 1) ||
      (axis === "z" && z === zDim - 1)
    ) {
      return true;
    }

    const neighbors = [
      x > 0 ? current - 1 : -1,
      x < xDim - 1 ? current + 1 : -1,
      y > 0 ? current - xDim : -1,
      y < yDim - 1 ? current + xDim : -1,
      z > 0 ? current - xy : -1,
      z < zDim - 1 ? current + xy : -1,
    ];

    for (const next of neighbors) {
      if (next >= 0 && mask[next] && !visited[next]) {
        visited[next] = 1;
        stack.push(next);
      }
    }
  }

  return false;
}

// Euler characteristic via inclusion-exclusion on the cubical complex:
// χ = V - F + E - C
// V = solid voxels, F = face-adjacent solid pairs, E = solid 2×2 squares, C = solid 2×2×2 cubes
function computeEulerCharacteristic(mask: boolean[], dims: [number, number, number]): number {
  const [nx, ny, nz] = dims;
  let V = 0, F = 0, E = 0, C = 0;

  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const c = index3D(x, y, z, dims);
        if (!mask[c]) continue;
        V++;
        const px = x < nx - 1 ? index3D(x + 1, y, z, dims) : -1;
        const py = y < ny - 1 ? index3D(x, y + 1, z, dims) : -1;
        const pz = z < nz - 1 ? index3D(x, y, z + 1, dims) : -1;
        if (px >= 0 && mask[px]) F++;
        if (py >= 0 && mask[py]) F++;
        if (pz >= 0 && mask[pz]) F++;
        if (px >= 0 && py >= 0 && mask[px] && mask[py] && mask[index3D(x + 1, y + 1, z, dims)]) E++;
        if (px >= 0 && pz >= 0 && mask[px] && mask[pz] && mask[index3D(x + 1, y, z + 1, dims)]) E++;
        if (py >= 0 && pz >= 0 && mask[py] && mask[pz] && mask[index3D(x, y + 1, z + 1, dims)]) E++;
        if (
          px >= 0 && py >= 0 && pz >= 0 &&
          mask[px] && mask[py] && mask[pz] &&
          mask[index3D(x + 1, y + 1, z, dims)] &&
          mask[index3D(x + 1, y, z + 1, dims)] &&
          mask[index3D(x, y + 1, z + 1, dims)] &&
          mask[index3D(x + 1, y + 1, z + 1, dims)]
        ) C++;
      }
    }
  }

  return V - F + E - C;
}

// β₂: connected components of void phase that do not touch the volume boundary (enclosed pores)
function countEnclosedVoids(mask: boolean[], dims: [number, number, number]): number {
  const [nx, ny, nz] = dims;
  const n = mask.length;
  const visited = new Uint8Array(n);
  const stack: number[] = [];

  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const onBoundary = x === 0 || x === nx - 1 || y === 0 || y === ny - 1 || z === 0 || z === nz - 1;
        if (!onBoundary) continue;
        const idx = index3D(x, y, z, dims);
        if (!mask[idx] && !visited[idx]) {
          visited[idx] = 1;
          stack.push(idx);
        }
      }
    }
  }

  while (stack.length) {
    const cur = stack.pop() ?? 0;
    const xy = nx * ny;
    const z = Math.floor(cur / xy);
    const rem = cur - z * xy;
    const y = Math.floor(rem / nx);
    const x = rem - y * nx;
    const neighbors = [
      x > 0 ? cur - 1 : -1, x < nx - 1 ? cur + 1 : -1,
      y > 0 ? cur - nx : -1, y < ny - 1 ? cur + nx : -1,
      z > 0 ? cur - xy : -1, z < nz - 1 ? cur + xy : -1,
    ];
    for (const nb of neighbors) {
      if (nb >= 0 && !mask[nb] && !visited[nb]) { visited[nb] = 1; stack.push(nb); }
    }
  }

  let enclosed = 0;
  for (let i = 0; i < n; i++) {
    if (!mask[i] && !visited[i]) {
      enclosed++;
      const inner: number[] = [i];
      visited[i] = 1;
      while (inner.length) {
        const cur = inner.pop() ?? 0;
        const xy = nx * ny;
        const z = Math.floor(cur / xy);
        const rem = cur - z * xy;
        const y = Math.floor(rem / nx);
        const x = rem - y * nx;
        const neighbors = [
          x > 0 ? cur - 1 : -1, x < nx - 1 ? cur + 1 : -1,
          y > 0 ? cur - nx : -1, y < ny - 1 ? cur + nx : -1,
          z > 0 ? cur - xy : -1, z < nz - 1 ? cur + xy : -1,
        ];
        for (const nb of neighbors) {
          if (nb >= 0 && !mask[nb] && !visited[nb]) { visited[nb] = 1; inner.push(nb); }
        }
      }
    }
  }

  return enclosed;
}

// 0-dimensional superlevel-set persistence via union-find with the elder rule.
// Process voxels from highest to lowest value; record (birth, death) when components merge.
function computePersistencePairs(volume: Volume): PersistencePair[] {
  const { dims, values } = volume;
  const [nx, ny, nz] = dims;
  const n = values.length;

  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[b] - values[a]);
  const parent = new Int32Array(n).fill(-1);
  const birthVal = new Float32Array(n);
  const pairs: PersistencePair[] = [];

  function find(x: number): number {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }

  for (const idx of order) {
    const t = values[idx];
    parent[idx] = idx;
    birthVal[idx] = t;

    const xy = nx * ny;
    const z = Math.floor(idx / xy);
    const rem = idx - z * xy;
    const y = Math.floor(rem / nx);
    const x = rem - y * nx;

    const neighbors = [
      x > 0 ? idx - 1 : -1, x < nx - 1 ? idx + 1 : -1,
      y > 0 ? idx - nx : -1, y < ny - 1 ? idx + nx : -1,
      z > 0 ? idx - xy : -1, z < nz - 1 ? idx + xy : -1,
    ];

    const roots = new Set<number>([idx]);
    for (const nb of neighbors) {
      if (nb >= 0 && parent[nb] !== -1) roots.add(find(nb));
    }

    if (roots.size > 1) {
      let elder = idx;
      for (const r of roots) { if (birthVal[r] > birthVal[elder]) elder = r; }
      for (const r of roots) {
        if (r !== elder) {
          if (birthVal[r] - t > 0.015) pairs.push({ birth: birthVal[r], death: t });
          parent[r] = elder;
        }
      }
    }
  }

  return pairs;
}

// Threshold sweep: compute Betti numbers and Euler characteristic at 30 evenly-spaced thresholds.
// This produces the topological phase diagram — showing how topology evolves with threshold.
// Key events: percolation threshold (β₀ breaks from 1 to >1), peak β₁ (max tunneling),
// β₂ onset (first enclosed pores). Only recomputes when the volume changes.
function computeThresholdSweep(volume: Volume): SweepPoint[] {
  const steps = 30;
  const points: SweepPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mask = thresholdVolume(volume, t);
    const beta0 = countComponents3D(mask, volume.dims);
    const chi = computeEulerCharacteristic(mask, volume.dims);
    const beta2 = countEnclosedVoids(mask, volume.dims);
    const beta1 = Math.max(0, beta0 + beta2 - chi);
    points.push({ t, beta0, beta1, beta2, chi });
  }
  return points;
}

// S₂(r) = (1/N(r)) Σ_{|x-y|∈[r,r+dr)} φ(x)φ(y)
// Enumerate integer displacement shells grouped by rounded Euclidean distance.
// Returns array of { r, s2 } where s2 is normalized by φ̄² so s2(∞)→1.
type S2Point = { r: number; s2: number };
function computeTwoPointCorrelation(volume: Volume, threshold: number, maxR = 16): S2Point[] {
  const { dims, values } = volume;
  const [nx, ny, nz] = dims;
  const phi: number[] = new Array(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    phi[i] = values[i] >= threshold ? 1 : 0;
    sum += phi[i];
  }
  const phiBar = sum / values.length;
  if (phiBar === 0 || phiBar === 1) return [];

  // Accumulate per-distance-bin
  const bins = new Float64Array(maxR + 1);
  const counts = new Float64Array(maxR + 1);

  for (let dz = 0; dz <= maxR; dz++) {
    for (let dy = -maxR; dy <= maxR; dy++) {
      for (let dx = -maxR; dx <= maxR; dx++) {
        const rr = dx * dx + dy * dy + dz * dz;
        if (rr > maxR * maxR) continue;
        const r = Math.round(Math.sqrt(rr));
        if (r > maxR) continue;
        // Only sample a stride-2 subset for speed
        for (let z = 0; z < nz; z += 2) {
          const z2 = z + dz;
          if (z2 < 0 || z2 >= nz) continue;
          for (let y = 0; y < ny; y += 2) {
            const y2 = y + dy;
            if (y2 < 0 || y2 >= ny) continue;
            for (let x = 0; x < nx; x += 2) {
              const x2 = x + dx;
              if (x2 < 0 || x2 >= nx) continue;
              bins[r] += phi[index3D(x, y, z, dims)] * phi[index3D(x2, y2, z2, dims)];
              counts[r]++;
            }
          }
        }
      }
    }
  }

  const phiBar2 = phiBar * phiBar;
  const result: S2Point[] = [];
  for (let r = 0; r <= maxR; r++) {
    if (counts[r] > 0) result.push({ r, s2: bins[r] / counts[r] / phiBar2 });
  }
  return result;
}

// S(k) = (1/N)|FFT(φ - φ̄)|² radially averaged in k-space.
// Zero-pads each axis to the next power of 2 so radix-2 Cooley-Tukey is valid
// for any input size (e.g. the 34³ generated volume pads to 64³).
type SkPoint = { k: number; sk: number };
function computeStructureFactor(volume: Volume, threshold: number): SkPoint[] {
  const { dims, values } = volume;
  const [nx, ny, nz] = dims;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i] >= threshold ? 1 : 0;
  const phiBar = sum / values.length;

  const nextPow2 = (n: number) => { let p = 1; while (p < n) p <<= 1; return p; };
  const Px = nextPow2(nx), Py = nextPow2(ny), Pz = nextPow2(nz);
  const Ptotal = Px * Py * Pz;

  // Zero-padded complex arrays; index = x + y*Px + z*Px*Py
  const re = new Float64Array(Ptotal);
  const im = new Float64Array(Ptotal);
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++)
        re[x + y * Px + z * Px * Py] = (values[index3D(x, y, z, dims)] >= threshold ? 1 : 0) - phiBar;

  function fft1d(re: Float64Array, im: Float64Array, n: number, stride: number, offset: number) {
    let j = 0;
    for (let i = 1; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const ai = offset + i * stride, aj = offset + j * stride;
        let t = re[ai]; re[ai] = re[aj]; re[aj] = t;
        t = im[ai]; im[ai] = im[aj]; im[aj] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len;
      const wRe = Math.cos(ang), wIm = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let curRe = 1, curIm = 0;
        for (let k = 0; k < len / 2; k++) {
          const u = offset + (i + k) * stride, v = offset + (i + k + len / 2) * stride;
          const tRe = curRe * re[v] - curIm * im[v];
          const tIm = curRe * im[v] + curIm * re[v];
          re[v] = re[u] - tRe; im[v] = im[u] - tIm;
          re[u] += tRe; im[u] += tIm;
          const newCurRe = curRe * wRe - curIm * wIm;
          curIm = curRe * wIm + curIm * wRe;
          curRe = newCurRe;
        }
      }
    }
  }

  // Separable 3D FFT over the padded grid
  for (let z = 0; z < Pz; z++) for (let y = 0; y < Py; y++)
    fft1d(re, im, Px, 1, y * Px + z * Px * Py);
  for (let z = 0; z < Pz; z++) for (let x = 0; x < Px; x++)
    fft1d(re, im, Py, Px, x + z * Px * Py);
  for (let y = 0; y < Py; y++) for (let x = 0; x < Px; x++)
    fft1d(re, im, Pz, Px * Py, x + y * Px);

  // Radially average |FT|²/Ptotal in k-space (centered frequencies)
  const maxK = Math.floor(Math.min(Px, Py, Pz) / 2);
  const bins = new Float64Array(maxK + 1);
  const cnts = new Float64Array(maxK + 1);
  for (let z = 0; z < Pz; z++) {
    const kz = z <= Pz / 2 ? z : z - Pz;
    for (let y = 0; y < Py; y++) {
      const ky = y <= Py / 2 ? y : y - Py;
      for (let x = 0; x < Px; x++) {
        const kx = x <= Px / 2 ? x : x - Px;
        const kr = Math.round(Math.sqrt(kx * kx + ky * ky + kz * kz));
        if (kr > maxK) continue;
        const idx = x + y * Px + z * Px * Py;
        bins[kr] += re[idx] * re[idx] + im[idx] * im[idx];
        cnts[kr]++;
      }
    }
  }

  const result: SkPoint[] = [];
  for (let k = 0; k <= maxK; k++) {
    if (cnts[k] > 0) result.push({ k, sk: bins[k] / cnts[k] / Ptotal });
  }
  return result;
}

function analyzeVolume(volume: Volume, threshold: number): DescriptorSummary {
  const mask = thresholdVolume(volume, threshold);
  const volumeFraction = mask.filter(Boolean).length / mask.length;
  const components = countComponents3D(mask, volume.dims);
  const surfaceDensity = surfaceDensity3D(mask, volume.dims);
  const throughX = hasThroughPath(mask, volume.dims, "x");
  const throughY = hasThroughPath(mask, volume.dims, "y");
  const throughZ = hasThroughPath(mask, volume.dims, "z");
  const fragmentation = Math.min(1, Math.max(0, (components - 1) / 30));
  const topologyScore = (
    Number(throughX) +
    Number(throughY) +
    Number(throughZ) +
    Math.max(0, 1 - fragmentation)
  ) / 4;
  const eulerCharacteristic = computeEulerCharacteristic(mask, volume.dims);
  const enclosedVoids = countEnclosedVoids(mask, volume.dims);
  // χ = β₀ − β₁ + β₂  →  β₁ = β₀ + β₂ − χ
  const beta1 = Math.max(0, components + enclosedVoids - eulerCharacteristic);

  return {
    volumeFraction,
    components,
    enclosedVoids,
    eulerCharacteristic,
    beta1,
    surfaceDensity,
    throughX,
    throughY,
    throughZ,
    fragmentation,
    topologyScore,
  };
}

function closeness(value: number, target: number, tolerance: number) {
  return Math.max(0, 1 - Math.abs(value - target) / tolerance);
}

function scoreCandidate(summary: DescriptorSummary, objective: Objective) {
  const pathCount = Number(summary.throughX) + Number(summary.throughY) + Number(summary.throughZ);
  const connectedness = Math.max(0, 1 - summary.fragmentation);
  const porosityBalance = closeness(summary.volumeFraction, 0.48, 0.28);
  const surfaceControl = closeness(summary.surfaceDensity, 0.18, 0.16);

  if (objective === "transport") {
    return 34 * (pathCount / 3) + 26 * porosityBalance + 22 * connectedness + 18 * surfaceControl;
  }

  if (objective === "stability") {
    return (
      34 * closeness(summary.volumeFraction, 0.62, 0.22) +
      30 * connectedness +
      22 * surfaceControl +
      14 * Number(pathCount >= 1)
    );
  }

  return 26 * (pathCount / 3) + 25 * porosityBalance + 25 * connectedness + 24 * surfaceControl;
}

function explainCandidate(summary: DescriptorSummary, objective: Objective) {
  const pathCount = Number(summary.throughX) + Number(summary.throughY) + Number(summary.throughZ);

  if (objective === "transport") {
    return pathCount >= 2
      ? "multi-axis connectivity with balanced porosity"
      : "limited transport path availability";
  }

  if (objective === "stability") {
    return summary.components <= 2
      ? "low fragmentation and controlled surface complexity"
      : "fragmented solid network reduces stability proxy";
  }

  return pathCount >= 1 && summary.fragmentation < 0.35
    ? "balanced connectivity and manufacturable complexity"
    : "acceptable morphology but weaker topology balance";
}

function screenCandidates({
  baseSeed,
  correlation,
  anisotropy,
  noise,
  threshold,
  objective,
}: {
  baseSeed: number;
  correlation: number;
  anisotropy: number;
  noise: number;
  threshold: number;
  objective: Objective;
}) {
  return Array.from({ length: 24 }, (_, index) => {
    const seed = baseSeed + index * 37 + 19;
    const volume = generateVolume(seed, correlation, anisotropy, noise);
    const summary = analyzeVolume(volume, threshold);

    return {
      ...summary,
      seed,
      score: scoreCandidate(summary, objective),
      reason: explainCandidate(summary, objective),
    };
  }).sort((a, b) => b.score - a.score);
}

function getSlice(mask: boolean[], dims: [number, number, number], axis: Axis, slice: number) {
  const [xDim, yDim, zDim] = dims;
  const width = axis === "YZ" ? zDim : xDim;
  const height = axis === "XY" ? yDim : zDim;
  const cells: boolean[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const x = axis === "YZ" ? slice : col;
      const y = axis === "XZ" ? slice : axis === "YZ" ? col : row;
      const z = axis === "XY" ? slice : row;
      cells.push(mask[index3D(x, y, z, dims)]);
    }
  }

  return { width, height, cells };
}

const MicrostructureSlice = memo(function MicrostructureSlice({
  mask,
  dims,
  axis,
  slice,
  compact = false,
}: {
  mask: boolean[];
  dims: [number, number, number];
  axis: Axis;
  slice: number;
  compact?: boolean;
}) {
  const safeSlice = Math.min(slice, axis === "XY" ? dims[2] - 1 : axis === "XZ" ? dims[1] - 1 : dims[0] - 1);
  const { width, height, cells } = getSlice(mask, dims, axis, safeSlice);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`${compact ? "h-28" : "aspect-square w-full"} rounded-2xl bg-[#071014]`}
    >
      {cells.map((filled, index) => (
        <rect
          key={index}
          x={index % width}
          y={Math.floor(index / width)}
          width="1"
          height="1"
          fill={filled ? "#35f0d0" : "#071014"}
        />
      ))}
    </svg>
  );
});

const MiniVoxelSolid = memo(function MiniVoxelSolid({
  mask,
  dims,
  color,
}: {
  mask: boolean[];
  dims: [number, number, number];
  color: "blue" | "gold";
}) {
  const points = useMemo(() => {
    const [xDim, yDim, zDim] = dims;
    const exposed: Array<[number, number, number]> = [];

    for (let z = 0; z < zDim; z += 1) {
      for (let y = 0; y < yDim; y += 1) {
        for (let x = 0; x < xDim; x += 1) {
          const index = index3D(x, y, z, dims);
          if (!mask[index]) continue;

          const neighbors = [
            x > 0 ? index3D(x - 1, y, z, dims) : -1,
            x < xDim - 1 ? index3D(x + 1, y, z, dims) : -1,
            y > 0 ? index3D(x, y - 1, z, dims) : -1,
            y < yDim - 1 ? index3D(x, y + 1, z, dims) : -1,
            z > 0 ? index3D(x, y, z - 1, dims) : -1,
            z < zDim - 1 ? index3D(x, y, z + 1, dims) : -1,
          ];

          if (neighbors.some((next) => next < 0 || !mask[next])) {
            exposed.push([
              x - (xDim - 1) / 2,
              y - (yDim - 1) / 2,
              z - (zDim - 1) / 2,
            ]);
          }
        }
      }
    }

    const stride = Math.max(1, Math.ceil(exposed.length / 700));
    return exposed.filter((_, index) => index % stride === 0);
  }, [dims, mask]);

  const projected = useMemo(() => {
    const yaw = color === "blue" ? -0.72 : 0.66;
    const pitch = 0.58;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const scale = 3.4;

    return points
      .map(([x, y, z]) => {
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;
        const ry = y * cosP - rz * sinP;
        const depth = y * sinP + rz * cosP;

        return {
          x: 98 + rx * scale,
          y: 96 + ry * scale,
          depth,
          shade: Math.max(0.35, Math.min(1, 0.58 + depth / 36)),
        };
      })
      .sort((a, b) => a.depth - b.depth);
  }, [color, points]);

  const rgb = color === "blue" ? "96, 165, 250" : "180, 150, 92";

  return (
    <svg viewBox="0 0 196 184" className="h-44 w-full rounded-2xl bg-black/20">
      <ellipse cx="98" cy="144" rx="64" ry="18" fill="rgba(0,0,0,0.25)" />
      {projected.map((point, index) => (
        <rect
          key={index}
          x={point.x}
          y={point.y}
          width="4.3"
          height="4.3"
          rx="0.7"
          fill={`rgba(${rgb}, ${point.shade})`}
          stroke="rgba(7, 16, 20, 0.28)"
          strokeWidth="0.3"
        />
      ))}
    </svg>
  );
});

// Real 0-dim persistence diagram: each point = a solid component (birth threshold, death threshold).
// Distance from diagonal = persistence = how long the component survived as threshold decreased.
const PersistenceDiagram = memo(function PersistenceDiagram({ pairs }: { pairs: PersistencePair[] }) {
  const W = 190, H = 150, pad = 22;
  const iw = W - 2 * pad, ih = H - 2 * pad;

  const maxPersistence = pairs.reduce((m, p) => Math.max(m, p.birth - p.death), 0.001);

  function toSVG(birth: number, death: number) {
    return {
      cx: pad + death * iw,
      cy: H - pad - birth * ih,
    };
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full rounded-2xl border border-white/10 bg-[#071014]">
      {/* Diagonal (birth = death line) */}
      <line x1={pad} y1={H - pad} x2={W - pad} y2={pad} stroke="#334155" strokeDasharray="4 3" strokeWidth="0.8" />
      {/* Axes */}
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#475569" strokeWidth="0.8" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#475569" strokeWidth="0.8" />
      {/* Points */}
      {pairs.map((p, i) => {
        const pers = p.birth - p.death;
        const { cx, cy } = toSVG(p.birth, p.death);
        const alpha = 0.35 + 0.65 * (pers / maxPersistence);
        const r = 1.8 + 3.2 * (pers / maxPersistence);
        return <circle key={i} cx={cx} cy={cy} r={r} fill={`rgba(53,240,208,${alpha.toFixed(2)})`} />;
      })}
      {pairs.length === 0 && (
        <text x={W / 2} y={H / 2} fontSize="8" fill="#475569" textAnchor="middle">no pairs above threshold</text>
      )}
      {/* Labels */}
      <text x={W / 2} y={H - 5} fontSize="8" fill="#64748b" textAnchor="middle">death threshold →</text>
      <text x="7" y={H / 2} fontSize="8" fill="#64748b" textAnchor="middle" transform={`rotate(-90 7 ${H / 2})`}>birth →</text>
      <text x={W - pad - 2} y={pad + 10} fontSize="7" fill="#35f0d0" textAnchor="end">{pairs.length} pairs</text>
    </svg>
  );
});

const DesignToManufacturingWorkflow = memo(function DesignToManufacturingWorkflow({
  mask,
  dims,
  summary,
  objective,
  pairs,
}: {
  mask: boolean[];
  dims: [number, number, number];
  summary: DescriptorSummary;
  objective: Objective;
  pairs: PersistencePair[];
}) {
  const feasible = summary.topologyScore > 0.62 && summary.fragmentation < 0.55;

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Design To Additive Manufacturing Screening</h2>
            <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
              Morphology descriptors and topology checks provide an early feasibility gate for
              microstructure designs before expensive simulation, fabrication, or inverse design
              refinement.
            </p>
          </div>
          <span className={`w-fit rounded-full border px-4 py-2 text-sm font-semibold ${
            feasible
              ? "border-teal-300/40 bg-teal-300/10 text-teal-100"
              : "border-yellow-300/40 bg-yellow-300/10 text-yellow-100"
          }`}>
            {feasible ? "Feasible candidate" : "Needs redesign"}
          </span>
        </div>

        <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className="rounded-3xl border border-sky-300/15 bg-sky-300/5 p-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-sky-200">Design</p>
            <MiniVoxelSolid mask={mask} dims={dims} color="blue" />
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Candidate 3D microstructure generated or uploaded as a thresholded two-phase volume.
            </p>
          </div>

          <div className="hidden text-4xl text-zinc-600 lg:block">→</div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-300">
              Topology Gate
            </p>
            <PersistenceDiagram pairs={pairs} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-400">
              <span>β₀ {summary.components} / β₁ {summary.beta1}</span>
              <span>β₂ {summary.enclosedVoids} / χ {summary.eulerCharacteristic}</span>
              <span>Objective: {objective}</span>
              <span>Paths {Number(summary.throughX) + Number(summary.throughY) + Number(summary.throughZ)}/3</span>
            </div>
          </div>

          <div className="hidden text-4xl text-zinc-600 lg:block">→</div>

          <div className="rounded-3xl border border-yellow-300/15 bg-yellow-300/5 p-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-yellow-100">
              Additive Manufacturing
            </p>
            <MiniVoxelSolid mask={mask} dims={dims} color="gold" />
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Ranked candidate prepared for downstream FEM/CFD simulation, printability checks,
              or inverse design refinement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});

// Renders each exposed voxel face as a shaded quad on Canvas — gives a solid sponge/lattice look
// instead of scattered dots. Backface culling + painter's algorithm depth sort.
const RotatableVoxelView = memo(function RotatableVoxelView({ mask, dims }: { mask: boolean[]; dims: [number, number, number] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [yaw, setYaw] = useState(-0.65);
  const [pitch, setPitch] = useState(0.55);
  const dragRef = useRef({ active: false, x: 0, y: 0, yaw: 0, pitch: 0 });

  // Precompute surface face geometry (model-space corners + outward normal).
  // Only recomputes when mask or dims change.
  const faces = useMemo(() => {
    const [dX, dY, dZ] = dims;
    const ox = (dX - 1) / 2, oy = (dY - 1) / 2, oz = (dZ - 1) / 2;

    type FCfg = {
      dx: number; dy: number; dz: number;
      fnx: number; fny: number; fnz: number;
      quad: (x: number, y: number, z: number) => [number, number, number][];
    };

    const cfgs: FCfg[] = [
      { dx: 1, dy: 0, dz: 0, fnx: 1, fny: 0, fnz: 0,
        quad: (x, y, z) => [[x+1-ox,y-oy,z-oz],[x+1-ox,y+1-oy,z-oz],[x+1-ox,y+1-oy,z+1-oz],[x+1-ox,y-oy,z+1-oz]] },
      { dx:-1, dy: 0, dz: 0, fnx:-1, fny: 0, fnz: 0,
        quad: (x, y, z) => [[x-ox,y-oy,z-oz],[x-ox,y-oy,z+1-oz],[x-ox,y+1-oy,z+1-oz],[x-ox,y+1-oy,z-oz]] },
      { dx: 0, dy: 1, dz: 0, fnx: 0, fny: 1, fnz: 0,
        quad: (x, y, z) => [[x-ox,y+1-oy,z-oz],[x+1-ox,y+1-oy,z-oz],[x+1-ox,y+1-oy,z+1-oz],[x-ox,y+1-oy,z+1-oz]] },
      { dx: 0, dy:-1, dz: 0, fnx: 0, fny:-1, fnz: 0,
        quad: (x, y, z) => [[x-ox,y-oy,z-oz],[x-ox,y-oy,z+1-oz],[x+1-ox,y-oy,z+1-oz],[x+1-ox,y-oy,z-oz]] },
      { dx: 0, dy: 0, dz: 1, fnx: 0, fny: 0, fnz: 1,
        quad: (x, y, z) => [[x-ox,y-oy,z+1-oz],[x+1-ox,y-oy,z+1-oz],[x+1-ox,y+1-oy,z+1-oz],[x-ox,y+1-oy,z+1-oz]] },
      { dx: 0, dy: 0, dz:-1, fnx: 0, fny: 0, fnz:-1,
        quad: (x, y, z) => [[x-ox,y-oy,z-oz],[x-ox,y+1-oy,z-oz],[x+1-ox,y+1-oy,z-oz],[x+1-ox,y-oy,z-oz]] },
    ];

    const result: Array<{ v: [number, number, number][]; n: [number, number, number] }> = [];

    for (let z = 0; z < dZ; z++) {
      for (let y = 0; y < dY; y++) {
        for (let x = 0; x < dX; x++) {
          if (!mask[index3D(x, y, z, dims)]) continue;
          for (const cfg of cfgs) {
            const bx = x + cfg.dx, by = y + cfg.dy, bz = z + cfg.dz;
            const exposed =
              bx < 0 || bx >= dX || by < 0 || by >= dY || bz < 0 || bz >= dZ ||
              !mask[index3D(bx, by, bz, dims)];
            if (exposed) result.push({ v: cfg.quad(x, y, z), n: [cfg.fnx, cfg.fny, cfg.fnz] });
          }
        }
      }
    }
    return result;
  }, [mask, dims]);

  // Draw on canvas whenever faces or camera angles change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#071014";
    ctx.fillRect(0, 0, W, H);

    // Decorative circle
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(53,240,208,0.03)";
    ctx.fill();
    ctx.strokeStyle = "rgba(53,240,208,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const scale = (Math.min(W, H) - 48) / dims[0];
    const cxS = W / 2, cyS = H / 2;

    function project(px: number, py: number, pz: number) {
      const rx = px * cosY - pz * sinY;
      const rz = px * sinY + pz * cosY;
      const ry = py * cosP - rz * sinP;
      const depth = py * sinP + rz * cosP;
      return { sx: cxS + rx * scale, sy: cyS + ry * scale, depth };
    }

    // Fixed light in view space: upper-left-front (does not rotate with model)
    const lx = -0.38, ly = -0.76, lz = -0.53;

    const visible: Array<{ pts: { sx: number; sy: number; depth: number }[]; depth: number; shade: number }> = [];

    for (const face of faces) {
      const [fnx, fny, fnz] = face.n;
      // Rotate normal into view space
      const rnx = fnx * cosY - fnz * sinY;
      const rnz = fnx * sinY + fnz * cosY;
      const rny = fny * cosP - rnz * sinP;
      const rnDepth = fny * sinP + rnz * cosP;

      // Backface cull: visible faces have rotated normal pointing toward camera (rnDepth < 0)
      if (rnDepth >= 0) continue;

      const pts = face.v.map(([px, py, pz]) => project(px, py, pz));
      const depth = (pts[0].depth + pts[1].depth + pts[2].depth + pts[3].depth) * 0.25;
      const diffuse = Math.max(0, rnx * lx + rny * ly + rnDepth * lz);
      visible.push({ pts, depth, shade: 0.22 + 0.78 * diffuse });
    }

    // Painter's algorithm: far to near
    visible.sort((a, b) => a.depth - b.depth);

    for (const face of visible) {
      const s = face.shade;
      ctx.fillStyle = `rgb(${Math.round(53 * s)},${Math.round(240 * s)},${Math.round(208 * s)})`;
      ctx.strokeStyle = "rgba(7,16,20,0.18)";
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(face.pts[0].sx, face.pts[0].sy);
      ctx.lineTo(face.pts[1].sx, face.pts[1].sy);
      ctx.lineTo(face.pts[2].sx, face.pts[2].sy);
      ctx.lineTo(face.pts[3].sx, face.pts[3].sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }, [faces, yaw, pitch, dims]);

  function startDrag(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = { active: true, x: event.clientX, y: event.clientY, yaw, pitch };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current.active) return;
    setYaw(dragRef.current.yaw + (event.clientX - dragRef.current.x) * 0.01);
    setPitch(Math.max(-1.1, Math.min(1.1, dragRef.current.pitch + (event.clientY - dragRef.current.y) * 0.01)));
  }

  function stopDrag() { dragRef.current.active = false; }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Rotatable solid-surface preview</p>
          <p className="text-xs text-zinc-500">Drag to rotate. Surface faces are shaded with a fixed overhead light.</p>
        </div>
        <button
          type="button"
          onClick={() => { setYaw(-0.65); setPitch(0.55); }}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-teal-300/50 hover:text-teal-100"
        >
          Reset
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={340}
        height={340}
        className="aspect-square w-full cursor-grab rounded-xl bg-[#071014] active:cursor-grabbing"
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
      />
    </div>
  );
});

const CorrelationAnalysis = memo(function CorrelationAnalysis({
  s2,
  sk,
  volumeFraction,
}: {
  s2: S2Point[];
  sk: SkPoint[];
  volumeFraction: number;
}) {
  const W = 340, H = 180, pad = { l: 44, r: 12, t: 16, b: 36 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  // S₂(r) chart: x = r (voxels), y = S₂(r)/φ̄²  (= 1/φ̄ at r=0, → 1 as r→∞)
  const s2MaxY = s2.length > 0 ? Math.max(...s2.map((p) => p.s2)) : 2;
  const s2MinY = 0.8;
  const s2YRange = Math.max(s2MaxY - s2MinY, 0.2);
  const s2MaxR = s2.length > 0 ? s2[s2.length - 1].r : 16;
  const s2X = (r: number) => pad.l + (r / s2MaxR) * innerW;
  const s2Y = (v: number) => pad.t + innerH - ((v - s2MinY) / s2YRange) * innerH;
  const s2Path =
    s2.length === 0
      ? ""
      : s2.map((p, i) => `${i === 0 ? "M" : "L"}${s2X(p.r).toFixed(1)},${s2Y(p.s2).toFixed(1)}`).join(" ");

  // S(k) chart: x = k (wavenumber), y = S(k) on log scale, skip k=0
  const skFiltered = sk.filter((p) => p.k > 0 && p.sk > 0);
  const skMaxK = skFiltered.length > 0 ? skFiltered[skFiltered.length - 1].k : 1;
  const skLogMin = skFiltered.length > 0 ? Math.log10(Math.min(...skFiltered.map((p) => p.sk))) : -6;
  const skLogMax = skFiltered.length > 0 ? Math.log10(Math.max(...skFiltered.map((p) => p.sk))) : 0;
  const skLogRange = skLogMax - skLogMin || 1;
  const skX = (k: number) => pad.l + (k / skMaxK) * innerW;
  const skY = (v: number) => pad.t + innerH - ((Math.log10(v) - skLogMin) / skLogRange) * innerH;
  const skPath =
    skFiltered.length === 0
      ? ""
      : skFiltered.map((p, i) => `${i === 0 ? "M" : "L"}${skX(p.k).toFixed(1)},${skY(p.sk).toFixed(1)}`).join(" ");

  // Hyperuniformity: S(k→0) should → 0. Check first few non-zero k bins.
  const smallK = skFiltered.slice(0, 3);
  const skSmall = smallK.length > 0 ? smallK.reduce((a, p) => a + p.sk, 0) / smallK.length : null;
  const skMid = skFiltered.length > 0 ? skFiltered[Math.floor(skFiltered.length / 2)].sk : null;
  const hyperuniform = skSmall !== null && skMid !== null && skSmall < skMid * 0.15;

  // Correlation length: r where S₂ crosses (1 + 1/φ̄) / 2 from above
  const target = volumeFraction > 0 ? (1 / volumeFraction + 1) / 2 : 1.5;
  const xiPoint = s2.find((p) => p.s2 <= target);
  const xi = xiPoint ? xiPoint.r : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-3 mb-2">
        <Network className="text-violet-400" />
        <h2 className="text-2xl font-semibold">Spatial Correlation &amp; Hyperuniformity</h2>
      </div>
      <p className="text-sm text-zinc-400 mb-6 max-w-3xl leading-6">
        The two-point correlation S₂(r) measures the probability that two points separated by distance r are both in the
        solid phase. The structure factor S(k) is its Fourier transform; hyperuniform materials exhibit S(k→0)→0,
        suppressing large-scale density fluctuations—a key design target for phononic metamaterials.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* S₂(r) chart */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold text-zinc-300 mb-3">
            Two-Point Correlation S₂(r) / φ̄²
          </p>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
            {/* Axes */}
            <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#52525b" strokeWidth={1} />
            <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="#52525b" strokeWidth={1} />
            {/* φ̄² reference line (normalized = 1) */}
            <line
              x1={pad.l} x2={pad.l + innerW}
              y1={s2Y(1)} y2={s2Y(1)}
              stroke="#a1a1aa" strokeWidth={0.8} strokeDasharray="4 3"
            />
            <text x={pad.l + innerW - 2} y={s2Y(1) - 3} fontSize={8} fill="#a1a1aa" textAnchor="end">φ̄²</text>
            {/* Data */}
            {s2Path && <path d={s2Path} fill="none" stroke="#a78bfa" strokeWidth={1.8} strokeLinejoin="round" />}
            {/* Correlation length marker */}
            {xi !== null && (
              <>
                <line x1={s2X(xi)} x2={s2X(xi)} y1={pad.t} y2={pad.t + innerH} stroke="#f472b6" strokeWidth={1} strokeDasharray="3 3" />
                <text x={s2X(xi) + 3} y={pad.t + 10} fontSize={8} fill="#f472b6">ξ≈{xi}px</text>
              </>
            )}
            {/* Y tick labels */}
            {[1, 1.5, 2].map((v) => (
              s2Y(v) >= pad.t && s2Y(v) <= pad.t + innerH ? (
                <text key={v} x={pad.l - 4} y={s2Y(v) + 3} fontSize={7} fill="#71717a" textAnchor="end">{v.toFixed(1)}</text>
              ) : null
            ))}
            {/* X tick labels */}
            {[0, Math.round(s2MaxR / 2), s2MaxR].map((r) => (
              <text key={r} x={s2X(r)} y={pad.t + innerH + 12} fontSize={7} fill="#71717a" textAnchor="middle">{r}</text>
            ))}
            <text x={pad.l + innerW / 2} y={H - 2} fontSize={8} fill="#71717a" textAnchor="middle">r (voxels)</text>
          </svg>
          {xi !== null && (
            <p className="mt-2 text-xs text-zinc-400">
              Correlation length <span className="text-violet-300 font-mono">ξ ≈ {xi} voxels</span> — distance at which
              correlations decay to halfway between peak and long-range limit.
            </p>
          )}
        </div>

        {/* S(k) chart */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold text-zinc-300 mb-3">
            Radial Structure Factor S(k) — log scale
          </p>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
            <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#52525b" strokeWidth={1} />
            <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="#52525b" strokeWidth={1} />
            {skPath && <path d={skPath} fill="none" stroke="#34d399" strokeWidth={1.8} strokeLinejoin="round" />}
            {/* Small-k region highlight */}
            {skFiltered.length > 2 && (
              <rect
                x={pad.l} y={pad.t}
                width={skX(skFiltered[2].k) - pad.l}
                height={innerH}
                fill="#34d39918"
              />
            )}
            {skFiltered.length > 0 && (
              <text x={pad.l + 3} y={pad.t + 10} fontSize={7} fill="#34d399">k→0</text>
            )}
            {/* X tick labels */}
            {skFiltered.length > 0 && [1, Math.round(skMaxK / 2), skMaxK].map((k) => (
              <text key={k} x={skX(k)} y={pad.t + innerH + 12} fontSize={7} fill="#71717a" textAnchor="middle">{k}</text>
            ))}
            <text x={pad.l + innerW / 2} y={H - 2} fontSize={8} fill="#71717a" textAnchor="middle">k (wavenumber)</text>
          </svg>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${hyperuniform ? "bg-emerald-900/60 text-emerald-300" : "bg-zinc-800 text-zinc-400"}`}>
              {hyperuniform ? "Hyperuniform" : "Non-hyperuniform"}
            </span>
            <span className="text-xs text-zinc-500">
              {skSmall !== null ? `S(k→0) ≈ ${skSmall.toExponential(2)}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Insight cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-zinc-800/50 p-3">
          <p className="text-xs text-zinc-400 mb-1">Volume fraction φ̄</p>
          <p className="text-lg font-mono font-semibold text-zinc-100">{volumeFraction.toFixed(3)}</p>
          <p className="text-xs text-zinc-500 mt-1">S₂(0) = φ̄ = {volumeFraction.toFixed(3)}</p>
        </div>
        <div className="rounded-xl bg-zinc-800/50 p-3">
          <p className="text-xs text-zinc-400 mb-1">Correlation length ξ</p>
          <p className="text-lg font-mono font-semibold text-zinc-100">
            {xi !== null ? `${xi} vx` : "—"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Characteristic microstructural length scale</p>
        </div>
        <div className="rounded-xl bg-zinc-800/50 p-3">
          <p className="text-xs text-zinc-400 mb-1">Hyperuniformity</p>
          <p className={`text-lg font-semibold ${hyperuniform ? "text-emerald-400" : "text-zinc-400"}`}>
            {hyperuniform ? "Detected" : "Not detected"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">S(k→0) suppressed vs bulk S(k)</p>
        </div>
      </div>
    </div>
  );
});

const ThresholdPhaseDiagram = memo(function ThresholdPhaseDiagram({
  sweep,
  currentThreshold,
}: {
  sweep: SweepPoint[];
  currentThreshold: number;
}) {
  // Normalization: each series divided by its own maximum so all fit [0,1].
  // This preserves peak shape and location while allowing multi-series comparison.
  const maxB0 = Math.max(...sweep.map((p) => p.beta0), 1);
  const maxB1 = Math.max(...sweep.map((p) => p.beta1), 1);
  const maxB2 = Math.max(...sweep.map((p) => p.beta2), 1);
  const chiMin = Math.min(...sweep.map((p) => p.chi));
  const chiMax = Math.max(...sweep.map((p) => p.chi));
  const chiRange = chiMax - chiMin || 1;

  const W = 540, H = 190;
  const pL = 12, pR = 12, pT = 26, pB = 28;
  const iW = W - pL - pR, iH = H - pT - pB;

  const xOf = (t: number) => pL + t * iW;
  const yOf = (v: number) => pT + iH - v * iH; // v in [0,1]
  const yOfChi = (chi: number) => yOf((chi - chiMin) / chiRange);

  function line(vals: number[]): string {
    return sweep.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOf(vals[i]).toFixed(1)}`).join(" ");
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  // Derived topological events from the sweep
  // Percolation threshold: highest t where β₀ is still 1 before it rises above 1
  let percolationT: number | null = null;
  for (let i = 0; i < sweep.length - 1; i++) {
    if (sweep[i].beta0 === 1 && sweep[i + 1].beta0 > 1) { percolationT = sweep[i].t; break; }
  }

  // Peak β₁: threshold where the most tunnels exist
  const peakB1Point = sweep.reduce((best, p) => (p.beta1 > best.beta1 ? p : best), sweep[0]);

  // β₂ onset: highest t at which enclosed pores first appear (sweep from high to low)
  const beta2OnsetPoint = [...sweep].reverse().find((p) => p.beta2 > 0) ?? null;

  // Current regime
  const isFragmented = percolationT !== null && currentThreshold > percolationT;
  const regime = isFragmented ? "Fragmented" : "Bicontinuous";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-1 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Topological Phase Diagram</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Betti numbers and Euler characteristic computed across all thresholds. Each curve is
            normalized to its own maximum. The dashed line marks the applied threshold.
          </p>
        </div>
        <span className={`mt-1 shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
          isFragmented ? "border-yellow-300/30 bg-yellow-300/10 text-yellow-200" : "border-teal-300/30 bg-teal-300/10 text-teal-200"
        }`}>
          {regime}
        </span>
      </div>

      {/* Legend */}
      <div className="mb-3 mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-400">
        {[
          { color: "#35f0d0", label: `β₀ solid components (max ${maxB0})` },
          { color: "#60a5fa", label: `β₁ tunnels (max ${maxB1})` },
          { color: "#a78bfa", label: `β₂ enclosed voids (max ${maxB2})` },
          { color: "#fbbf24", dash: true, label: `χ Euler (range ${chiMin}→${chiMax})` },
        ].map(({ color, label, dash }) => (
          <span key={label} className="flex items-center gap-1.5">
            <svg width="22" height="8">
              <line x1="0" y1="4" x2="22" y2="4" stroke={color} strokeWidth="2"
                strokeDasharray={dash ? "4 2" : undefined} />
            </svg>
            {label}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-[#071014]">
        {/* Grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pL} y1={yOf(f)} x2={W - pR} y2={yOf(f)}
            stroke="#1f2937" strokeWidth="0.7" />
        ))}
        {ticks.map((t) => (
          <line key={t} x1={xOf(t)} y1={pT} x2={xOf(t)} y2={pT + iH}
            stroke="#1f2937" strokeWidth="0.7" />
        ))}

        {/* Axes */}
        <line x1={pL} y1={pT + iH} x2={W - pR} y2={pT + iH} stroke="#374151" strokeWidth="0.8" />

        {/* Curves */}
        <path d={line(sweep.map((p) => p.beta0 / maxB0))} fill="none" stroke="#35f0d0" strokeWidth="1.6" strokeLinejoin="round" />
        <path d={line(sweep.map((p) => p.beta1 / maxB1))} fill="none" stroke="#60a5fa" strokeWidth="1.6" strokeLinejoin="round" />
        <path d={line(sweep.map((p) => p.beta2 / maxB2))} fill="none" stroke="#a78bfa" strokeWidth="1.6" strokeLinejoin="round" />
        <path
          d={sweep.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOfChi(p.chi).toFixed(1)}`).join(" ")}
          fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="5 2" strokeLinejoin="round"
        />

        {/* Current threshold line */}
        <line x1={xOf(currentThreshold)} y1={pT - 4} x2={xOf(currentThreshold)} y2={pT + iH}
          stroke="white" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.55" />
        <text x={xOf(currentThreshold)} y={pT - 6} fontSize="7.5" fill="white" textAnchor="middle" opacity="0.7">
          t={currentThreshold.toFixed(2)}
        </text>

        {/* X-axis ticks */}
        {ticks.map((t) => (
          <text key={t} x={xOf(t)} y={pT + iH + 12} fontSize="8" fill="#6b7280" textAnchor="middle">
            {t.toFixed(2)}
          </text>
        ))}
        <text x={W / 2} y={H - 2} fontSize="8" fill="#4b5563" textAnchor="middle">threshold →</text>
      </svg>

      {/* Key transition cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">Percolation</p>
          <p className="mt-1 text-xl font-bold text-white">
            {percolationT !== null ? `t = ${percolationT.toFixed(2)}` : "not found"}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Solid loses full connectivity above this threshold. Below it: bicontinuous. Above: fragmented islands.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Peak β₁</p>
          <p className="mt-1 text-xl font-bold text-white">t = {peakB1Point.t.toFixed(2)}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Maximum tunnel density ({peakB1Point.beta1} loops). Best threshold for transport-optimized
            metamaterials — highest permeability proxy.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">β₂ Onset</p>
          <p className="mt-1 text-xl font-bold text-white">
            {beta2OnsetPoint ? `t = ${beta2OnsetPoint.t.toFixed(2)}` : "none"}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            {beta2OnsetPoint
              ? "Enclosed pore regions first appear. Below this threshold the solid traps void — relevant for closed-cell foams."
              : "No enclosed voids detected across the full threshold range for this structure."}
          </p>
        </div>
      </div>
    </div>
  );
});

const DescriptorCard = memo(function DescriptorCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-2xl font-bold text-teal-300">{value}</p>
      <p className="mt-1 font-medium text-white">{label}</p>
      <p className="mt-1 text-sm text-zinc-500">{sub}</p>
    </div>
  );
});

const InterpretationPanel = memo(function InterpretationPanel({
  summary,
  objective,
}: {
  summary: DescriptorSummary;
  objective: Objective;
}) {
  const pathCount = Number(summary.throughX) + Number(summary.throughY) + Number(summary.throughZ);
  const primary = explainCandidate(summary, objective);
  const suggestion = pathCount === 0
    ? "Increase volume fraction or lower the threshold to form continuous pathways."
    : summary.fragmentation > 0.45
      ? "Reduce noise or increase correlation scale to lower fragmentation."
      : summary.surfaceDensity > 0.28
        ? "Reduce interface complexity for easier fabrication and cleaner simulation meshes."
        : "Candidate is ready for downstream FEM/CFD-style simulation screening.";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-3 flex items-center gap-3">
        <BrainCircuit className="text-teal-300" />
        <h2 className="text-xl font-semibold">Descriptor Interpretation</h2>
      </div>
      <p className="leading-7 text-zinc-400">
        This candidate has Euler characteristic χ = {summary.eulerCharacteristic} (β₀ = {summary.components} solid
        components, β₁ = {summary.beta1} tunnel{summary.beta1 === 1 ? "" : "s"}, β₂ = {summary.enclosedVoids} enclosed
        void{summary.enclosedVoids === 1 ? "" : "s"}). It occupies {Math.round(summary.volumeFraction * 100)}% solid
        volume with {pathCount} through-connected axis{pathCount === 1 ? "" : "es"}. For the {objective} objective,
        it is best described as {primary}.
      </p>
      <p className="mt-4 rounded-2xl border border-teal-300/15 bg-teal-300/8 p-4 text-sm leading-6 text-teal-100">
        Suggested next design move: {suggestion}
      </p>
    </div>
  );
});

function parseUploadedVolume(payload: unknown): Volume | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as { dims?: unknown; values?: unknown };

  if (
    !Array.isArray(candidate.dims) ||
    candidate.dims.length !== 3 ||
    !candidate.dims.every((value) => Number.isInteger(value) && value > 0) ||
    !Array.isArray(candidate.values)
  ) {
    return null;
  }

  const dims = candidate.dims as [number, number, number];
  const expected = dims[0] * dims[1] * dims[2];
  if (candidate.values.length !== expected) return null;

  return {
    dims,
    values: Float32Array.from(candidate.values.map((value) => Number(value) || 0)),
  };
}

// Uncontrolled slider: thumb moves at native speed (zero React renders during drag).
// Display number updates via DOM ref on input. onChange fires only on pointerUp.
function Control({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLSpanElement>(null);

  // Sync input position when value is changed externally (e.g. after Apply)
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = String(value);
    if (displayRef.current) displayRef.current.textContent = value.toFixed(2);
  }, [value]);

  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-sm font-medium text-zinc-300">
        {label}
        <span ref={displayRef} className="font-mono text-xs text-zinc-500">{value.toFixed(2)}</span>
      </span>
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        onInput={() => {
          if (displayRef.current && inputRef.current)
            displayRef.current.textContent = Number(inputRef.current.value).toFixed(2);
        }}
        onPointerUp={() => {
          if (inputRef.current) onChange(Number(inputRef.current.value));
        }}
        className="w-full accent-teal-300"
      />
    </label>
  );
}

export default function MicrostructureTopologyProjectPage() {
  // Pending: what the sliders show — cheap to update, no computation triggered.
  const [pending, setPending] = useState({
    correlation: 6.2, threshold: 0.48, anisotropy: 0.18, noise: 0.10,
  });

  // Applied: what drives all heavy useMemo computations — only changes on button click.
  const [applied, setApplied] = useState({
    seed: 42, correlation: 6.2, threshold: 0.48, anisotropy: 0.18, noise: 0.10,
  });

  const [isComputing, startTransition] = useTransition();

  const isDirty =
    pending.correlation !== applied.correlation ||
    pending.threshold !== applied.threshold ||
    pending.anisotropy !== applied.anisotropy ||
    pending.noise !== applied.noise;

  const [screenSeed, setScreenSeed] = useState(500);
  const [objective, setObjective] = useState<Objective>("transport");
  const [uploadedVolume, setUploadedVolume] = useState<Volume | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const { seed, correlation, threshold, anisotropy, noise } = applied;

  const generatedVolume = useMemo(
    () => generateVolume(seed, correlation, anisotropy, noise),
    [anisotropy, correlation, noise, seed],
  );
  const volume = uploadedVolume ?? generatedVolume;
  const mask = useMemo(() => thresholdVolume(volume, threshold), [threshold, volume]);
  const summary = useMemo(() => analyzeVolume(volume, threshold), [threshold, volume]);
  const persistencePairs = useMemo(() => computePersistencePairs(volume), [volume]);
  const thresholdSweep = useMemo(() => computeThresholdSweep(volume), [volume]);
  const s2Data = useMemo(() => computeTwoPointCorrelation(volume, threshold), [volume, threshold]);
  const skData = useMemo(() => computeStructureFactor(volume, threshold), [volume, threshold]);
  const candidates = useMemo(
    () => screenCandidates({ baseSeed: screenSeed, correlation, anisotropy, noise, threshold, objective }),
    [anisotropy, correlation, noise, objective, screenSeed, threshold],
  );
  const topCandidates = candidates.slice(0, 5);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = parseUploadedVolume(JSON.parse(await file.text()));
      if (!parsed) {
        setUploadMessage("Upload a volumetric field with dims [x,y,z] and a flat values array.");
        return;
      }

      setUploadedVolume(parsed);
      setUploadMessage(`Loaded ${parsed.dims.join(" x ")} volumetric microstructure field.`);
    } catch {
      setUploadMessage("Could not read this volumetric field.");
    }
  }

  const descriptors = [
    ["Solid Volume", `${Math.round(summary.volumeFraction * 100)}%`, "phase occupancy"],
    ["β₀ Components", String(summary.components), "solid connected regions"],
    ["β₁ Tunnels", String(summary.beta1), "loops through solid phase"],
    ["β₂ Voids", String(summary.enclosedVoids), "enclosed pore regions"],
    ["Euler χ", String(summary.eulerCharacteristic), "β₀ − β₁ + β₂"],
    ["Surface Density", summary.surfaceDensity.toFixed(3), "interface density estimate"],
  ];

  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-32">
        <Link href="/#projects" className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-teal-300">
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-teal-300">
          3D Materials AI / Topological Data Analysis
        </p>
        <h1 className="max-w-5xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          3D Topology-Aware Microstructure Screening Platform
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-400">
          Generate, upload, visualize, and rank 3D two-phase microstructures with morphology and
          topological descriptors before expensive FEM, CFD, or fabrication simulations.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {["Voxel Microstructure Analysis", "Volumetric Field Upload", "Connectivity Analysis", "Descriptor Interpretation", "Candidate Ranking"].map((item) => (
            <span key={item} className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-sm text-teal-100">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[1fr_1.25fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex items-center gap-3">
            <Layers3 className="text-teal-300" />
            <h2 className="text-2xl font-semibold">3D Microstructure Viewer</h2>
          </div>

          <div className="relative">
            <RotatableVoxelView mask={mask} dims={volume.dims} />
            {isComputing && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 rounded-full border border-teal-300/30 bg-black/60 px-5 py-2.5">
                  <RefreshCw size={15} className="animate-spin text-teal-300" />
                  <span className="text-sm font-medium text-teal-200">Computing…</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4">
            <Control label="Threshold" value={pending.threshold} min={0.25} max={0.75} step={0.01}
              onChange={(v) => setPending((p) => ({ ...p, threshold: v }))} />
            {!uploadedVolume && (
              <>
                <Control label="Correlation Scale" value={pending.correlation} min={2} max={9} step={0.1}
                  onChange={(v) => setPending((p) => ({ ...p, correlation: v }))} />
                <Control label="Anisotropy" value={pending.anisotropy} min={0} max={1} step={0.01}
                  onChange={(v) => setPending((p) => ({ ...p, anisotropy: v }))} />
                <Control label="Noise" value={pending.noise} min={0} max={0.7} step={0.01}
                  onChange={(v) => setPending((p) => ({ ...p, noise: v }))} />
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setUploadedVolume(null);
                setUploadMessage("");
                startTransition(() => {
                  setApplied((a) => ({ ...pending, seed: a.seed + 1 }));
                });
              }}
              disabled={isComputing}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                isDirty
                  ? "bg-teal-300 text-[#04100f] hover:bg-teal-200"
                  : "border border-white/15 text-zinc-300 hover:border-teal-300/50 hover:text-teal-100"
              }`}
            >
              <RefreshCw size={15} className={isComputing ? "animate-spin" : ""} />
              {isComputing ? "Computing…" : isDirty ? "Apply & generate new volume" : "Generate new 3D volume"}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-teal-300/60 hover:text-teal-200">
              <FileUp size={15} />
              Upload volumetric field
              <input type="file" accept="application/json,.json" className="hidden" onChange={handleUpload} />
            </label>
          </div>

          {uploadMessage && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">
              {uploadMessage}
            </p>
          )}
        </div>

        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {descriptors.map(([label, value, sub]) => (
              <DescriptorCard key={label} label={label} value={value} sub={sub} />
            ))}
          </div>

          <InterpretationPanel summary={summary} objective={objective} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <ThresholdPhaseDiagram sweep={thresholdSweep} currentThreshold={threshold} />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <CorrelationAnalysis s2={s2Data} sk={skData} volumeFraction={summary.volumeFraction} />
      </section>

      <DesignToManufacturingWorkflow
        mask={mask}
        dims={volume.dims}
        summary={summary}
        objective={objective}
        pairs={persistencePairs}
      />

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Target className="text-teal-300" />
                <h2 className="text-2xl font-semibold">Screen Candidate Microstructures</h2>
              </div>
              <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
                Rank generated 3D candidates with descriptor-based pre-screening objectives. The
                highest-scoring structures are selected for downstream simulation pipelines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startTransition(() => setScreenSeed((value) => value + 503))}
              disabled={isComputing}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200 disabled:opacity-60"
            >
              <RefreshCw size={15} className={isComputing ? "animate-spin" : ""} />
              {isComputing ? "Computing…" : "Screen 24 candidates"}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(["transport", "stability", "balanced"] as Objective[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setObjective(item)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize transition ${
                  objective === item
                    ? "border-teal-300 bg-teal-300 text-[#04100f]"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-teal-300/50 hover:text-teal-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            {topCandidates.map((candidate, index) => {
              const candidateVolume = generateVolume(candidate.seed, correlation, anisotropy, noise);
              const candidateMask = thresholdVolume(candidateVolume, threshold);

              return (
                <button
                  key={candidate.seed}
                  type="button"
                  onClick={() => {
                    setUploadedVolume(null);
                    setApplied((a) => ({ ...a, seed: candidate.seed }));
                  }}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-teal-300/50"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                      {index === 0 && <Trophy size={14} className="text-teal-300" />}
                      Rank {index + 1}
                    </span>
                    <span className="font-mono text-sm text-teal-200">{Math.round(candidate.score)}</span>
                  </div>
                  <MicrostructureSlice
                    mask={candidateMask}
                    dims={candidateVolume.dims}
                    axis="XY"
                    slice={Math.floor(volumeSize / 2)}
                    compact
                  />
                  <p className="mt-3 text-xs leading-5 text-zinc-400">{candidate.reason}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                    <span>VF {Math.round(candidate.volumeFraction * 100)}%</span>
                    <span>Comp {candidate.components}</span>
                    <span>Surf {candidate.surfaceDensity.toFixed(2)}</span>
                    <span>Topo {Math.round(candidate.topologyScore * 100)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <div className="flex gap-4">
            <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Network size={20} className="text-teal-300" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold">Method Summary</h2>
              <p className="mt-4 leading-8 text-zinc-400">
                The workflow combines 3D volume handling, microstructure descriptor extraction,
                topology-aware screening, spatial correlation analysis, and candidate interpretation
                before expensive simulation or additive manufacturing steps.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  "3D microstructure generation and volumetric field upload",
                  "Connectivity, surface, fragmentation, and transport descriptors",
                  "Ranked screening workflow for structure-property exploration",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
