"use client";

import { useState } from "react";
import { Brain, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import UterusViewer, { UterusLandmark } from "@/components/UterusViewer";

// ── TODO: Upload your 3 MRI pairs to Vercel Blob and paste the URLs here ────
const EXAMPLES = [
  {
    id: "case_c",
    label: "Case C",
    description: "Standard pelvic MRI",
    volumeUrl: "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-c/case-c-volume.nii.gz",
    segUrl:    "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-c/case-c-segmentation.nii.gz",
  },
  {
    id: "case_d",
    label: "Case D",
    description: "Standard pelvic MRI",
    volumeUrl: "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-d/case-d-volume.nii.gz",
    segUrl:    "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-d/case-d-segmentation.nii.gz",
  },
  {
    id: "case_e",
    label: "Case E",
    description: "Standard pelvic MRI",
    volumeUrl: "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-e/case-e-volume.nii.gz",
    segUrl:    "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-e/case-e-segmentation.nii.gz",
  },
] as const;

type Phase = "idle" | "fetching" | "inferring" | "done" | "error";

export default function UterusDemoPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [volumeFile, setVolumeFile] = useState<File | null>(null);
  const [landmarks, setLandmarks] = useState<UterusLandmark[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const runExample = async (ex: (typeof EXAMPLES)[number]) => {
    if (!ex.volumeUrl || !ex.segUrl) {
      setErrorMsg("Example files not yet uploaded. Add Vercel Blob URLs to EXAMPLES in page.tsx.");
      setPhase("error");
      setSelectedId(ex.id);
      return;
    }

    setSelectedId(ex.id);
    setLandmarks([]);
    setVolumeFile(null);
    setErrorMsg("");
    setPhase("fetching");

    try {
      // Fetch both files in parallel
      const [volRes, segRes] = await Promise.all([
        fetch(ex.volumeUrl),
        fetch(ex.segUrl),
      ]);

      if (!volRes.ok || !segRes.ok) throw new Error("Failed to fetch example files.");

      const [volBlob, segBlob] = await Promise.all([volRes.blob(), segRes.blob()]);
      const volFile = new File([volBlob], `${ex.id}_volume.nii.gz`, { type: "application/octet-stream" });
      const segFile = new File([segBlob], `${ex.id}_seg.nii.gz`, { type: "application/octet-stream" });

      // Show the volume immediately while inference runs
      setVolumeFile(volFile);
      setPhase("inferring");

      const form = new FormData();
      form.append("volume", volFile);
      form.append("segmentation", segFile);

      const res = await fetch("http://127.0.0.1:8000/api/uterus/predict", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setLandmarks(data.landmarks ?? []);
      setIsMock(data.mock ?? false);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setPhase("error");
    }
  };

  const statusLabel: Record<Phase, string> = {
    idle: "",
    fetching: "Fetching MRI files...",
    inferring: "Running landmark detection...",
    done: "Detection complete",
    error: "",
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
          Select an anonymized example case. The model detects six anatomical
          landmarks — APD endpoints, fundus, internal os, and cervical cavity —
          from a 3D T2-weighted pelvic MRI volume.
        </p>

        {/* Disclaimer */}
        <div className="mt-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <div className="flex gap-3">
            <ShieldAlert className="flex-shrink-0 text-yellow-400" />
            <p className="text-sm leading-6 text-yellow-100">
              All example cases are fully anonymized research data. No patient
              identifiers are present.
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
                  onClick={() => runExample(ex)}
                  disabled={phase === "fetching" || phase === "inferring"}
                  className={`group relative rounded-2xl border p-6 text-left transition ${
                    isActive
                      ? "border-pink-400 bg-pink-400/10"
                      : "border-white/10 bg-white/[0.02] hover:border-pink-400/50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <p className="text-lg font-bold text-white">{ex.label}</p>
                  <p className="mt-1 text-sm text-gray-400">{ex.description}</p>
                  {isActive && phase === "inferring" && (
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

        {/* Status bar */}
        {(phase === "fetching" || phase === "inferring") && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-pink-400/20 bg-pink-400/5 px-5 py-4">
            <Loader2 className="animate-spin text-pink-400" size={18} />
            <span className="text-sm text-pink-300">{statusLabel[phase]}</span>
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Sagittal Volume Viewer</h2>
              {phase === "done" && isMock && (
                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300">
                  Demo mode — model weights not loaded
                </span>
              )}
            </div>
            <UterusViewer file={volumeFile} landmarks={landmarks} />
          </div>

          {/* Results panel */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="mb-6 text-xl font-semibold">Detected Landmarks</h2>

            {phase === "idle" && (
              <div className="flex h-48 items-center justify-center text-sm text-gray-600">
                Select a case to run detection.
              </div>
            )}

            {(phase === "fetching" || phase === "inferring") && (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="animate-spin text-pink-400" size={32} />
              </div>
            )}

            {phase === "done" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="text-pink-400" size={18} />
                  <span className="text-sm text-gray-300">
                    {landmarks.length} landmarks detected
                  </span>
                </div>

                <div className="space-y-2">
                  {landmarks.map((lm) => (
                    <div
                      key={lm.label}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full ring-2 ring-black/50"
                        style={{
                          backgroundColor:
                            { "APD-1": "#4ade80", "APD-2": "#4ade80", "Fundus_Outer": "#60a5fa",
                              "Cavity_Cervix": "#f472b6", "Inner_OS": "#facc15", "Cavity_Fundus": "#c084fc" }
                            [lm.label] ?? "#fff",
                        }}
                      />
                      <span className="flex-1 text-sm font-medium text-white">{lm.label}</span>
                      <span className="font-mono text-xs text-gray-500">
                        [{lm.voxel.join(", ")}]
                      </span>
                      {lm.confidence !== null && (
                        <span className="text-xs text-gray-400">
                          {(lm.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <p className="pt-2 text-xs text-gray-600">
                  Voxel coordinates in original image space.
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
