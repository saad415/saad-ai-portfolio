"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import * as nifti from "nifti-reader-js";
import {
  Brain,
  Brush,
  CheckCircle2,
  Database,
  Download,
  Layers3,
  MousePointer2,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import Navbar from "@/components/Navbar";

type Plane = "axial" | "coronal" | "sagittal";
type Label = "lesion" | "organ" | "exclude";
type Status = "unreviewed" | "in-progress" | "complete";
type ToolMode = "paint" | "select" | "move";

type AnnotationPoint = {
  id: string;
  caseId: string;
  label: Label;
  plane: Plane;
  slice: number;
  x: number;
  y: number;
  radius: number;
  name?: string;
  color?: string;
  tool: "brush" | "region-grow";
};

type VolumeInfo = {
  data: Float32Array;
  dims: [number, number, number];
  affine: number[][];
  fileName: string;
};

const LABEL_STYLES: Record<Label, { name: string; color: string; bg: string }> = {
  lesion: { name: "Lesion", color: "#f87171", bg: "bg-red-300/15 text-red-100 border-red-300/30" },
  organ: { name: "Organ", color: "#2dd4bf", bg: "bg-teal-300/15 text-teal-100 border-teal-300/30" },
  exclude: { name: "Exclude", color: "#a78bfa", bg: "bg-violet-300/15 text-violet-100 border-violet-300/30" },
};

const PLANE_META: Record<Plane, { label: string; axis: string }> = {
  axial: { label: "Axial", axis: "Z" },
  coronal: { label: "Coronal", axis: "Y" },
  sagittal: { label: "Sagittal", axis: "X" },
};

export default function MedicalAnnotationDemoPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLButtonElement | null>(null);
  const [activePlane, setActivePlane] = useState<Plane>("axial");
  const [slice, setSlice] = useState(48);
  const [label, setLabel] = useState<Label>("lesion");
  const [toolMode, setToolMode] = useState<ToolMode>("paint");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [brushRadius, setBrushRadius] = useState(9);
  const [status, setStatus] = useState<Status>("in-progress");
  const [notes, setNotes] = useState("Review posterior boundary before export.");
  const [annotations, setAnnotations] = useState<AnnotationPoint[]>([
    { id: "seed-1", caseId: "mri-042", label: "organ", plane: "axial", slice: 48, x: 46, y: 53, radius: 14, tool: "brush" },
    { id: "seed-2", caseId: "mri-042", label: "lesion", plane: "axial", slice: 48, x: 61, y: 44, radius: 8, tool: "region-grow" },
    { id: "seed-3", caseId: "mri-042", label: "organ", plane: "coronal", slice: 48, x: 50, y: 52, radius: 13, tool: "brush" },
  ]);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "loaded">("idle");
  const [volumeInfo, setVolumeInfo] = useState<VolumeInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [movingAnnotationId, setMovingAnnotationId] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const activeCaseId = volumeInfo ? `uploaded-${volumeInfo.fileName}` : "uploaded-demo";
  const maxSlice = getMaxSlice(volumeInfo, activePlane);
  const activeSlice = Math.min(slice, maxSlice);
  const visibleAnnotations = annotations.filter(
    (point) => point.caseId === activeCaseId && point.plane === activePlane && Math.abs(point.slice - activeSlice) <= 2,
  );
  const caseAnnotations = annotations.filter((point) => point.caseId === activeCaseId);
  const selectedAnnotation = annotations.find((point) => point.id === selectedAnnotationId) ?? null;
  const exportPayload = useMemo(() => ({
    caseId: activeCaseId,
    modality: "Uploaded NIfTI MRI",
    region: "User-uploaded volume",
    volume: volumeInfo ? { fileName: volumeInfo.fileName, dims: volumeInfo.dims } : null,
    status,
    notes,
    annotationCount: caseAnnotations.length,
    labels: summarizeLabels(caseAnnotations),
    annotations: caseAnnotations,
    backendContract: {
      save: "POST /annotations/:caseId",
      load: "GET /annotations/:caseId",
      export: "GET /annotations/:caseId/export",
    },
  }), [activeCaseId, caseAnnotations, notes, status, volumeInfo]);

  useEffect(() => {
    if (!volumeInfo || !canvasRef.current) return;
    renderVolumeSlice(canvasRef.current, volumeInfo, activePlane, activeSlice);
  }, [activePlane, activeSlice, volumeInfo]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const syncSize = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  async function handleVolumeUpload(file: File | null) {
    if (!file) return;

    setLoadError("");

    try {
      const parsed = await parseNiftiFile(file);
      setVolumeInfo(parsed);
      setActivePlane("axial");
      setSlice(Math.floor(getMaxSlice(parsed, "axial") / 2));
      setStatus("in-progress");
      setNotes(`Uploaded ${file.name}. Annotate relevant slices and export ML-ready JSON.`);
      setSaveState("idle");
      resetViewport();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load this NIfTI file.");
    }
  }

  function addBrushPoint(x: number, y: number, tool: AnnotationPoint["tool"] = "brush") {
    setAnnotations((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        caseId: activeCaseId,
        label,
        plane: activePlane,
        slice: activeSlice,
        x,
        y,
        radius: tool === "region-grow" ? brushRadius + 7 : brushRadius,
        tool,
      },
    ]);
    setSaveState("idle");
  }

  function handleViewportClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (dragging) return;
    if (toolMode !== "paint") return;
    const point = eventToImagePoint(event);

    if (!point) return;
    addBrushPoint(Math.round(point.x), Math.round(point.y));
  }

  function startDrag(event: React.MouseEvent<HTMLButtonElement>) {
    if (toolMode === "move" && selectedAnnotation) {
      setMovingAnnotationId(selectedAnnotation.id);
      return;
    }

    if (zoom <= 1) return;
    setDragging(true);
    dragOrigin.current = { mx: event.clientX, my: event.clientY, px: pan.x, py: pan.y };
  }

  function moveDrag(event: React.MouseEvent<HTMLButtonElement>) {
    if (movingAnnotationId) {
      const point = eventToImagePoint(event);
      if (!point) return;
      updateAnnotation(movingAnnotationId, { x: Math.round(point.x), y: Math.round(point.y), slice: activeSlice });
      return;
    }

    if (!dragging) return;
    const { mx, my, px, py } = dragOrigin.current;
    setPan({ x: px + event.clientX - mx, y: py + event.clientY - my });
  }

  function stopDrag() {
    setDragging(false);
    setMovingAnnotationId(null);
  }

  function eventToImagePoint(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const viewportX = (localX - centerX - pan.x) / zoom + centerX;
    const viewportY = (localY - centerY - pan.y) / zoom + centerY;
    const imageRect = getImageRect(rect.width, rect.height, volumeInfo, activePlane);
    const x = ((viewportX - imageRect.left) / imageRect.width) * 100;
    const y = ((viewportY - imageRect.top) / imageRect.height) * 100;

    if (x < 0 || x > 100 || y < 0 || y > 100) return null;
    return { x, y };
  }

  function updateAnnotation(id: string, patch: Partial<AnnotationPoint>) {
    setAnnotations((current) => current.map((point) => point.id === id ? { ...point, ...patch } : point));
    setSaveState("idle");
  }

  function deleteSelectedAnnotation() {
    if (!selectedAnnotationId) return;
    setAnnotations((current) => current.filter((point) => point.id !== selectedAnnotationId));
    setSelectedAnnotationId(null);
    setSaveState("idle");
  }

  function resetViewport() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleZoomChange(value: number) {
    setZoom(value);
    if (value === 1) {
      setPan({ x: 0, y: 0 });
    }
  }

  function runRegionGrow() {
    const seedX = 44 + Math.round(Math.random() * 18);
    const seedY = 40 + Math.round(Math.random() * 18);
    const cluster = Array.from({ length: 7 }, (_, index) => ({
      id: `${Date.now()}-${index}`,
      caseId: activeCaseId,
      label,
      plane: activePlane,
      slice: activeSlice + Math.floor(index / 3) - 1,
      x: seedX + Math.round(Math.cos(index) * 6),
      y: seedY + Math.round(Math.sin(index) * 5),
      radius: brushRadius + 5,
      tool: "region-grow" as const,
    }));

    setAnnotations((current) => [...current, ...cluster]);
    setSaveState("idle");
  }

  function saveAnnotations() {
    localStorage.setItem("medical-annotation-demo", JSON.stringify({ annotations, status, notes }));
    setSaveState("saved");
  }

  function loadAnnotations() {
    const saved = localStorage.getItem("medical-annotation-demo");
    if (!saved) return;
    const parsed = JSON.parse(saved) as { annotations: AnnotationPoint[]; status: Status; notes: string };
    setAnnotations(parsed.annotations);
    setStatus(parsed.status);
    setNotes(parsed.notes);
    setSaveState("loaded");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeCaseId}-annotation-export.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportSlicerMarkups() {
    const payload = buildSlicerMarkups(caseAnnotations, volumeInfo, activeCaseId);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeCaseId}-landmarks.mrk.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetCase() {
    setAnnotations((current) => current.filter((point) => point.caseId !== activeCaseId));
    setSelectedAnnotationId(null);
    setSaveState("idle");
  }

  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-28">
        <div className="flex flex-col gap-6 border-b border-white/[0.08] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-teal-300">Medical Annotation Platform Demo</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Browser-based MRI annotation workflow for clinical experts and ML teams
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-400">
              A focused prototype for volumetric imaging review, annotation state management, brush editing, region growing, and ML-ready export.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-3 lg:w-[440px]">
            <Metric icon={Layers3} label="Volume" value="3-plane MRI" />
            <Metric icon={Database} label="Backend" value="State contract" />
            <Metric icon={Brain} label="Output" value="ML-ready JSON" />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <Panel title="Load NIfTI Volume">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-teal-300/30 bg-teal-300/5 px-4 py-5 text-center transition hover:border-teal-300/60 hover:bg-teal-300/10">
                <Upload size={22} className="text-teal-300" />
                <span className="mt-3 text-sm font-semibold text-white">Upload .nii or .nii.gz</span>
                <span className="mt-1 text-xs leading-5 text-zinc-500">Rendered locally in the browser</span>
                <input
                  type="file"
                  accept=".nii,.nii.gz,application/gzip"
                  className="sr-only"
                  onChange={(event) => handleVolumeUpload(event.target.files?.[0] ?? null)}
                />
              </label>
              {volumeInfo && (
                <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs text-zinc-400">
                  <p className="font-semibold text-zinc-200">{volumeInfo.fileName}</p>
                  <p className="mt-1">Dims: {volumeInfo.dims.join(" x ")}</p>
                </div>
              )}
              {loadError && (
                <p className="mt-3 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-xs leading-5 text-red-100">
                  {loadError}
                </p>
              )}
            </Panel>

            <Panel title="Annotation Tools">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Mode</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["paint", "select", "move"] as ToolMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setToolMode(mode)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                          toolMode === mode
                            ? "border-teal-300/40 bg-teal-300/15 text-teal-100"
                            : "border-white/[0.1] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Label</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(LABEL_STYLES) as Label[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setLabel(item)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          label === item ? LABEL_STYLES[item].bg : "border-white/[0.1] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {LABEL_STYLES[item].name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-xs uppercase tracking-wider text-zinc-500">
                    <span>Brush radius</span>
                    <span>{brushRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    value={brushRadius}
                    onChange={(event) => setBrushRadius(Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <button
                  type="button"
                  onClick={runRegionGrow}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal-300 px-4 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
                >
                  <Sparkles size={15} /> Region grow seed
                </button>
              </div>
            </Panel>

            <Panel title="Selected Landmark">
              {selectedAnnotation ? (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Name</p>
                    <input
                      value={selectedAnnotation.name ?? LABEL_STYLES[selectedAnnotation.label].name}
                      onChange={(event) => updateAnnotation(selectedAnnotation.id, { name: event.target.value })}
                      className="w-full rounded-2xl border border-white/[0.08] bg-[#0b1014] px-4 py-2.5 text-sm text-white outline-none focus:border-teal-300/50"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Label</p>
                    <select
                      value={selectedAnnotation.label}
                      onChange={(event) => updateAnnotation(selectedAnnotation.id, { label: event.target.value as Label })}
                      className="w-full rounded-2xl border border-white/[0.08] bg-[#0b1014] px-4 py-2.5 text-sm text-white outline-none focus:border-teal-300/50"
                    >
                      <option value="lesion">Lesion</option>
                      <option value="organ">Organ</option>
                      <option value="exclude">Exclude</option>
                    </select>
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Color</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={selectedAnnotation.color ?? LABEL_STYLES[selectedAnnotation.label].color}
                        onChange={(event) => updateAnnotation(selectedAnnotation.id, { color: event.target.value })}
                        className="h-10 w-14 rounded-xl border border-white/[0.1] bg-transparent"
                      />
                      <span className="font-mono text-xs text-zinc-500">
                        {selectedAnnotation.color ?? LABEL_STYLES[selectedAnnotation.label].color}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-xs uppercase tracking-wider text-zinc-500">
                      <span>Radius</span>
                      <span>{selectedAnnotation.radius}px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="30"
                      value={selectedAnnotation.radius}
                      onChange={(event) => updateAnnotation(selectedAnnotation.id, { radius: Number(event.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                    <span>X {selectedAnnotation.x}</span>
                    <span>Y {selectedAnnotation.y}</span>
                    <span>Slice {selectedAnnotation.slice}</span>
                    <span>{selectedAnnotation.plane}</span>
                  </div>

                  <button
                    type="button"
                    onClick={deleteSelectedAnnotation}
                    className="w-full rounded-full border border-red-300/20 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-300/10"
                  >
                    Delete landmark
                  </button>
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-500">
                  Switch to Select mode and click a landmark to edit its name, label, color, size, or delete it.
                </p>
              )}
            </Panel>
          </aside>

          <div className="space-y-6">
            <Panel title="3D Viewer">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PLANE_META) as Plane[]).map((plane) => (
                    <button
                      key={plane}
                      type="button"
                      onClick={() => setActivePlane(plane)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activePlane === plane
                          ? "bg-teal-300 text-[#04100f]"
                          : "border border-white/[0.1] text-zinc-300 hover:border-teal-300/50 hover:text-teal-100"
                      }`}
                    >
                      {PLANE_META[plane].label}
                    </button>
                  ))}
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-zinc-400">
                  <MousePointer2 size={14} className="text-teal-300" />
                  {toolMode === "paint" ? "Click to paint" : toolMode === "select" ? "Click a landmark to select" : "Drag selected landmark"}
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
                <button
                  ref={viewportRef}
                  type="button"
                  onClick={handleViewportClick}
                  onMouseDown={startDrag}
                  onMouseMove={moveDrag}
                  onMouseUp={stopDrag}
                  onMouseLeave={stopDrag}
                  className={`relative min-h-[520px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050709] text-left ${
                    toolMode === "paint"
                      ? "cursor-crosshair"
                      : toolMode === "move" && selectedAnnotation
                        ? "cursor-move"
                        : zoom > 1 ? dragging ? "cursor-grabbing" : "cursor-grab" : "cursor-default"
                  }`}
                  aria-label="MRI annotation viewport"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: "center center",
                      transition: dragging ? "none" : "transform 0.15s ease",
                    }}
                  >
                    <div className="absolute inset-0" style={{ background: mriBackground(activePlane, activeSlice) }} />
                    {volumeInfo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black">
                        <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
                      </div>
	                    )}
	                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:32px_32px]" />
	                    {visibleAnnotations.map((point, index) => {
                        const pointColor = point.color ?? LABEL_STYLES[point.label].color;
                        const selected = point.id === selectedAnnotationId;
                        const displayName = point.name?.trim() || `${LABEL_STYLES[point.label].name} ${index + 1}`;
                        const viewportPosition = imagePointToViewportPosition(point, viewportSize, volumeInfo, activePlane);

                        return (
                          <div
                            key={point.id}
                            className="absolute z-20"
                            style={{ left: viewportPosition.left, top: viewportPosition.top }}
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedAnnotationId(point.id);
                              }}
                              className={`absolute rounded-full border-2 shadow-[0_0_22px_rgba(45,212,191,0.18)] ${
                                selected ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""
                              }`}
                              style={{
                                width: point.radius * 2,
                                height: point.radius * 2,
                                left: -point.radius,
                                top: -point.radius,
                                borderColor: pointColor,
                                backgroundColor: `${pointColor}30`,
                              }}
                              title={displayName}
                            />
                            <span
                              className="pointer-events-none absolute left-3 top-[-1.35rem] whitespace-nowrap text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                              style={{ color: pointColor }}
                            >
                              {displayName}
                            </span>
                          </div>
                        );
                      })}
	                  </div>
                  <div className="absolute left-4 top-4 rounded-full border border-white/[0.1] bg-black/45 px-3 py-1.5 text-xs font-semibold text-zinc-300 backdrop-blur">
                    {PLANE_META[activePlane].label} · {PLANE_META[activePlane].axis} {activeSlice}
                  </div>

	                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/45 px-4 py-3 backdrop-blur">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <Brush size={16} className="text-teal-300" />
                      {visibleAnnotations.length} marks visible on this slice
                    </div>
                    <div className="text-xs text-zinc-500">{caseAnnotations.length} total annotations in case</div>
                  </div>
                </button>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-xs uppercase tracking-wider text-zinc-500">
                      <span>Slice</span>
                      <span>{activeSlice} / {maxSlice}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={maxSlice}
                      value={activeSlice}
                      onChange={(event) => setSlice(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-wider text-zinc-500">
                      <span>Zoom</span>
                      <div className="flex items-center gap-3">
                        <span>{Math.round(zoom * 100)}%</span>
                        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
                          <button
                            type="button"
                            onClick={resetViewport}
                            className="rounded-full border border-white/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 transition hover:border-teal-300/40 hover:text-teal-100"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.05"
                      value={zoom}
                      onChange={(event) => handleZoomChange(Number(event.target.value))}
                      className="w-full"
                      aria-label="Zoom level"
                    />
                  </div>

                  <div className="grid gap-3">
                    <ActionButton icon={Save} label="Save state" onClick={saveAnnotations} />
                    <ActionButton icon={Database} label="Load saved state" onClick={loadAnnotations} />
                    <ActionButton icon={Download} label="Export JSON" onClick={exportJson} />
                    <ActionButton icon={Download} label="Export Slicer .mrk.json" onClick={exportSlicerMarkups} />
                    <ActionButton icon={RotateCcw} label="Clear case" onClick={resetCase} muted />
                  </div>

                  {saveState !== "idle" && (
                    <div className="flex items-center gap-2 rounded-2xl border border-teal-300/20 bg-teal-300/10 px-4 py-3 text-sm text-teal-100">
                      <CheckCircle2 size={16} />
                      {saveState === "saved" ? "Annotation state saved locally." : "Saved annotation state loaded."}
                    </div>
                  )}

                </div>
              </div>
            </Panel>

            <Panel title="Clinical Review State">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Case status</p>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as Status)}
                    className="w-full rounded-2xl border border-white/[0.08] bg-[#0b1014] px-4 py-3 text-sm text-white outline-none focus:border-teal-300/50"
                  >
                    <option value="unreviewed">Unreviewed</option>
                    <option value="in-progress">In progress</option>
                    <option value="complete">Complete</option>
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Radiologist notes</p>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-32 w-full rounded-2xl border border-white/[0.08] bg-[#0b1014] px-4 py-3 text-sm leading-6 text-white outline-none focus:border-teal-300/50"
                  />
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/70 p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <Icon size={18} className="text-teal-300" />
      <p className="mt-3 text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, muted = false }: { icon: IconComponent; label: string; onClick: () => void; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        muted
          ? "border border-white/[0.1] text-zinc-400 hover:border-red-300/30 hover:text-red-100"
          : "border border-white/[0.1] text-zinc-200 hover:border-teal-300/50 hover:text-teal-100"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function summarizeLabels(points: AnnotationPoint[]) {
  return points.reduce<Record<Label, number>>(
    (summary, point) => {
      summary[point.label] += 1;
      return summary;
    },
    { lesion: 0, organ: 0, exclude: 0 },
  );
}

type IconComponent = ComponentType<{ size?: number; className?: string }>;

function getPlanePixelSize(volume: VolumeInfo | null, plane: Plane) {
  if (!volume) return { width: 100, height: 100 };

  const [xDim, yDim, zDim] = volume.dims;

  if (plane === "axial") return { width: xDim, height: yDim };
  if (plane === "coronal") return { width: xDim, height: zDim };
  return { width: yDim, height: zDim };
}

function getImageRect(viewportWidth: number, viewportHeight: number, volume: VolumeInfo | null, plane: Plane) {
  if (!volume || viewportWidth === 0 || viewportHeight === 0) {
    return { left: 0, top: 0, width: viewportWidth || 100, height: viewportHeight || 100 };
  }

  const imageSize = getPlanePixelSize(volume, plane);
  const scale = Math.min(1, viewportWidth / imageSize.width, viewportHeight / imageSize.height);
  const width = imageSize.width * scale;
  const height = imageSize.height * scale;

  return {
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
    width,
    height,
  };
}

function imagePointToViewportPosition(
  point: AnnotationPoint,
  viewportSize: { width: number; height: number },
  volume: VolumeInfo | null,
  plane: Plane,
) {
  const imageRect = getImageRect(viewportSize.width, viewportSize.height, volume, plane);

  return {
    left: imageRect.left + (point.x / 100) * imageRect.width,
    top: imageRect.top + (point.y / 100) * imageRect.height,
  };
}

async function parseNiftiFile(file: File): Promise<VolumeInfo> {
  const arrayBuffer = await file.arrayBuffer();
  let buffer: ArrayBuffer = arrayBuffer;

  if (nifti.isCompressed(buffer)) {
    buffer = nifti.decompress(buffer) as ArrayBuffer;
  }

  if (!nifti.isNIFTI(buffer)) {
    throw new Error("This file is not a valid NIfTI volume.");
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
      throw new Error(`Unsupported NIfTI datatype: ${header.datatypeCode}`);
  }

  return {
    data: Float32Array.from(rawData),
    dims,
    affine: header.affine,
    fileName: file.name,
  };
}

function buildSlicerMarkups(points: AnnotationPoint[], volume: VolumeInfo | null, caseId: string) {
  const controlPoints = points.map((point, index) => {
    const voxel = annotationToVoxel(point, volume);
    const ras = applyAffine(volume?.affine ?? identityAffine(), voxel);
    const lps = [-ras[0], -ras[1], ras[2]];

    return {
      id: String(index + 1),
      label: point.name?.trim() || `${LABEL_STYLES[point.label].name}_${index + 1}`,
      description: `${point.label}; ${point.plane} slice ${point.slice}`,
      associatedNodeID: "vtkMRMLScalarVolumeNode1",
      position: lps,
      orientation: [-1.0, -0.0, -0.0, -0.0, -1.0, -0.0, 0.0, 0.0, 1.0],
      selected: true,
      locked: false,
      visibility: true,
      positionStatus: "defined",
    };
  });

  return {
    "@schema": "https://raw.githubusercontent.com/slicer/slicer/master/Modules/Loadable/Markups/Resources/Schema/markups-schema-v1.0.3.json#",
    markups: [
      {
        type: "Fiducial",
        coordinateSystem: "LPS",
        coordinateUnits: "mm",
        locked: false,
        fixedNumberOfControlPoints: false,
        labelFormat: "%N-%d",
        lastUsedControlPointNumber: controlPoints.length,
        controlPoints,
        measurements: [],
        display: {
          visibility: true,
          opacity: 1.0,
          color: [0.4, 1.0, 1.0],
          selectedColor: [0.9568627450980391, 0.8392156862745098, 0.19215686274509805],
          activeColor: [0.4, 1.0, 0.0],
          propertiesLabelVisibility: false,
          pointLabelsVisibility: true,
          textScale: 3.0,
          glyphType: "Sphere3D",
          glyphScale: 3.0,
          glyphSize: 5.0,
          useGlyphScale: true,
          sliceProjection: false,
          sliceProjectionUseFiducialColor: true,
          sliceProjectionOutlinedBehindSlicePlane: false,
          sliceProjectionColor: [1.0, 1.0, 1.0],
          sliceProjectionOpacity: 0.6,
          lineThickness: 0.2,
          lineColorFadingStart: 1.0,
          lineColorFadingEnd: 10.0,
          lineColorFadingSaturation: 1.0,
          lineColorFadingHueOffset: 0.0,
          handlesInteractive: false,
          translationHandleVisibility: true,
          rotationHandleVisibility: true,
          scaleHandleVisibility: false,
          interactionHandleScale: 3.0,
          snapMode: "toVisibleSurface",
        },
        metadata: {
          source: "Saad Ahmad medical annotation demo",
          caseId,
          volumeFile: volume?.fileName ?? "demo-volume",
        },
      },
    ],
  };
}

function annotationToVoxel(point: AnnotationPoint, volume: VolumeInfo | null): [number, number, number] {
  const [xDim, yDim, zDim] = volume?.dims ?? [100, 100, 100];
  const xPercent = clamp(point.x / 100, 0, 1);
  const yPercent = clamp(point.y / 100, 0, 1);

  if (point.plane === "axial") {
    return [
      xPercent * (xDim - 1),
      (1 - yPercent) * (yDim - 1),
      clamp(point.slice, 0, zDim - 1),
    ];
  }

  if (point.plane === "coronal") {
    return [
      xPercent * (xDim - 1),
      clamp(point.slice, 0, yDim - 1),
      (1 - yPercent) * (zDim - 1),
    ];
  }

  return [
    clamp(point.slice, 0, xDim - 1),
    xPercent * (yDim - 1),
    (1 - yPercent) * (zDim - 1),
  ];
}

function applyAffine(affine: number[][], voxel: [number, number, number]) {
  const [i, j, k] = voxel;

  return [
    affine[0][0] * i + affine[0][1] * j + affine[0][2] * k + affine[0][3],
    affine[1][0] * i + affine[1][1] * j + affine[1][2] * k + affine[1][3],
    affine[2][0] * i + affine[2][1] * j + affine[2][2] * k + affine[2][3],
  ];
}

function identityAffine() {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function renderVolumeSlice(canvas: HTMLCanvasElement, volume: VolumeInfo, plane: Plane, slice: number) {
  const { data, dims } = volume;
  const [xDim, yDim, zDim] = dims;

  let width = xDim;
  let height = yDim;

  if (plane === "coronal") {
    width = xDim;
    height = zDim;
  }

  if (plane === "sagittal") {
    width = yDim;
    height = zDim;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.createImageData(width, height);
  const values = new Float32Array(width * height);

  const getVoxel = (x: number, y: number, z: number) => {
    return data[x + y * xDim + z * xDim * yDim] ?? 0;
  };

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let value = 0;

      if (plane === "axial") {
        value = getVoxel(col, height - 1 - row, slice);
      }

      if (plane === "coronal") {
        value = getVoxel(col, slice, height - 1 - row);
      }

      if (plane === "sagittal") {
        value = getVoxel(slice, col, height - 1 - row);
      }

      values[row * width + col] = value;
    }
  }

  const sorted = Array.from(values).sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * 0.01)] ?? 0;
  const high = sorted[Math.floor(sorted.length * 0.99)] ?? 1;
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
}

function getMaxSlice(volume: VolumeInfo | null, plane: Plane) {
  if (!volume) return 96;

  const [xDim, yDim, zDim] = volume.dims;
  if (plane === "axial") return Math.max(0, zDim - 1);
  if (plane === "coronal") return Math.max(0, yDim - 1);
  return Math.max(0, xDim - 1);
}

function mriBackground(plane: Plane, slice: number) {
  const offset = slice % 17;

  if (plane === "axial") {
    return `radial-gradient(ellipse at ${40 + offset}% 42%, rgba(210,230,230,0.72), transparent 13rem), radial-gradient(ellipse at 58% 55%, rgba(130,150,160,0.55), transparent 10rem), radial-gradient(ellipse at 50% 50%, rgba(45,212,191,0.14), transparent 18rem), #050709`;
  }

  if (plane === "coronal") {
    return `radial-gradient(ellipse at 50% ${40 + offset}%, rgba(220,230,235,0.65), transparent 12rem), radial-gradient(ellipse at 44% 62%, rgba(100,120,135,0.58), transparent 9rem), radial-gradient(ellipse at 50% 48%, rgba(96,165,250,0.12), transparent 18rem), #050709`;
  }

  return `radial-gradient(ellipse at ${52 - offset}% 50%, rgba(225,232,235,0.68), transparent 11rem), radial-gradient(ellipse at 57% 54%, rgba(120,135,150,0.5), transparent 8rem), radial-gradient(ellipse at 50% 50%, rgba(167,139,250,0.12), transparent 18rem), #050709`;
}
