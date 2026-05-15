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

// ── Affine building ───────────────────────────────────────────────────────────


function invert3x3(r: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, k]] = r;
  const det = a*(e*k - f*h) - b*(d*k - f*g) + c*(d*h - e*g);
  const s = 1 / det;
  return [
    [(e*k - f*h)*s, (c*h - b*k)*s, (b*f - c*e)*s],
    [(f*g - d*k)*s, (a*k - c*g)*s, (c*d - a*f)*s],
    [(d*h - e*g)*s, (b*g - a*h)*s, (a*e - b*d)*s],
  ];
}

function lpsToVoxel(
  lps: [number, number, number],
  header: nifti.NIFTI1 | nifti.NIFTI2
): [number, number, number] | null {
  // nifti-reader-js already computes the full 4×4 affine on header.affine
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const affine: number[][] = (header as any).affine;
  if (!affine) { console.warn("UterusViewer: header.affine missing"); return null; }

  // LPS → RAS (negate x and y)
  const ras = [-lps[0], -lps[1], lps[2]];

  // RAS world → voxel:  vox = R^-1 * (ras - t)
  const R = [[affine[0][0], affine[0][1], affine[0][2]],
             [affine[1][0], affine[1][1], affine[1][2]],
             [affine[2][0], affine[2][1], affine[2][2]]];
  const t = [affine[0][3], affine[1][3], affine[2][3]];
  const Ri = invert3x3(R);
  const diff = [ras[0]-t[0], ras[1]-t[1], ras[2]-t[2]];

  const vox = [
    Ri[0][0]*diff[0] + Ri[0][1]*diff[1] + Ri[0][2]*diff[2],
    Ri[1][0]*diff[0] + Ri[1][1]*diff[1] + Ri[1][2]*diff[2],
    Ri[2][0]*diff[0] + Ri[2][1]*diff[1] + Ri[2][2]*diff[2],
  ];

  console.log(`[UterusViewer] LPS ${lps.map(v=>v.toFixed(1))} → voxel [${vox.map(v=>v.toFixed(1))}]`);

  return [Math.round(vox[0]), Math.round(vox[1]), Math.round(vox[2])];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function UterusViewer({ file, lpsLandmarks = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [volumeInfo, setVolumeInfo] = useState<VolumeInfo | null>(null);
  const [voxelLandmarks, setVoxelLandmarks] = useState<VoxelLandmark[]>([]);
  const [sliceIndex, setSliceIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

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

      if (lpsLandmarks.length > 0) {
        const converted: VoxelLandmark[] = [];
        for (const { label, lps } of lpsLandmarks) {
          const voxel = lpsToVoxel(lps, header);
          if (voxel) converted.push({ label, voxel });
        }
        console.log("[UterusViewer] converted landmarks:", converted);
        console.log("[UterusViewer] volume dims:", dims);
        setVoxelLandmarks(converted);
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

    // Draw MRI slice
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

    // Draw landmark dots
    voxelLandmarks.forEach(({ label, voxel }) => {
      const [x, y, z] = voxel;
      if (Math.abs(z - safeSlice) > 3) return;

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
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000";
      ctx.strokeText(label, drawX + 10, drawY - 8);
      ctx.fillStyle = color;
      ctx.fillText(label, drawX + 10, drawY - 8);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const { mx, my, px, py } = dragOrigin.current;
    setPan({ x: px + (e.clientX - mx), y: py + (e.clientY - my) });
  };

  const stopDrag = () => setDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    dragOrigin.current = { mx: t.clientX, my: t.clientY, px: pan.x, py: pan.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    const { mx, my, px, py } = dragOrigin.current;
    setPan({ x: px + (t.clientX - mx), y: py + (t.clientY - my) });
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-xl bg-black"
        style={{ minHeight: 200, cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDrag}
      >
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="max-h-[480px] w-auto rounded-xl object-contain select-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: dragging ? "none" : "transform 0.15s ease",
              pointerEvents: "none",
            }}
          />
        </div>
        <div className="absolute bottom-3 right-3 flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(z + 0.25, 3)); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-black/70 text-white backdrop-blur-sm hover:bg-white/10 transition-colors text-lg leading-none"
            aria-label="Zoom in"
          >+</button>
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(z - 0.25, 0.5)); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-black/70 text-white backdrop-blur-sm hover:bg-white/10 transition-colors text-lg leading-none"
            aria-label="Zoom out"
          >−</button>
          {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
            <button
              onClick={(e) => { e.stopPropagation(); resetView(); }}
              className="flex h-8 items-center justify-center rounded-lg border border-white/20 bg-black/70 px-2 text-xs text-gray-400 backdrop-blur-sm hover:bg-white/10 transition-colors"
              aria-label="Reset view"
            >reset</button>
          )}
        </div>
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
    </div>
  );
}
