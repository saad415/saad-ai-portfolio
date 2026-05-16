"use client";

import { useEffect, useRef, useState } from "react";
import * as nifti from "nifti-reader-js";

type Landmark = {
  label: string;
  voxel: [number, number, number];
  confidence: number;
  type: string;
};

type NiftiViewerProps = {
  file: File | null;
  landmarks?: Landmark[];
};
type ViewMode = "axial" | "coronal" | "sagittal";

type VolumeInfo = {
  data: Float32Array;
  dims: [number, number, number];
};

export default function NiftiViewer({ file, landmarks = [] }: NiftiViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [volumeInfo, setVolumeInfo] = useState<VolumeInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("sagittal");
  const [sliceIndex, setSliceIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => {
    if (!file) return;

    const loadFile = async () => {
      const arrayBuffer = await file.arrayBuffer();
      let buffer: ArrayBuffer = arrayBuffer;

      if (nifti.isCompressed(buffer)) {
        buffer = nifti.decompress(buffer) as ArrayBuffer;
      }

      if (!nifti.isNIFTI(buffer)) {
        alert("Invalid NIfTI file.");
        return;
      }

      const header = nifti.readHeader(buffer);
      const imageBuffer = nifti.readImage(header, buffer) as ArrayBuffer;

      const dims: [number, number, number] = [
        header.dims[1],
        header.dims[2],
        header.dims[3],
      ];

      let rawData:
        | Uint8Array
        | Int16Array
        | Int32Array
        | Float32Array
        | Float64Array;

      switch (header.datatypeCode) {
        case nifti.NIFTI1.TYPE_UINT8:
          rawData = new Uint8Array(imageBuffer);
          break;

        case nifti.NIFTI1.TYPE_INT16:
          rawData = new Int16Array(imageBuffer);
          break;

        case nifti.NIFTI1.TYPE_INT32:
          rawData = new Int32Array(imageBuffer);
          break;

        case nifti.NIFTI1.TYPE_FLOAT32:
          rawData = new Float32Array(imageBuffer);
          break;

        case nifti.NIFTI1.TYPE_FLOAT64:
          rawData = new Float64Array(imageBuffer);
          break;

        default:
          alert(`Unsupported NIfTI datatype: ${header.datatypeCode}`);
          return;
      }

      const floatVolume = Float32Array.from(rawData);

      setVolumeInfo({
        data: floatVolume,
        dims,
      });

      setViewMode("sagittal");
      setSliceIndex(Math.floor(dims[2] / 2));
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };

    loadFile();
  }, [file]);

  useEffect(() => {
    if (!volumeInfo || !canvasRef.current) return;

    const { data, dims } = volumeInfo;
    const [xDim, yDim, zDim] = dims;

    let width = 0;
    let height = 0;
    let maxSlice = 0;

    if (viewMode === "sagittal") {
      width = xDim;
      height = yDim;
      maxSlice = zDim - 1;
    }

    if (viewMode === "coronal") {
      width = zDim;
      height = yDim;
      maxSlice = xDim - 1;
    }

    if (viewMode === "axial") {
      width = xDim;
      height = zDim;
      maxSlice = yDim - 1;
    }

    const safeSlice = Math.min(sliceIndex, maxSlice);

    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    const values: number[] = [];

    const getVoxel = (x: number, y: number, z: number) => {
      return data[x + y * xDim + z * xDim * yDim];
    };

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        let value = 0;

        if (viewMode === "sagittal") {
          const x = col;
          const y = height - 1 - row;
          const z = safeSlice;

          value = getVoxel(x, y, z);
        }

        if (viewMode === "coronal") {
          const x = safeSlice;
          const y = height - 1 - row;
          const z = col;

          value = getVoxel(x, y, z);
        }

        if (viewMode === "axial") {
          const x = col;
          const y = safeSlice;
          const z = height - 1 - row;

          value = getVoxel(x, y, z);
        }

        values.push(value);
      }
    }
    const sorted = [...values].sort((a, b) => a - b);
    const low = sorted[Math.floor(sorted.length * 0.01)];
    const high = sorted[Math.floor(sorted.length * 0.99)];
    const range = high - low || 1;

    values.forEach((value, pixelIndex) => {
      const clipped = Math.min(Math.max(value, low), high);
      const normalized = Math.floor(((clipped - low) / range) * 255);

      const dataIndex = pixelIndex * 4;

      imageData.data[dataIndex] = normalized;
      imageData.data[dataIndex + 1] = normalized;
      imageData.data[dataIndex + 2] = normalized;
      imageData.data[dataIndex + 3] = 255;
    });

    ctx.putImageData(imageData, 0, 0);
    ctx.fillStyle = "#00ff88";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.font = "14px sans-serif";

    landmarks.forEach((landmark) => {
      const [x, y, z] = landmark.voxel;

      let drawX = 0;
      let drawY = 0;
      let shouldRender = false;

      if (viewMode === "sagittal" && Math.abs(z - safeSlice) <= 2) {
        drawX = x;
        drawY = height - y;
        shouldRender = true;
      }

      if (viewMode === "coronal" && Math.abs(x - safeSlice) <= 2) {
        drawX = z;
        drawY = height - y;
        shouldRender = true;
      }

      if (viewMode === "axial" && Math.abs(y - safeSlice) <= 2) {
        drawX = x;
        drawY = height - z;
        shouldRender = true;
      }

      if (!shouldRender) return;

      ctx.beginPath();
      ctx.arc(drawX, drawY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillText(
        landmark.label,
        drawX + 10,
        drawY - 10
      );
    });
  }, [volumeInfo, viewMode, sliceIndex, landmarks]);

  const changeViewMode = (mode: ViewMode) => {
    if (!volumeInfo) return;

    const [xDim, yDim, zDim] = volumeInfo.dims;

    setViewMode(mode);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    if (mode === "sagittal") {
      setSliceIndex(Math.floor(zDim / 2));
    }

    if (mode === "coronal") {
      setSliceIndex(Math.floor(xDim / 2));
    }

    if (mode === "axial") {
      setSliceIndex(Math.floor(yDim / 2));
    }
  };

  const getMaxSlice = () => {
    if (!volumeInfo) return 0;

    const [xDim, yDim, zDim] = volumeInfo.dims;

    if (viewMode === "sagittal") return zDim - 1;
    if (viewMode === "coronal") return xDim - 1;
    return yDim - 1;
  };

  const getAxisLabel = () => {
    if (viewMode === "sagittal") return "Z";
    if (viewMode === "coronal") return "X";
    return "Y";
  };

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

  if (!file) {
    return (
      <div className="mt-8 flex h-80 items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-6 text-center text-gray-500">
        Upload a NIfTI volume to display the MRI viewer.
      </div>
    );
  }

  if (!volumeInfo) {
    return (
      <div className="mt-8 flex h-80 items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-6 text-center text-gray-500">
        Loading NIfTI volume...
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["sagittal", "coronal", "axial"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => changeViewMode(mode)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              viewMode === mode
                ? "bg-green-400 text-black"
                : "border border-white/10 text-gray-300 hover:border-green-400 hover:text-green-400"
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

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
            className="max-h-[520px] w-auto rounded-xl object-contain select-none"
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

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm text-gray-400">
          <span>
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} slice
          </span>

          <span>
            {getAxisLabel()} = {sliceIndex} / {getMaxSlice()}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={getMaxSlice()}
          value={sliceIndex}
          onChange={(event) => setSliceIndex(Number(event.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
}
