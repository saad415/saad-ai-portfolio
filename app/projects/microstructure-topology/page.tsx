"use client";

import { ChangeEvent, PointerEvent, useMemo, useRef, useState } from "react";
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
  surfaceDensity: number;
  throughX: boolean;
  throughY: boolean;
  throughZ: boolean;
  fragmentation: number;
  topologyScore: number;
};

type Candidate = DescriptorSummary & {
  seed: number;
  score: number;
  reason: string;
};

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

  return {
    volumeFraction,
    components,
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

function MicrostructureSlice({
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
}

function MiniVoxelSolid({
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
}

function FeasibilityInset({ summary }: { summary: DescriptorSummary }) {
  const points = [
    { x: 42, y: 126, color: "#60a5fa" },
    { x: 72, y: 104, color: "#60a5fa" },
    { x: 112, y: 82, color: "#ef4444" },
    { x: 144, y: 52, color: "#ef4444" },
    { x: 156, y: 38, color: "#ef4444" },
  ];

  return (
    <svg viewBox="0 0 190 150" className="h-40 w-full rounded-2xl border border-white/10 bg-white">
      <rect x="26" y="18" width="132" height="104" fill="#eef2f7" />
      <path d="M26 122 L158 18 L158 122 Z" fill="#cbd5e1" opacity="0.75" />
      <line x1="26" y1="122" x2="158" y2="122" stroke="#334155" />
      <line x1="26" y1="122" x2="26" y2="18" stroke="#334155" />
      <line x1="26" y1="122" x2="158" y2="18" stroke="#64748b" strokeDasharray="4 3" />
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="5" fill={point.color} />
      ))}
      <text x="65" y="140" fontSize="10" fill="#334155">birth</text>
      <text x="5" y="86" fontSize="10" fill="#334155" transform="rotate(-90 5 86)">death</text>
      <text x="76" y="22" fontSize="9" fill="#334155">persistence</text>
      <text x="100" y="46" fontSize="8" fill="#ef4444">{Math.round(summary.topologyScore * 100)}%</text>
    </svg>
  );
}

function DesignToManufacturingWorkflow({
  mask,
  dims,
  summary,
  objective,
}: {
  mask: boolean[];
  dims: [number, number, number];
  summary: DescriptorSummary;
  objective: Objective;
}) {
  const feasible = summary.topologyScore > 0.62 && summary.fragmentation < 0.55;

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Design To Additive Manufacturing Screening</h2>
            <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
              A portfolio-scale version of the workflow described in the Dresden D2 project:
              morphology descriptors and topology checks act as an early feasibility gate before
              expensive simulation or fabrication.
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
            <FeasibilityInset summary={summary} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-400">
              <span>Objective: {objective}</span>
              <span>Topo {Math.round(summary.topologyScore * 100)}%</span>
              <span>Fragment {summary.fragmentation.toFixed(2)}</span>
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
}

function RotatableVoxelView({
  mask,
  dims,
}: {
  mask: boolean[];
  dims: [number, number, number];
}) {
  const [yaw, setYaw] = useState(-0.65);
  const [pitch, setPitch] = useState(0.55);
  const dragRef = useRef({ active: false, x: 0, y: 0, yaw: 0, pitch: 0 });

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

    const stride = Math.max(1, Math.ceil(exposed.length / 1500));
    return exposed.filter((_, index) => index % stride === 0);
  }, [dims, mask]);

  const projected = useMemo(() => {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const scale = 5.4;

    return points
      .map(([x, y, z]) => {
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;
        const ry = y * cosP - rz * sinP;
        const depth = y * sinP + rz * cosP;

        return {
          x: 170 + rx * scale,
          y: 170 + ry * scale,
          depth,
          shade: Math.max(0.35, Math.min(1, 0.6 + depth / 40)),
        };
      })
      .sort((a, b) => a.depth - b.depth);
  }, [pitch, points, yaw]);

  function startDrag(event: PointerEvent<SVGSVGElement>) {
    dragRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      yaw,
      pitch,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<SVGSVGElement>) {
    if (!dragRef.current.active) return;

    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setYaw(dragRef.current.yaw + dx * 0.01);
    setPitch(Math.max(-1.1, Math.min(1.1, dragRef.current.pitch + dy * 0.01)));
  }

  function stopDrag() {
    dragRef.current.active = false;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Rotatable voxel preview</p>
          <p className="text-xs text-zinc-500">Drag the volume to rotate the exposed solid phase.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setYaw(-0.65);
            setPitch(0.55);
          }}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-teal-300/50 hover:text-teal-100"
        >
          Reset
        </button>
      </div>
      <svg
        viewBox="0 0 340 340"
        className="aspect-square w-full cursor-grab rounded-xl bg-[#071014] active:cursor-grabbing"
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
      >
        <circle cx="170" cy="170" r="138" fill="#35f0d00c" stroke="#35f0d020" />
        {projected.map((point, index) => (
          <rect
            key={index}
            x={point.x}
            y={point.y}
            width="4.8"
            height="4.8"
            rx="0.7"
            fill={`rgba(53, 240, 208, ${point.shade})`}
            stroke="rgba(7, 16, 20, 0.35)"
            strokeWidth="0.35"
          />
        ))}
      </svg>
    </div>
  );
}

function DescriptorCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-2xl font-bold text-teal-300">{value}</p>
      <p className="mt-1 font-medium text-white">{label}</p>
      <p className="mt-1 text-sm text-zinc-500">{sub}</p>
    </div>
  );
}

function InterpretationPanel({
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
        This 3D candidate shows {Math.round(summary.volumeFraction * 100)}% solid volume,
        {` ${summary.components}`} connected solid component{summary.components === 1 ? "" : "s"},
        and {pathCount} through-connected axis{pathCount === 1 ? "" : "es"}. For the current
        {` ${objective}`} objective, it is best described as {primary}.
      </p>
      <p className="mt-4 rounded-2xl border border-teal-300/15 bg-teal-300/8 p-4 text-sm leading-6 text-teal-100">
        Suggested next design move: {suggestion}
      </p>
    </div>
  );
}

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
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-sm font-medium text-zinc-300">
        {label}
        <span className="font-mono text-xs text-zinc-500">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-teal-300"
      />
    </label>
  );
}

export default function MicrostructureTopologyProjectPage() {
  const [seed, setSeed] = useState(12);
  const [screenSeed, setScreenSeed] = useState(500);
  const [correlation, setCorrelation] = useState(4.8);
  const [threshold, setThreshold] = useState(0.52);
  const [anisotropy, setAnisotropy] = useState(0.35);
  const [noise, setNoise] = useState(0.22);
  const [axis, setAxis] = useState<Axis>("XY");
  const [slice, setSlice] = useState(17);
  const [objective, setObjective] = useState<Objective>("transport");
  const [uploadedVolume, setUploadedVolume] = useState<Volume | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const generatedVolume = useMemo(
    () => generateVolume(seed, correlation, anisotropy, noise),
    [anisotropy, correlation, noise, seed],
  );
  const volume = uploadedVolume ?? generatedVolume;
  const mask = useMemo(() => thresholdVolume(volume, threshold), [threshold, volume]);
  const summary = useMemo(() => analyzeVolume(volume, threshold), [threshold, volume]);
  const candidates = useMemo(
    () => screenCandidates({ baseSeed: screenSeed, correlation, anisotropy, noise, threshold, objective }),
    [anisotropy, correlation, noise, objective, screenSeed, threshold],
  );
  const topCandidates = candidates.slice(0, 5);
  const maxSlice = axis === "XY" ? volume.dims[2] - 1 : axis === "XZ" ? volume.dims[1] - 1 : volume.dims[0] - 1;
  const safeSlice = Math.min(slice, maxSlice);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = parseUploadedVolume(JSON.parse(await file.text()));
      if (!parsed) {
        setUploadMessage("Upload a JSON volume with dims [x,y,z] and flat values array.");
        return;
      }

      setUploadedVolume(parsed);
      setSlice(Math.floor(parsed.dims[2] / 2));
      setAxis("XY");
      setUploadMessage(`Loaded ${parsed.dims.join(" x ")} JSON microstructure volume.`);
    } catch {
      setUploadMessage("Could not read this JSON volume.");
    }
  }

  const descriptors = [
    ["Solid Volume", `${Math.round(summary.volumeFraction * 100)}%`, "phase occupancy"],
    ["Components", String(summary.components), "3D connected regions"],
    ["Surface Density", summary.surfaceDensity.toFixed(3), "phase boundary proxy"],
    ["Through X/Y/Z", `${Number(summary.throughX)}/${Number(summary.throughY)}/${Number(summary.throughZ)}`, "axis connectivity"],
    ["Fragmentation", summary.fragmentation.toFixed(2), "component penalty"],
    ["Topology Score", `${Math.round(summary.topologyScore * 100)}%`, "connectivity proxy"],
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
          topology-inspired descriptors before expensive FEM, CFD, or fabrication simulations.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {["3D Volume Viewer", "JSON Upload", "Connectivity Analysis", "Descriptor Interpretation", "Candidate Ranking"].map((item) => (
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

          <RotatableVoxelView mask={mask} dims={volume.dims} />

          <div className="mb-3 mt-6">
            <p className="text-sm font-semibold text-white">Slice inspection</p>
            <p className="text-xs text-zinc-500">Switch planes and move through the 3D volume.</p>
          </div>
          <MicrostructureSlice mask={mask} dims={volume.dims} axis={axis} slice={safeSlice} />

          <div className="mt-5 flex flex-wrap gap-2">
            {(["XY", "XZ", "YZ"] as Axis[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setAxis(item);
                  setSlice(Math.floor((item === "XY" ? volume.dims[2] : item === "XZ" ? volume.dims[1] : volume.dims[0]) / 2));
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  axis === item
                    ? "border-teal-300 bg-teal-300 text-[#04100f]"
                    : "border-white/10 text-zinc-300 hover:border-teal-300/50 hover:text-teal-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <Control label={`${axis} Slice`} value={safeSlice} min={0} max={maxSlice} step={1} onChange={setSlice} />

          <div className="mt-6 grid gap-4">
            <Control label="Threshold" value={threshold} min={0.25} max={0.75} step={0.01} onChange={setThreshold} />
            {!uploadedVolume && (
              <>
                <Control label="Correlation Scale" value={correlation} min={2} max={9} step={0.1} onChange={setCorrelation} />
                <Control label="Anisotropy" value={anisotropy} min={0} max={1} step={0.01} onChange={setAnisotropy} />
                <Control label="Noise" value={noise} min={0} max={0.7} step={0.01} onChange={setNoise} />
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setUploadedVolume(null);
                setSeed((value) => value + 1);
                setUploadMessage("");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
            >
              <RefreshCw size={15} /> Generate new 3D volume
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-teal-300/60 hover:text-teal-200">
              <FileUp size={15} />
              Upload JSON volume
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

      <DesignToManufacturingWorkflow
        mask={mask}
        dims={volume.dims}
        summary={summary}
        objective={objective}
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
                Rank generated 3D candidates with simulation-free proxy objectives. The best
                structures can be inspected in the viewer and exported later into simulation pipelines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScreenSeed((value) => value + 503)}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
            >
              <RefreshCw size={15} /> Screen 24 candidates
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
                    setSeed(candidate.seed);
                    setSlice(Math.floor(volumeSize / 2));
                    setAxis("XY");
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
              <h2 className="text-2xl font-semibold">Research Contribution</h2>
              <p className="mt-4 leading-8 text-zinc-400">
                This project reframes my volumetric medical imaging background for the Dresden D2
                morphology and topology topic. It demonstrates 3D volume handling, microstructure
                descriptor extraction, topology-aware screening, and interpretation of candidate
                designs before expensive simulation or additive manufacturing steps.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  "3D microstructure generation and JSON volume upload",
                  "Connectivity, surface, fragmentation, and transport proxies",
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
