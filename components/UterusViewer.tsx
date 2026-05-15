"use client";

import { useEffect, useRef, useState } from "react";
import * as nifti from "nifti-reader-js";

export type UterusLandmark = {
  label: string;
  voxel: [number, number, number];
  group: string;
  confidence: number | null;
};

type Props = {
  file: File | null;
  landmarks?: UterusLandmark[];
};

type VolumeInfo = {
  data: Float32Array;
  dims: [number, number, number];
};

const LANDMARK_COLORS: Record<string, string> = {
  "APD-1": "#4ade80",
  "APD-2": "#4ade80",
  "Fundus_Outer": "#60a5fa",
  "Cavity_Cervix": "#f472b6",
  "Inner_OS": "#facc15",
  "Cavity_Fundus": "#c084fc",
};

const LANDMARK_DESCRIPTIONS: Record<string, string> = {
  "APD-1": "Anterior APD point",
  "APD-2": "Posterior APD point",
  "Fundus_Outer": "Outer fundus",
  "Cavity_Cervix": "Cavity cervix",
  "Inner_OS": "Internal os",
  "Cavity_Fundus": "Cavity fundus",
};

export default function UterusViewer({ file, landmarks = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [volumeInfo, setVolumeInfo] = useState<VolumeInfo | null>(null);
  const [sliceIndex, setSliceIndex] = useState(0);

  useEffect(() => {
    if (!file) return;
    setVolumeInfo(null);

    const load = async () => {
      let buffer = await file.arrayBuffer();
      if (nifti.isCompressed(buffer)) buffer = nifti.decompress(buffer) as ArrayBuffer;
      if (!nifti.isNIFTI(buffer)) return;

      const header = nifti.readHeader(buffer);
      const imageBuffer = nifti.readImage(header, buffer) as ArrayBuffer;
      const dims: [number, number, number] = [header.dims[1], header.dims[2], header.dims[3]];

      let raw: Uint8Array | Int16Array | Int32Array | Float32Array | Float64Array;
      switch (header.datatypeCode) {
        case nifti.NIFTI1.TYPE_UINT8:    raw = new Uint8Array(imageBuffer);    break;
        case nifti.NIFTI1.TYPE_INT16:    raw = new Int16Array(imageBuffer);    break;
        case nifti.NIFTI1.TYPE_INT32:    raw = new Int32Array(imageBuffer);    break;
        case nifti.NIFTI1.TYPE_FLOAT32:  raw = new Float32Array(imageBuffer);  break;
        case nifti.NIFTI1.TYPE_FLOAT64:  raw = new Float64Array(imageBuffer);  break;
        default: return;
      }

      setVolumeInfo({ data: Float32Array.from(raw), dims });
      setSliceIndex(Math.floor(dims[2] / 2));
    };

    load();
  }, [file]);

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
        const x = col;
        const y = yDim - 1 - row;
        values.push(data[x + y * xDim + safeSlice * xDim * yDim]);
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

    landmarks.forEach(({ label, voxel }) => {
      const [x, y, z] = voxel;
      if (Math.abs(z - safeSlice) > 2) return;

      const color = LANDMARK_COLORS[label] ?? "#ffffff";
      const drawX = x;
      const drawY = yDim - y;

      ctx.beginPath();
      ctx.arc(drawX, drawY, 7, 0, Math.PI * 2);
      ctx.fillStyle = color + "cc";
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText(label, drawX + 10, drawY - 8);
      ctx.fillText(label, drawX + 10, drawY - 8);
    });
  }, [volumeInfo, sliceIndex, landmarks]);

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

      {landmarks.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          {landmarks.map((lm) => (
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
              {lm.confidence !== null && (
                <span className="ml-auto flex-shrink-0 text-[10px] text-gray-400">
                  {(lm.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
