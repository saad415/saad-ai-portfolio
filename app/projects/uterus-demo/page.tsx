"use client";

import { useState } from "react";
import { Brain, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import UterusViewer, { LpsLandmark } from "@/components/UterusViewer";

const EXAMPLES = [
  {
    id: "case_c",
    label: "Case C",
    description: "Standard pelvic MRI",
    volumeUrl:    "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-c/case-c-volume.nii.gz",
    landmarksUrl: "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-c/case-c-predicted-landmarks.mrk.json",
  },
  {
    id: "case_d",
    label: "Case D",
    description: "Standard pelvic MRI",
    volumeUrl:    "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-d/case-d-volume.nii.gz",
    landmarksUrl: "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-d/case-d-predicted-landmarks.mrk.json",
  },
  {
    id: "case_e",
    label: "Case E",
    description: "Standard pelvic MRI",
    volumeUrl:    "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-e/case-e-volume.nii.gz",
    landmarksUrl: "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-e/case-e-predicted-landmarks.mrk.json",
  },
] as const;

type Phase = "idle" | "loading" | "done" | "error";

function parseMrkJson(data: unknown): LpsLandmark[] {
  const markups = (data as { markups: { controlPoints: { label: string; position: [number, number, number] }[] }[] }).markups;
  return markups[0].controlPoints.map((cp) => ({
    label: cp.label,
    lps: cp.position,
  }));
}

export default function UterusDemoPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [volumeFile, setVolumeFile] = useState<File | null>(null);
  const [lpsLandmarks, setLpsLandmarks] = useState<LpsLandmark[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const loadExample = async (ex: (typeof EXAMPLES)[number]) => {
    setSelectedId(ex.id);
    setPhase("loading");
    setVolumeFile(null);
    setLpsLandmarks([]);
    setErrorMsg("");

    try {
      const [volRes, lmRes] = await Promise.all([
        fetch(ex.volumeUrl),
        fetch(ex.landmarksUrl),
      ]);

      if (!volRes.ok) throw new Error(`Volume fetch failed: ${volRes.status}`);
      if (!lmRes.ok) throw new Error(`Landmarks fetch failed: ${lmRes.status}`);

      const [volBlob, lmJson] = await Promise.all([volRes.blob(), lmRes.json()]);

      setVolumeFile(new File([volBlob], `${ex.id}.nii.gz`, { type: "application/octet-stream" }));
      setLpsLandmarks(parseMrkJson(lmJson));
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setPhase("error");
    }
  };

  const LANDMARK_COLORS: Record<string, string> = {
    "APD-1":         "#4ade80",
    "APD-2":         "#4ade80",
    "Fundus_Outer":  "#60a5fa",
    "Cavity_Cervix": "#f472b6",
    "Inner_OS":      "#facc15",
    "Cavity_Fundus": "#c084fc",
  };

  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl">
        {/* Header */}
        <p className="text-sm uppercase tracking-[0.35em] text-pink-400">
          Interactive AI Demo
        </p>
        <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-tight">
          Uterine Landmark Detection from Pelvic MRI
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          Select an anonymized example case to visualize the six anatomical
          landmarks predicted by the model — APD endpoints, fundus, internal os,
          and cervical cavity — overlaid on the sagittal MRI volume.
        </p>

        {/* Disclaimer */}
        <div className="mt-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <div className="flex gap-3">
            <ShieldAlert className="flex-shrink-0 text-yellow-400" />
            <p className="text-sm leading-6 text-yellow-100">
              All example cases are fully anonymized research data. Landmarks shown are real model predictions from the trained network.
            </p>
          </div>
        </div>

        {/* Example selector */}
        <div className="mt-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
            Choose an example case
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {EXAMPLES.map((ex) => {
              const isActive = selectedId === ex.id;
              return (
                <button
                  key={ex.id}
                  onClick={() => loadExample(ex)}
                  disabled={phase === "loading"}
                  className={`group relative rounded-2xl border p-6 text-left transition ${
                    isActive
                      ? "border-pink-400 bg-pink-400/10"
                      : "border-white/10 bg-white/[0.02] hover:border-pink-400/50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <p className="text-lg font-bold text-white">{ex.label}</p>
                  <p className="mt-1 text-sm text-gray-400">{ex.description}</p>
                  {isActive && phase === "loading" && (
                    <Loader2 className="absolute right-4 top-4 animate-spin text-pink-400" size={18} />
                  )}
                  {isActive && phase === "done" && (
                    <CheckCircle2 className="absolute right-4 top-4 text-pink-400" size={18} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {phase === "loading" && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-pink-400/20 bg-pink-400/5 px-5 py-4">
            <Loader2 className="animate-spin text-pink-400" size={18} />
            <span className="text-sm text-pink-300">Fetching MRI volume and landmarks...</span>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Main content */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Viewer */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="mb-4 text-xl font-semibold">Sagittal Volume Viewer</h2>
            <UterusViewer file={volumeFile} lpsLandmarks={lpsLandmarks} />
          </div>

          {/* Results panel */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="mb-6 text-xl font-semibold">Predicted Landmarks</h2>

            {phase === "idle" && (
              <div className="flex h-48 items-center justify-center text-sm text-gray-600">
                Select a case to view results.
              </div>
            )}

            {phase === "loading" && (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="animate-spin text-pink-400" size={32} />
              </div>
            )}

            {phase === "done" && lpsLandmarks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="text-pink-400" size={18} />
                  <span className="text-sm text-gray-300">
                    {lpsLandmarks.length} landmarks · real model output
                  </span>
                </div>

                <div className="space-y-2">
                  {lpsLandmarks.map((lm) => (
                    <div
                      key={lm.label}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full ring-2 ring-black/50"
                        style={{ backgroundColor: LANDMARK_COLORS[lm.label] ?? "#fff" }}
                      />
                      <span className="flex-1 text-sm font-medium text-white">{lm.label}</span>
                      <span className="font-mono text-xs text-gray-500">
                        [{lm.lps.map((v) => v.toFixed(1)).join(", ")}]
                      </span>
                    </div>
                  ))}
                </div>

                <p className="pt-2 text-xs text-gray-600">
                  LPS world coordinates (mm) · 3D Slicer compatible
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Model overview */}
        <div className="mt-16 rounded-3xl border border-white/10 bg-white/[0.03] p-10">
          <h2 className="mb-6 text-2xl font-bold">Model Architecture</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-pink-400/20 bg-pink-400/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-pink-400">
                Model 1 — TwoHead UNet
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                Predicts <strong className="text-white">APD-1</strong>,{" "}
                <strong className="text-white">APD-2</strong>, and{" "}
                <strong className="text-white">Fundus Outer</strong> via a shared
                3D encoder with two independent decoder heads.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
                Model 2 — ThreeHead UNet
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                Predicts <strong className="text-white">Cavity Cervix</strong>,{" "}
                <strong className="text-white">Inner OS</strong>, and{" "}
                <strong className="text-white">Cavity Fundus</strong> with three
                dedicated decoder branches from one shared encoder.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              Pipeline
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-300">
              {[
                "T2 MRI + Uterus mask",
                "Isotropic resampling (1 mm³)",
                "ROI crop",
                "Canonical orientation",
                "Resize to 96³",
                "Dual-model inference",
                "Heatmap peak extraction",
                "6 LPS landmarks",
              ].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="rounded-full bg-white/5 px-3 py-1">{step}</span>
                  {i < arr.length - 1 && <span className="text-gray-600">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
