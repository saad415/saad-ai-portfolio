"use client";

import { useState } from "react";
import { Brain, CheckCircle2, FileJson, Loader2, ShieldAlert } from "lucide-react";
import NiftiViewer from "@/components/NiftiViewer";
import Navbar from "@/components/Navbar";

const SAMPLE_CASES = [
  {
    id: "case_f",
    label: "Case A",
    description: "Mixed visibility",
    volumeUrl:
      "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-f-volume.nii.gz",
    landmarksUrl:
      "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-f-predicted-landmarks.json",
  },
  {
    id: "case_g",
    label: "Case B",
    description: "Sacral-only coverage",
    volumeUrl:
      "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-g-volume.nii.gz",
    landmarksUrl:
      "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-g-predicted-landmarks.json",
  },
  {
    id: "case_h",
    label: "Case C",
    description: "Full spine visibility",
    volumeUrl:
      "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-h-volume.nii.gz",
    landmarksUrl:
      "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-h-predicted-landmarks.json",
  },
] as const;

type Landmark = {
  label: string;
  voxel: [number, number, number];
  confidence: number;
  type: string;
  region?: string;
};

type PredictionResult = {
  status: string;
  filename: string;
  s1Detected: boolean;
  landmarks: Landmark[];
};

type Phase = "idle" | "loading" | "done" | "error";

const LANDMARK_COLORS: Record<string, string> = {
  T12: "#22d3ee",
  L1: "#60a5fa",
  L2: "#38bdf8",
  L3: "#4ade80",
  L4: "#86efac",
  L5: "#a3e635",
  S1: "#facc15",
  S2: "#fb923c",
  S3: "#f472b6",
  S4: "#c084fc",
  S5: "#f87171",
};

export default function SpineDemoPage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [volumeFile, setVolumeFile] = useState<File | null>(null);
  const [predictionResult, setPredictionResult] =
    useState<PredictionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadSampleCase = async (sample: (typeof SAMPLE_CASES)[number]) => {
    setSelectedSampleId(sample.id);
    setPhase("loading");
    setVolumeFile(null);
    setPredictionResult(null);
    setErrorMsg("");

    try {
      const [volumeResponse, landmarksResponse] = await Promise.all([
        fetch(sample.volumeUrl),
        fetch(sample.landmarksUrl),
      ]);

      if (!volumeResponse.ok) {
        throw new Error(`Volume fetch failed: ${volumeResponse.status}`);
      }

      if (!landmarksResponse.ok) {
        throw new Error(`Landmarks fetch failed: ${landmarksResponse.status}`);
      }

      const [volumeBlob, predictionJson] = await Promise.all([
        volumeResponse.blob(),
        landmarksResponse.json() as Promise<PredictionResult>,
      ]);

      setVolumeFile(
        new File([volumeBlob], `${sample.id}.nii.gz`, {
          type: "application/gzip",
        })
      );
      setPredictionResult(predictionJson);
      setPhase("done");
    } catch (error) {
      setSelectedSampleId(null);
      setErrorMsg(
        error instanceof Error ? error.message : "Could not load sample case."
      );
      setPhase("error");
    }
  };

  return (
    <main className="min-h-screen bg-transparent px-6 py-24 text-white">
      <Navbar />
      <section className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.35em] text-green-400">
          Interactive AI Demo
        </p>

        <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-tight">
          Sacral Spine Landmark Detection from NIfTI MRI Volumes
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          Select an anonymized example case to visualize vertebral landmarks
          predicted by the trained 3D U-Net model.
        </p>

        <div className="mt-10 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <div className="flex gap-3">
            <ShieldAlert className="flex-shrink-0 text-yellow-400" />
            <p className="text-sm leading-6 text-yellow-100">
              All example cases are fully anonymized research data. Landmarks
              shown are real model predictions from the trained network.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
            Choose an example case
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {SAMPLE_CASES.map((sample) => {
              const isActive = selectedSampleId === sample.id;
              const isLoading = isActive && phase === "loading";
              const isDone = isActive && phase === "done";

              return (
                <button
                  key={sample.id}
                  onClick={() => loadSampleCase(sample)}
                  disabled={phase === "loading"}
                  className={`group relative rounded-2xl border p-6 text-left transition ${
                    isActive
                      ? "border-green-400 bg-green-400/10"
                      : "border-white/10 bg-white/[0.02] hover:border-green-400/50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <p className="text-lg font-bold text-white">
                    {sample.label}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {sample.description}
                  </p>
                  {isLoading && (
                    <Loader2
                      className="absolute right-4 top-4 animate-spin text-green-400"
                      size={18}
                    />
                  )}
                  {isDone && (
                    <CheckCircle2
                      className="absolute right-4 top-4 text-green-400"
                      size={18}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {phase === "loading" && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-green-400/20 bg-green-400/5 px-5 py-4">
            <Loader2 className="animate-spin text-green-400" size={18} />
            <span className="text-sm text-green-300">
              Fetching MRI volume and predicted landmarks...
            </span>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="flex items-center gap-3">
              <FileJson className="text-green-400" />
              <h2 className="text-2xl font-semibold">Sagittal Volume Viewer</h2>
            </div>

            {phase === "idle" ? (
              <div className="mt-8 flex h-80 items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-6 text-center text-gray-500">
                Select an example to load the MRI viewer.
              </div>
            ) : (
              <NiftiViewer
                file={volumeFile}
                landmarks={predictionResult?.landmarks || []}
              />
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="mb-6 text-2xl font-semibold">
              Predicted Landmarks
            </h2>

            {phase === "idle" && (
              <div className="flex h-48 items-center justify-center text-sm text-gray-600">
                Select a case to view results.
              </div>
            )}

            {phase === "loading" && (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="animate-spin text-green-400" size={32} />
              </div>
            )}

            {phase === "done" && predictionResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="text-green-400" size={18} />
                  <span className="text-sm text-gray-300">
                    {predictionResult.landmarks.length} landmarks | S1{" "}
                    {predictionResult.s1Detected ? "detected" : "not detected"}{" "}
                    | real model output
                  </span>
                </div>

                <div className="space-y-2">
                  {predictionResult.landmarks.map((landmark) => (
                    <div
                      key={`${landmark.label}-${landmark.voxel.join("-")}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full ring-2 ring-black/50"
                        style={{
                          backgroundColor:
                            LANDMARK_COLORS[landmark.label] ?? "#22c55e",
                        }}
                      />
                      <span className="flex-1 text-sm font-medium text-white">
                        {landmark.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {landmark.type}
                      </span>
                      <span className="font-mono text-xs text-gray-500">
                        [{landmark.voxel.join(", ")}]
                      </span>
                    </div>
                  ))}
                </div>

                <p className="pt-2 text-xs text-gray-600">
                  Voxel coordinates from precomputed model predictions.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
