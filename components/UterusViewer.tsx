"use client";

import { useEffect, useRef, useState } from "react";
import * as nifti from "nifti-reader-js";

export type LpsLandmark = {
  label: string;
  lps: [number, number, number];
};

type VoxelLandmark = {
  label: string;
  voxel: [number, number, number];
};

type Props = {
  file: File | null;
  lpsLandmarks?: LpsLandmark[];
};

type VolumeInfo = {
  data: Float32Array;
  dims: [number, number, number];
};

const LANDMARK_COLORS: Record<string, string> = {
  "APD-1":         "#4ade80",
  "APD-2":         "#4ade80",
  "Fundus_Outer":  "#60a5fa",
  "Cavity_Cervix": "#f472b6",
  "Inner_OS":      "#facc15",
  "Cavity_Fundus": "#c084fc",
};

const LANDMARK_DESCRIPTIONS: Record<string, string> = {
  "APD-1":         "Anterior APD point",
  "APD-2":         "Posterior APD point",
  "Fundus_Outer":  "Outer fundus",
  "Cavity_Cervix": "Cavity cervix",
  "Inner_OS":      "Internal os",
  "Cavity_Fundus": "Cavity fundus",
};

// ── Affine utilities ─────────────────────────────────────────────────────────

function invert3x3(r: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, k]] = r;
  const det = a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
  const s = 1 / det;
  return [
    [(e * k - f * h) * s, (c * h - b * k) * s, (b * f - c * e) * s],
    [(f * g - d * k) * s, (a * k - c * g) * s, (c * d - a * f) * s],
    [(d * h - e * g) * s, (b * g - a * h) * s, (a * e - b * d) * s],
  ];
}

function lpsToVoxel(lps: [number, number, number], header: nifti.NIFTI1 | nifti.NIFTI2): [number, number, number] {
  // LPS → RAS
  const ras = [-lps[0], -lps[1], lps[2]];

  // Build R (3×3) and t (3×1) from sform rows
  const sx = Array.from(header.srow_x as unknown as number[]);
  const sy = Array.from(header.srow_y as unknown as number[]);
  const sz = Array.from(header.srow_z as unknown as number[]);

  const R = [
    [sx[0], sx[1], sx[2]],
    [sy[0], sy[1], sy[2]],
    [sz[0], sz[1], sz[2]],
  ];
  const t = [sx[3], sy[3], sz[3]];

  const Ri = invert3x3(R);
  const diff = [ras[0] - t[0], ras[1] - t[1], ras[2] - t[2]];

  return [
    Math.round(Ri[0][0] * diff[0] + Ri[0][1] * diff[1] + Ri[0][2] * diff[2]),
    Math.round(Ri[1][0] * diff[0] + Ri[1][1] * diff[1] + Ri[1][2] * diff[2]),
    Math.round(Ri[2][0] * diff[0] + Ri[2][1] * diff[1] + Ri[2][2] * diff[2]),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function UterusViewer({ file, lpsLandmarks = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [volumeInfo, setVolumeInfo] = useState<VolumeInfo | null>(null);
  const [voxelLandmarks, setVoxelLandmarks] = useState<VoxelLandmark[]>([]);
  const [sliceIndex, setSliceIndex] = useState(0);

  useEffect(() => {
    if (!file) return;
    setVolumeInfo(null);
    setVoxelLandmarks([]);

    const load = async () => {
      let buffer = await file.arrayBuffer();
      if (nifti.isCompressed(buffer)) buffer = nifti.decompress(buffer) as ArrayBuffer;
      if (!nifti.isNIFTI(buffer)) return;

      const header = nifti.readHeader(buffer);
      const imageBuffer = nifti.readImage(header, buffer) as ArrayBuffer;
      const dims: [number, number, number] = [header.dims[1], header.dims[2], header.dims[3]];

      let raw: Uint8Array | Int16Array | Int32Array | Float32Array | Float64Array;
      switch (header.datatypeCode) {
        case nifti.NIFTI1.TYPE_UINT8:   raw = new Uint8Array(imageBuffer);   break;
        case nifti.NIFTI1.TYPE_INT16:   raw = new Int16Array(imageBuffer);   break;
        case nifti.NIFTI1.TYPE_INT32:   raw = new Int32Array(imageBuffer);   break;
        case nifti.NIFTI1.TYPE_FLOAT32: raw = new Float32Array(imageBuffer); break;
        case nifti.NIFTI1.TYPE_FLOAT64: raw = new Float64Array(imageBuffer); break;
        default: return;
      }

      setVolumeInfo({ data: Float32Array.from(raw), dims });
      setSliceIndex(Math.floor(dims[2] / 2));

      // Convert LPS world coords → voxel coords using this volume's affine
      if (lpsLandmarks.length > 0 && header.sform_code > 0) {
        setVoxelLandmarks(
          lpsLandmarks.map(({ label, lps }) => ({
            label,
            voxel: lpsToVoxel(lps, header),
          }))
        );
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, lpsLandmarks]);

  useEffect(() => {
    if (!volumeInfo || !canvasRef.current) return;

    const { data, dims } = volumeInfo;
    const [xDim, yDim, zDim] = dims;
    const safeSlice = Math.min(sliceIndex, zDim - 1);

    const canvas = canvasRef.current;
    canvas.width = xDim;
    canvas.height = yDim;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(xDim, yDim);
    const values: number[] = [];

    for (let row = 0; row < yDim; row++) {
      for (let col = 0; col < xDim; col++) {
        values.push(data[col + (yDim - 1 - row) * xDim + safeSlice * xDim * yDim]);
      }
    }

    const sorted = [...values].sort((a, b) => a - b);
    const low = sorted[Math.floor(sorted.length * 0.01)];
    const high = sorted[Math.floor(sorted.length * 0.99)];
    const range = high - low || 1;

    values.forEach((v, i) => {
      const g = Math.floor(((Math.min(Math.max(v, low), high) - low) / range) * 255);
      imageData.data[i * 4]     = g;
      imageData.data[i * 4 + 1] = g;
      imageData.data[i * 4 + 2] = g;
      imageData.data[i * 4 + 3] = 255;
    });

    ctx.putImageData(imageData, 0, 0);

    voxelLandmarks.forEach(({ label, voxel }) => {
      const [x, y, z] = voxel;
      if (Math.abs(z - safeSlice) > 2) return;

      const color = LANDMARK_COLORS[label] ?? "#ffffff";
      ctx.beginPath();
      ctx.arc(x, yDim - y, 7, 0, Math.PI * 2);
      ctx.fillStyle = color + "cc";
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "bold 12px sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000";
      ctx.strokeText(label, x + 10, yDim - y - 8);
      ctx.fillStyle = color;
      ctx.fillText(label, x + 10, yDim - y - 8);
    });
  }, [volumeInfo, sliceIndex, voxelLandmarks]);

  if (!file) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-center text-sm text-gray-500">
        Select an example to load the MRI viewer.
      </div>
    );
  }

  if (!volumeInfo) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-center text-sm text-gray-500">
        Loading volume...
      </div>
    );
  }

  const maxSlice = volumeInfo.dims[2] - 1;

  return (
    <div className="space-y-4">
      <div className="flex justify-center overflow-hidden rounded-xl bg-black">
        <canvas
          ref={canvasRef}
          className="max-h-[480px] w-auto rounded-xl object-contain"
        />
      </div>

      <div>
        <div className="mb-2 flex justify-between text-xs text-gray-400">
          <span>Sagittal slice</span>
          <span>Z = {sliceIndex} / {maxSlice}</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxSlice}
          value={sliceIndex}
          onChange={(e) => setSliceIndex(Number(e.target.value))}
          className="w-full accent-pink-400"
        />
      </div>

      {voxelLandmarks.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          {voxelLandmarks.map((lm) => (
            <div
              key={lm.label}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            >
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: LANDMARK_COLORS[lm.label] ?? "#fff" }}
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{lm.label}</p>
                <p className="truncate text-[10px] text-gray-500">
                  {LANDMARK_DESCRIPTIONS[lm.label] ?? ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
