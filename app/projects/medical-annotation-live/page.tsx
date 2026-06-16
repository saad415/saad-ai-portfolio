"use client";

const API_BASE = process.env.NEXT_PUBLIC_ANNOTATION_API_URL ?? "http://localhost:8000";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { gzipSync } from "fflate";
import * as nifti from "nifti-reader-js";
import {
  ArrowLeft,
  Brain,
  Brush,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Layers3,
  Loader2,
  MousePointer2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import Navbar from "@/components/Navbar";

type Plane = "axial" | "coronal" | "sagittal";
type Label = "lesion" | "organ" | "exclude";
type Status = "unreviewed" | "in-progress" | "complete";
type ToolMode = "paint" | "erase" | "select" | "move";
type WorkflowMode = "landmarks" | "segmentation";

type SavedCase = {
  id: string;
  status: Status;
  modality: string | null;
  volume_file_name: string | null;
  volume_url: string | null;
  updated_at: string;
  landmark_count: number;
  stroke_count: number;
};

type AnnotationVersion = {
  id: number;
  version_number: number;
  status: Status;
  notes: string;
  annotation_count: number;
  segmentation_count: number;
  created_at: string;
};

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

type SegmentationStroke = {
  id: string;
  caseId: string;
  label: Label;
  plane: Plane;
  slice: number;
  x: number;
  y: number;
  radius: number;
  source: "brush" | "region-grow";
};

type VolumeInfo = {
  data: Float32Array;
  dims: [number, number, number];
  pixDims: number[];
  affine: number[][];
  fileName: string;
  caseKey: string;
};

async function fetchCasesWithRetry(attempts = 4): Promise<SavedCase[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/annotations/cases`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Case list request failed with ${res.status}`);
      return await res.json() as SavedCase[];
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await sleep(700 * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function anonymizedCaseLabel(index: number) {
  return `Demo MRI Case ${String(index + 1).padStart(2, "0")}`;
}

function createAnonymizedCaseKey() {
  return `demo-mri-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function niftiExtension(fileName: string) {
  return fileName.toLowerCase().endsWith(".nii.gz") ? ".nii.gz" : ".nii";
}

function sanitizeDemoText(text: string) {
  return text
    .replace(/\b[\w.-]+\.nii(?:\.gz)?\b/gi, "anonymized MRI volume")
    .replace(/\buploaded-[\w.-]+/gi, "anonymized-demo-case");
}

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
  const volumeFileRef = useRef<File | null>(null);
  const [activePlane, setActivePlane] = useState<Plane>("axial");
  const [slice, setSlice] = useState(48);
  const [label, setLabel] = useState<Label>("lesion");
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("landmarks");
  const [toolMode, setToolMode] = useState<ToolMode>("paint");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selectedSegmentationId, setSelectedSegmentationId] = useState<string | null>(null);
  const [brushRadius, setBrushRadius] = useState(9);
  const [status, setStatus] = useState<Status>("in-progress");
  const [notes, setNotes] = useState("Review posterior boundary before export.");
  const [annotations, setAnnotations] = useState<AnnotationPoint[]>([
    { id: "seed-1", caseId: "mri-042", label: "organ", plane: "axial", slice: 48, x: 46, y: 53, radius: 14, tool: "brush" },
    { id: "seed-2", caseId: "mri-042", label: "lesion", plane: "axial", slice: 48, x: 61, y: 44, radius: 8, tool: "region-grow" },
    { id: "seed-3", caseId: "mri-042", label: "organ", plane: "coronal", slice: 48, x: 50, y: 52, radius: 13, tool: "brush" },
  ]);
  const [segmentations, setSegmentations] = useState<SegmentationStroke[]>([]);
  const [segmentationOpacity, setSegmentationOpacity] = useState(0.42);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "loading" | "loaded" | "error">("idle");
  const [volumeInfo, setVolumeInfo] = useState<VolumeInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [movingAnnotationId, setMovingAnnotationId] = useState<string | null>(null);
  const [movingSegmentationId, setMovingSegmentationId] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const [versions, setVersions] = useState<AnnotationVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [view, setView] = useState<"list" | "editor">("list");

  const activeCaseId = volumeInfo
    ? volumeInfo.caseKey
    : (typeof window !== "undefined" && localStorage.getItem("last-case-id")) || "uploaded-demo";
  const maxSlice = getMaxSlice(volumeInfo, activePlane);
  const activeSlice = Math.min(slice, maxSlice);
  const visibleAnnotations = annotations.filter(
    (point) => point.caseId === activeCaseId && point.plane === activePlane && Math.abs(point.slice - activeSlice) <= 2,
  );
  const visibleSegmentation = segmentations.filter(
    (stroke) => stroke.caseId === activeCaseId && stroke.plane === activePlane && stroke.slice === activeSlice,
  );
  const caseAnnotations = annotations.filter((point) => point.caseId === activeCaseId);
  const caseSegmentations = segmentations.filter((stroke) => stroke.caseId === activeCaseId);
  const selectedAnnotation = annotations.find((point) => point.id === selectedAnnotationId) ?? null;
  const selectedSegmentation = segmentations.find((stroke) => stroke.id === selectedSegmentationId) ?? null;
  const publicCaseLabel = volumeInfo?.fileName ?? "Anonymized MRI Case";
  const exportPayload = useMemo(() => ({
    caseId: publicCaseLabel,
    modality: "Uploaded NIfTI MRI",
    region: "User-uploaded volume",
    volume: volumeInfo ? { fileName: volumeInfo.fileName, dims: volumeInfo.dims } : null,
    status,
    notes: sanitizeDemoText(notes),
    annotationCount: caseAnnotations.length,
    segmentationStrokeCount: caseSegmentations.length,
    labels: summarizeLabels(caseAnnotations),
    segmentationLabels: summarizeSegmentation(caseSegmentations),
    annotations: caseAnnotations.map((point) => ({ ...point, caseId: publicCaseLabel })),
    segmentation: {
      representation: "brush-stroke mask overlay",
      strokes: caseSegmentations.map((stroke) => ({ ...stroke, caseId: publicCaseLabel })),
    },
    backendContract: {
      save: "POST /annotations/:caseId",
      load: "GET /annotations/:caseId",
      export: "GET /annotations/:caseId/export",
    },
  }), [caseAnnotations, caseSegmentations, notes, publicCaseLabel, status, volumeInfo]);

  useEffect(() => {
    if (!volumeInfo || !canvasRef.current) return;
    renderVolumeSlice(canvasRef.current, volumeInfo, activePlane, activeSlice);
  }, [activePlane, activeSlice, volumeInfo, view]);

  useEffect(() => { void fetchCases(); }, []);

  async function fetchCases() {
    setCasesLoading(true);
    setCasesError("");
    try {
      const data = await fetchCasesWithRetry();
      setSavedCases(data);
    } catch {
      setCasesError("Could not reach the annotation database. Please retry in a moment.");
    }
    finally { setCasesLoading(false); }
  }

  async function loadCase(c: SavedCase) {
    setSaveState("loading");
    setLoadingCaseId(c.id);
    try {
      const res = await fetch(`${API_BASE}/api/annotations/${c.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as {
        case: { status: Status; notes: string; volume_url: string | null; volume_file_name: string | null };
        annotations: AnnotationPoint[];
        segmentations: SegmentationStroke[];
      };
      setAnnotations(data.annotations.map((a) => ({ ...a, caseId: c.id })));
      setSegmentations(data.segmentations.map((s) => ({ ...s, caseId: c.id })));
      setStatus(data.case.status);
      setNotes(sanitizeDemoText(data.case.notes));
      if (data.case.volume_url && (!volumeInfo || volumeInfo.caseKey !== c.id)) {
        const niftiRes = await fetch(data.case.volume_url);
        if (niftiRes.ok) {
          const blob = await niftiRes.blob();
          const caseIndex = Math.max(0, savedCases.findIndex((item) => item.id === c.id));
          const file = new File([blob], `${anonymizedCaseLabel(caseIndex).toLowerCase().replaceAll(" ", "-")}.nii.gz`);
          const parsed = await parseNiftiFile(file);
          setVolumeInfo({ ...parsed, caseKey: c.id, fileName: anonymizedCaseLabel(caseIndex) });
          setActivePlane("axial");
          setSlice(Math.floor(getMaxSlice(parsed, "axial") / 2));
          resetViewport();
        }
      }
      void fetchVersions(c.id);
      setSaveState("loaded");
      setView("editor");
    } catch { setSaveState("error"); }
    finally { setLoadingCaseId(null); }
  }

  async function deleteCase(caseId: string) {
    try {
      await fetch(`${API_BASE}/api/annotations/${caseId}`, { method: "DELETE" });
      setSavedCases((prev) => prev.filter((c) => c.id !== caseId));
    } catch { /* non-fatal */ }
  }

  async function fetchVersions(caseId: string) {
    setVersionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/annotations/cases/${caseId}/versions`);
      if (res.ok) setVersions(await res.json() as AnnotationVersion[]);
    } catch { /* non-fatal */ }
    finally { setVersionsLoading(false); }
  }

  async function restoreVersion(versionId: number) {
    try {
      const res = await fetch(`${API_BASE}/api/annotations/cases/${activeCaseId}/versions/${versionId}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as AnnotationVersion & {
        annotations: AnnotationPoint[];
        segmentations: SegmentationStroke[];
      };
      setAnnotations((data.annotations ?? []).map((a) => ({ ...a, caseId: activeCaseId })));
      setSegmentations((data.segmentations ?? []).map((s) => ({ ...s, caseId: activeCaseId })));
      setStatus(data.status);
      setNotes(sanitizeDemoText(data.notes));
      setShowHistory(false);
      setSaveState("idle");
    } catch { setSaveState("error"); }
  }

  function startNewCase() {
    setAnnotations([]);
    setSegmentations([]);
    setSelectedAnnotationId(null);
    setSelectedSegmentationId(null);
    setVolumeInfo(null);
    volumeFileRef.current = null;
    setStatus("in-progress");
    setNotes("");
    setSaveState("idle");
    setLoadError("");
    setVersions([]);
    setShowHistory(false);
    resetViewport();
    setView("editor");
  }

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
  }, [view]);

  async function handleVolumeUpload(file: File | null) {
    if (!file) return;

    setLoadError("");

    try {
      const parsed = await parseNiftiFile(file);
      const caseKey = createAnonymizedCaseKey();
      const displayName = "Demo MRI Upload";
      const anonymizedFileName = `${caseKey}${niftiExtension(file.name)}`;
      volumeFileRef.current = new File([file], anonymizedFileName, { type: file.type });
      setVolumeInfo({ ...parsed, caseKey, fileName: displayName });
      setActivePlane("axial");
      setSlice(Math.floor(getMaxSlice(parsed, "axial") / 2));
      setStatus("in-progress");
      setNotes("Uploaded anonymized MRI volume. Annotate relevant slices and export ML-ready JSON.");
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

  function addSegmentationStroke(x: number, y: number, source: SegmentationStroke["source"] = "brush") {
    setSegmentations((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        caseId: activeCaseId,
        label,
        plane: activePlane,
        slice: activeSlice,
        x,
        y,
        radius: source === "region-grow" ? brushRadius + 11 : brushRadius,
        source,
      },
    ]);
    setSaveState("idle");
  }

  function handleViewportClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (dragging) return;
    if (workflowMode === "landmarks" && toolMode !== "paint") return;
    const point = eventToImagePoint(event);

    if (!point) return;
    if (workflowMode === "segmentation") {
      if (toolMode === "select") {
        setSelectedSegmentationId(findNearestSegmentationStroke(point.x, point.y)?.id ?? null);
        return;
      }

      if (toolMode === "erase") {
        eraseSegmentationAt(point.x, point.y);
        return;
      }

      if (toolMode === "move") return;

      addSegmentationStroke(Math.round(point.x), Math.round(point.y));
      return;
    }

    addBrushPoint(Math.round(point.x), Math.round(point.y));
  }

  function startDrag(event: React.MouseEvent<HTMLButtonElement>) {
    if (toolMode === "paint" || toolMode === "erase" || toolMode === "select") return;

    if (workflowMode === "landmarks" && toolMode === "move" && selectedAnnotation) {
      setMovingAnnotationId(selectedAnnotation.id);
      return;
    }

    if (workflowMode === "segmentation" && toolMode === "move" && selectedSegmentation) {
      setMovingSegmentationId(selectedSegmentation.id);
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

    if (movingSegmentationId) {
      const point = eventToImagePoint(event);
      if (!point) return;
      updateSegmentationStroke(movingSegmentationId, { x: Math.round(point.x), y: Math.round(point.y), slice: activeSlice });
      return;
    }

    if (!dragging) return;
    const { mx, my, px, py } = dragOrigin.current;
    setPan({ x: px + event.clientX - mx, y: py + event.clientY - my });
  }

  function stopDrag() {
    setDragging(false);
    setMovingAnnotationId(null);
    setMovingSegmentationId(null);
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

  function updateSegmentationStroke(id: string, patch: Partial<SegmentationStroke>) {
    setSegmentations((current) => current.map((stroke) => stroke.id === id ? { ...stroke, ...patch } : stroke));
    setSaveState("idle");
  }

  function findNearestSegmentationStroke(x: number, y: number) {
    return visibleSegmentation
      .map((stroke) => ({
        stroke,
        distance: Math.hypot(stroke.x - x, stroke.y - y),
      }))
      .filter(({ stroke, distance }) => distance <= Math.max(6, stroke.radius * 0.9))
      .sort((a, b) => a.distance - b.distance)[0]?.stroke ?? null;
  }

  function eraseSegmentationAt(x: number, y: number) {
    setSegmentations((current) => current.filter((stroke) => {
      if (stroke.caseId !== activeCaseId || stroke.plane !== activePlane || stroke.slice !== activeSlice) return true;
      const distance = Math.hypot(stroke.x - x, stroke.y - y);
      return distance > Math.max(brushRadius, stroke.radius * 0.75);
    }));
    if (selectedSegmentation && Math.hypot(selectedSegmentation.x - x, selectedSegmentation.y - y) <= brushRadius) {
      setSelectedSegmentationId(null);
    }
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

  function deleteSelectedSegmentationStroke() {
    if (!selectedSegmentationId) return;
    setSegmentations((current) => current.filter((stroke) => stroke.id !== selectedSegmentationId));
    setSelectedSegmentationId(null);
    setSaveState("idle");
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
    if (workflowMode === "segmentation") {
      const region = Array.from({ length: 18 }, (_, index) => ({
        id: `${Date.now()}-seg-${index}`,
        caseId: activeCaseId,
        label,
        plane: activePlane,
        slice: clamp(activeSlice + Math.floor(index / 6) - 1, 0, maxSlice),
        x: seedX + Math.round(Math.cos(index * 0.9) * (7 + (index % 3))),
        y: seedY + Math.round(Math.sin(index * 0.8) * (6 + (index % 4))),
        radius: brushRadius + 8,
        source: "region-grow" as const,
      }));

      setSegmentations((current) => [...current, ...region]);
      setSaveState("idle");
      return;
    }

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

  async function saveAnnotations() {
    setSaveState("saving");
    try {
      // Upload volume file to Supabase if we have the original file in memory
      if (volumeFileRef.current) {
        const form = new FormData();
        form.append("file", volumeFileRef.current);
        await fetch(`${API_BASE}/api/annotations/${activeCaseId}/volume`, { method: "POST", body: form }).catch(() => {
          // non-fatal — annotations still save even if volume upload fails
        });
      }

      const res = await fetch(`${API_BASE}/api/annotations/${activeCaseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annotations: caseAnnotations,
          segmentations: caseSegmentations,
          status,
          notes: sanitizeDemoText(notes),
          modality: "NIfTI MRI",
          region: volumeInfo?.fileName ?? "anonymized-demo-volume",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveState("saved");
      void fetchCases();
      void fetchVersions(activeCaseId);
      setTimeout(() => setView("list"), 1200);
    } catch {
      setSaveState("error");
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "anonymized-mri-annotation-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportSlicerMarkups() {
    const payload = buildSlicerMarkups(caseAnnotations, volumeInfo, publicCaseLabel);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "anonymized-mri-landmarks.mrk.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportSegmentationMask() {
    const payload = buildSegmentationLabelmapExport(caseSegmentations, volumeInfo, publicCaseLabel);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "anonymized-mri-segmentation-labelmap.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportSegmentationNifti() {
    const payload = buildSegmentationNiftiGz(caseSegmentations, volumeInfo);
    const blob = new Blob([toArrayBuffer(payload)], { type: "application/gzip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "anonymized-mri-segmentation-mask.nii.gz";
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetCase() {
    setAnnotations((current) => current.filter((point) => point.caseId !== activeCaseId));
    setSegmentations((current) => current.filter((stroke) => stroke.caseId !== activeCaseId));
    setSelectedAnnotationId(null);
    setSelectedSegmentationId(null);
    setSaveState("idle");
  }

  function clearActiveSegmentationSlice() {
    setSegmentations((current) => current.filter(
      (stroke) => !(stroke.caseId === activeCaseId && stroke.plane === activePlane && stroke.slice === activeSlice),
    ));
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

        {view === "list" ? (
          <div className="mt-8">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                {casesLoading ? "Loading…" : `${savedCases.length} saved case${savedCases.length !== 1 ? "s" : ""}`}
              </p>
              <button
                type="button"
                onClick={startNewCase}
                className="inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
              >
                <Plus size={16} /> Add MRI
              </button>
            </div>

            {casesLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0b1014]/70 px-5 py-4 animate-pulse">
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 rounded-full bg-white/[0.06]" />
                      <div className="h-2.5 w-1/3 rounded-full bg-white/[0.04]" />
                    </div>
                    <div className="h-5 w-20 rounded-full bg-white/[0.06]" />
                    <div className="h-8 w-16 rounded-full bg-white/[0.06]" />
                    <div className="h-8 w-16 rounded-full bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            )}

            {!casesLoading && casesError && (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-red-300/20 bg-red-300/5 py-20 text-center">
                <Database size={40} className="mb-4 text-red-200" />
                <p className="text-lg font-semibold text-red-100">Database is waking up</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">{casesError}</p>
                <button
                  type="button"
                  onClick={() => { void fetchCases(); }}
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-teal-300/40 px-5 py-2.5 text-sm font-semibold text-teal-200 transition hover:bg-teal-300/10"
                >
                  <RotateCcw size={15} /> Retry loading cases
                </button>
              </div>
            )}

            {!casesLoading && !casesError && savedCases.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.08] py-28 text-center">
                <Brain size={44} className="mb-4 text-zinc-700" />
                <p className="text-lg font-semibold text-zinc-400">No saved cases yet</p>
                <p className="mt-2 text-sm text-zinc-600">Upload a NIfTI volume, annotate it, and save to Postgres.</p>
                <button
                  type="button"
                  onClick={startNewCase}
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-teal-300/40 px-5 py-2.5 text-sm font-semibold text-teal-200 transition hover:bg-teal-300/10"
                >
                  <Plus size={15} /> Add your first MRI
                </button>
              </div>
            )}

            <div className="space-y-3">
              {savedCases.map((c, index) => (
                <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0b1014]/70 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{anonymizedCaseLabel(index)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>{new Date(c.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span>·</span>
                      <span>{c.landmark_count} landmarks</span>
                      <span>{c.stroke_count} strokes</span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    c.status === "complete"
                      ? "border-teal-300/30 bg-teal-300/10 text-teal-200"
                      : c.status === "in-progress"
                        ? "border-yellow-300/30 bg-yellow-300/10 text-yellow-200"
                        : "border-white/10 text-zinc-400"
                  }`}>
                    {c.status}
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => { void loadCase(c); }}
                      disabled={loadingCaseId === c.id}
                      className="inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-2 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200 disabled:opacity-70"
                    >
                      {loadingCaseId === c.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      {loadingCaseId === c.id ? "Opening…" : "Open"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { void deleteCase(c.id); }}
                      className="rounded-full border border-red-300/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-300/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setView("list")}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 transition hover:border-teal-300/40 hover:text-teal-100"
            >
              <ArrowLeft size={15} /> Back to cases
            </button>
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
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
                  <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Workflow</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["landmarks", "segmentation"] as WorkflowMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setWorkflowMode(mode);
                          setToolMode("paint");
                          setSelectedAnnotationId(null);
                          setSelectedSegmentationId(null);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                          workflowMode === mode
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
                  <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
                    {workflowMode === "segmentation" ? "Segmentation mode" : "Landmark mode"}
                  </p>
                  <div className={`grid gap-2 ${workflowMode === "segmentation" ? "grid-cols-4" : "grid-cols-3"}`}>
                    {(workflowMode === "segmentation"
                      ? (["paint", "erase", "select", "move"] as ToolMode[])
                      : (["paint", "select", "move"] as ToolMode[])
                    ).map((mode) => (
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
                    <span>{workflowMode === "segmentation" ? "Mask brush radius" : "Brush radius"}</span>
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

                {workflowMode === "segmentation" && (
                  <div>
                    <div className="mb-2 flex justify-between text-xs uppercase tracking-wider text-zinc-500">
                      <span>Mask opacity</span>
                      <span>{Math.round(segmentationOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.75"
                      step="0.05"
                      value={segmentationOpacity}
                      onChange={(event) => setSegmentationOpacity(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={runRegionGrow}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal-300 px-4 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
                >
                  <Sparkles size={15} /> {workflowMode === "segmentation" ? "3D region grow seed" : "Region grow seed"}
                </button>

                {workflowMode === "segmentation" && visibleSegmentation.length > 0 && (
                  <button
                    type="button"
                    onClick={clearActiveSegmentationSlice}
                    className="w-full rounded-full border border-red-300/20 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-300/10"
                  >
                    Clear current mask slice
                  </button>
                )}
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

            <Panel title="Segmentation Mask">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 py-3">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Active slice</p>
                  <p className="mt-1 font-semibold text-white">{visibleSegmentation.length} strokes</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 py-3">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Volume mask</p>
                  <p className="mt-1 font-semibold text-white">{caseSegmentations.length} strokes</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs text-zinc-400">
                {(Object.keys(LABEL_STYLES) as Label[]).map((item) => {
                  const count = caseSegmentations.filter((stroke) => stroke.label === item).length;
                  return (
                    <div key={item} className="flex items-center justify-between rounded-full border border-white/[0.08] px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: LABEL_STYLES[item].color }}
                        />
                        {LABEL_STYLES[item].name}
                      </span>
                  <span>{count}</span>
                </div>
                  );
                })}
              </div>
              {selectedSegmentation && (
                <div className="mt-4 space-y-4 rounded-2xl border border-teal-300/20 bg-teal-300/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-100">Selected stroke</p>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Label</p>
                    <select
                      value={selectedSegmentation.label}
                      onChange={(event) => updateSegmentationStroke(selectedSegmentation.id, { label: event.target.value as Label })}
                      className="w-full rounded-2xl border border-white/[0.08] bg-[#0b1014] px-3 py-2 text-sm text-white outline-none focus:border-teal-300/50"
                    >
                      <option value="lesion">Lesion</option>
                      <option value="organ">Organ</option>
                      <option value="exclude">Exclude</option>
                    </select>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-xs uppercase tracking-wider text-zinc-500">
                      <span>Radius</span>
                      <span>{selectedSegmentation.radius}px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="42"
                      value={selectedSegmentation.radius}
                      onChange={(event) => updateSegmentationStroke(selectedSegmentation.id, { radius: Number(event.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                    <span>X {selectedSegmentation.x}</span>
                    <span>Y {selectedSegmentation.y}</span>
                    <span>Slice {selectedSegmentation.slice}</span>
                    <span>{selectedSegmentation.source}</span>
                  </div>

                  <button
                    type="button"
                    onClick={deleteSelectedSegmentationStroke}
                    className="w-full rounded-full border border-red-300/20 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-300/10"
                  >
                    Delete mask stroke
                  </button>
                </div>
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
                  {workflowMode === "segmentation"
                    ? toolMode === "paint" ? "Click to paint segmentation mask" : toolMode === "erase" ? "Click to erase mask" : toolMode === "select" ? "Click mask stroke to select" : "Drag selected mask stroke"
                    : toolMode === "paint" ? "Click to paint" : toolMode === "select" ? "Click a landmark to select" : "Drag selected landmark"}
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
                    toolMode === "paint" || toolMode === "erase"
                      ? "cursor-crosshair"
                      : toolMode === "move" && (selectedAnnotation || selectedSegmentation)
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
	                    {visibleSegmentation.map((stroke) => {
                        const strokeColor = LABEL_STYLES[stroke.label].color;
                        const viewportPosition = imagePointToViewportPosition(stroke, viewportSize, volumeInfo, activePlane);
                        const selected = stroke.id === selectedSegmentationId;

                        return (
                          <div
                            key={stroke.id}
                            className={`pointer-events-none absolute z-10 rounded-full blur-[1px] ${
                              selected ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""
                            }`}
                            style={{
                              left: viewportPosition.left - stroke.radius,
                              top: viewportPosition.top - stroke.radius,
                              width: stroke.radius * 2,
                              height: stroke.radius * 2,
                              backgroundColor: hexToRgba(strokeColor, segmentationOpacity),
                              boxShadow: `0 0 ${stroke.radius * 1.8}px ${hexToRgba(strokeColor, segmentationOpacity * 0.7)}`,
                            }}
                          />
                        );
                      })}
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
                      {visibleSegmentation.length > 0 && (
                        <span className="text-teal-200">Â· {visibleSegmentation.length} mask strokes</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {caseAnnotations.length} landmarks Â· {caseSegmentations.length} mask strokes
                    </div>
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
                    <ActionButton icon={Save} label="Save to database" onClick={() => { void saveAnnotations(); }} loading={saveState === "saving"} />
                    <ActionButton
                      icon={Clock}
                      label={showHistory ? "Hide history" : `History${versions.length ? ` (${versions.length})` : ""}`}
                      onClick={() => setShowHistory((prev) => !prev)}
                    />
                    <ActionButton icon={Download} label="Export JSON" onClick={exportJson} />
                    <ActionButton icon={Download} label="Export Slicer .mrk.json" onClick={exportSlicerMarkups} />
                    <ActionButton icon={Download} label="Export Segmentation Mask" onClick={exportSegmentationMask} />
                    <ActionButton icon={Download} label="Export Segmentation .nii.gz" onClick={exportSegmentationNifti} />
                    <ActionButton icon={RotateCcw} label="Clear case" onClick={resetCase} muted />
                  </div>

                  {showHistory && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Annotation history</p>
                        {versionsLoading && <Loader2 size={13} className="animate-spin text-zinc-500" />}
                      </div>
                      {versions.length === 0 && !versionsLoading && (
                        <p className="px-4 py-3 text-xs text-zinc-600">No saved versions yet.</p>
                      )}
                      <div className="divide-y divide-white/[0.04]">
                        {versions.map((v) => (
                          <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-teal-300">v{v.version_number}</span>
                                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                                  v.status === "complete"
                                    ? "border-teal-300/30 text-teal-300"
                                    : v.status === "in-progress"
                                      ? "border-yellow-300/30 text-yellow-300"
                                      : "border-white/10 text-zinc-500"
                                }`}>{v.status}</span>
                              </div>
                              <p className="mt-0.5 text-[10px] text-zinc-500">
                                {new Date(v.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                {" · "}{v.annotation_count} marks · {v.segmentation_count} strokes
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { void restoreVersion(v.id); }}
                              className="shrink-0 rounded-full border border-teal-300/30 px-3 py-1 text-[10px] font-semibold text-teal-200 transition hover:bg-teal-300/10"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {saveState !== "idle" && (
                    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                      saveState === "error"
                        ? "border-red-300/20 bg-red-300/10 text-red-100"
                        : "border-teal-300/20 bg-teal-300/10 text-teal-100"
                    }`}>
                      <CheckCircle2 size={16} />
                      {saveState === "saving" && "Saving to database…"}
                      {saveState === "saved" && "Saved to Postgres."}
                      {saveState === "loading" && "Loading from database…"}
                      {saveState === "loaded" && "Loaded from database."}
                      {saveState === "error" && "Backend unreachable — check NEXT_PUBLIC_ANNOTATION_API_URL."}
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
          </div>
        )}
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

function ActionButton({ icon: Icon, label, onClick, muted = false, loading = false }: { icon: IconComponent; label: string; onClick: () => void; muted?: boolean; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
        muted
          ? "border border-white/[0.1] text-zinc-400 hover:border-red-300/30 hover:text-red-100"
          : "border border-white/[0.1] text-zinc-200 hover:border-teal-300/50 hover:text-teal-100"
      }`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
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

function summarizeSegmentation(strokes: SegmentationStroke[]) {
  return strokes.reduce<Record<Label, number>>(
    (summary, stroke) => {
      summary[stroke.label] += 1;
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
  point: Pick<AnnotationPoint, "x" | "y">,
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

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
    pixDims: header.pixDims,
    affine: header.affine,
    fileName: "Anonymized MRI Volume",
    caseKey: createAnonymizedCaseKey(),
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

function buildSegmentationLabelmapExport(strokes: SegmentationStroke[], volume: VolumeInfo | null, caseId: string) {
  const { dims, mask } = buildSegmentationMask(strokes, volume);
  const sourceStrokes = strokes.map((stroke) => ({ ...stroke, caseId }));

  return {
    format: "saad-medical-annotation-segmentation-labelmap-v1",
    caseId,
    sourceVolume: volume?.fileName ?? "demo-volume",
    dimensions: dims,
    dataType: "uint8",
    storageOrder: "x-fastest",
    coordinateSystem: "NIFTI voxel indices with source affine",
    affine: volume?.affine ?? identityAffine(),
    labels: {
      0: { name: "background", color: "#000000" },
      1: { name: "lesion", color: LABEL_STYLES.lesion.color },
      2: { name: "organ", color: LABEL_STYLES.organ.color },
      3: { name: "exclude", color: LABEL_STYLES.exclude.color },
    },
    sourceStrokes,
    voxelCount: countNonZero(mask),
    encoding: {
      type: "run-length",
      description: "Flat uint8 labelmap compressed as [labelValue, runLength] pairs.",
      runs: rleEncode(mask),
    },
  };
}

function buildSegmentationNiftiGz(strokes: SegmentationStroke[], volume: VolumeInfo | null) {
  const { dims, mask } = buildSegmentationMask(strokes, volume);
  const [xDim, yDim, zDim] = dims;
  const header = new nifti.NIFTI1();

  header.littleEndian = true;
  header.dims = [3, xDim, yDim, zDim, 1, 1, 1, 1];
  header.pixDims = normalizePixDims(volume?.pixDims);
  header.datatypeCode = nifti.NIFTI1.TYPE_UINT8;
  header.numBitsPerVoxel = 8;
  header.vox_offset = 352;
  header.scl_slope = 1;
  header.scl_inter = 0;
  header.xyzt_units = nifti.NIFTI1.UNITS_MM;
  header.cal_min = 0;
  header.cal_max = 3;
  header.slice_start = 0;
  header.slice_end = zDim - 1;
  header.qform_code = 0;
  header.sform_code = nifti.NIFTI1.XFORM_SCANNER_ANAT;
  header.affine = volume?.affine ?? identityAffine();
  header.description = "Segmentation mask exported from Saad Ahmad medical annotation demo";
  header.intent_name = "SEGMENTATION";
  header.magic = "n+1\0";

  const headerBytes = new Uint8Array(header.toArrayBuffer());
  const niftiBytes = new Uint8Array(headerBytes.length + mask.length);
  niftiBytes.set(headerBytes, 0);
  niftiBytes.set(mask, headerBytes.length);

  return gzipSync(niftiBytes);
}

function buildSegmentationMask(strokes: SegmentationStroke[], volume: Pick<VolumeInfo, "dims"> | null) {
  const dims = volume?.dims ?? [100, 100, 100] as [number, number, number];
  const [xDim, yDim, zDim] = dims;
  const mask = new Uint8Array(xDim * yDim * zDim);
  const labelValues: Record<Label, number> = { lesion: 1, organ: 2, exclude: 3 };

  strokes.forEach((stroke) => {
    paintStrokeIntoMask(mask, dims, stroke, labelValues[stroke.label]);
  });

  return { dims, mask };
}

function paintStrokeIntoMask(mask: Uint8Array, dims: [number, number, number], stroke: SegmentationStroke, labelValue: number) {
  const [xDim, yDim, zDim] = dims;
  const [cx, cy, cz] = annotationToVoxel(stroke, { dims });
  const radius = Math.max(1, Math.round(stroke.radius));

  const setVoxel = (x: number, y: number, z: number) => {
    if (x < 0 || x >= xDim || y < 0 || y >= yDim || z < 0 || z >= zDim) return;
    mask[Math.round(x) + Math.round(y) * xDim + Math.round(z) * xDim * yDim] = labelValue;
  };

  for (let row = -radius; row <= radius; row++) {
    for (let col = -radius; col <= radius; col++) {
      if (col * col + row * row > radius * radius) continue;

      if (stroke.plane === "axial") {
        setVoxel(Math.round(cx + col), Math.round(cy + row), Math.round(cz));
      }

      if (stroke.plane === "coronal") {
        setVoxel(Math.round(cx + col), Math.round(cy), Math.round(cz + row));
      }

      if (stroke.plane === "sagittal") {
        setVoxel(Math.round(cx), Math.round(cy + col), Math.round(cz + row));
      }
    }
  }
}

function normalizePixDims(pixDims?: number[]) {
  return [
    pixDims?.[0] || 1,
    pixDims?.[1] || 1,
    pixDims?.[2] || 1,
    pixDims?.[3] || 1,
    pixDims?.[4] || 1,
    pixDims?.[5] || 1,
    pixDims?.[6] || 1,
    pixDims?.[7] || 1,
  ];
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function rleEncode(mask: Uint8Array) {
  if (mask.length === 0) return [];

  const runs: [number, number][] = [];
  let current = mask[0];
  let length = 1;

  for (let index = 1; index < mask.length; index++) {
    if (mask[index] === current) {
      length += 1;
    } else {
      runs.push([current, length]);
      current = mask[index];
      length = 1;
    }
  }

  runs.push([current, length]);
  return runs;
}

function countNonZero(mask: Uint8Array) {
  let count = 0;
  mask.forEach((value) => {
    if (value !== 0) count += 1;
  });
  return count;
}

function annotationToVoxel(
  point: Pick<AnnotationPoint, "plane" | "slice" | "x" | "y">,
  volume: Pick<VolumeInfo, "dims"> | null,
): [number, number, number] {
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
