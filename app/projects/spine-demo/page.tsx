"use client";

import { useState } from "react";
import { Upload, Brain, FileJson, ShieldAlert, Loader2 } from "lucide-react";
import NiftiViewer from "@/components/NiftiViewer";
import Navbar from "@/components/Navbar";
import SpineOverview from "@/components/SpineOverview";

const SAMPLE_CASES = [
  {
    id: "case_f",
    label: "Case A",
    description: "Mixed visibility",
    url: "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-f-volume.nii.gz",
  },
  {
    id: "case_g",
    label: "Case B",
    description: "Sacral-only coverage",
    url: "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-g-volume.nii.gz",
  },
  {
    id: "case_h",
    label: "Case C",
    description: "Full spine visibility",
    url: "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio/case-h-volume.nii.gz",
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

export default function SpineDemoPage() {
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [inferenceError, setInferenceError] = useState("");
  const [predictionResult, setPredictionResult] =
    useState<PredictionResult | null>(null);

  const resetInferenceState = () => {
    setPredictionResult(null);
    setInferenceError("");
    setProgress(0);
    setProgressStage("");
  };

  const loadSampleCase = async (sample: (typeof SAMPLE_CASES)[number]) => {
    if (isRunning) return;

    setSelectedSampleId(sample.id);
    setLoadingSampleId(sample.id);
    setSampleError("");
    resetInferenceState();

    try {
      const response = await fetch(sample.url);

      if (!response.ok) {
        throw new Error(`Sample fetch failed: ${response.status}`);
      }

      const blob = await response.blob();
      const sampleFile = new File([blob], `${sample.id}.nii.gz`, {
        type: "application/gzip",
      });

      setSelectedFile(sampleFile);
      setFileName(sample.label);
    } catch (error) {
      setSelectedFile(null);
      setFileName("");
      setSelectedSampleId(null);
      setSampleError(
        error instanceof Error ? error.message : "Could not load sample case."
      );
    } finally {
      setLoadingSampleId(null);
    }
  };

  const runInference = async () => {
    if (!selectedFile) return;

    try {
      setIsRunning(true);
      setProgress(0);
      setProgressStage("Uploading MRI volume");
      setInferenceError("");
      setPredictionResult(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        "http://127.0.0.1:8000/api/predict-landmarks/start",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      const jobId = data.jobId;

      if (!jobId) {
        throw new Error("Backend did not return an inference job ID.");
      }

      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const progressResponse = await fetch(
          `http://127.0.0.1:8000/api/predict-landmarks/progress/${jobId}`
        );

        if (!progressResponse.ok) {
          const errorText = await progressResponse.text();
          throw new Error(errorText);
        }

        const progressData = await progressResponse.json();

        setProgress(progressData.progress ?? 0);
        setProgressStage(progressData.stage ?? "Running inference");

        if (progressData.status === "completed") {
          setPredictionResult(progressData.result);
          break;
        }

        if (progressData.status === "failed") {
          throw new Error(progressData.error || "Inference failed.");
        }
      }
    } catch (error) {
      console.error(error);
      setInferenceError(
        error instanceof Error ? error.message : "Inference failed."
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
      <Navbar />
      <section className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.35em] text-green-400">
          Interactive AI Demo
        </p>

        <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-tight">
          Sacral Spine Landmark Detection from NIfTI MRI Volumes
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          Upload an anonymized pelvic MRI volume to display the real sagittal
          volume view directly in the browser.
        </p>

        <div className="mt-10 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <div className="flex gap-3">
            <ShieldAlert className="text-yellow-400" />
            <p className="text-sm leading-6 text-yellow-100">
              Upload only anonymized medical images. Do not upload patient
              identifiers or private clinical data.
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
              const isLoading = loadingSampleId === sample.id;

              return (
                <button
                  key={sample.id}
                  onClick={() => loadSampleCase(sample)}
                  disabled={isRunning || Boolean(loadingSampleId)}
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
                </button>
              );
            })}
          </div>
        </div>

        {loadingSampleId && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-green-400/20 bg-green-400/5 px-5 py-4">
            <Loader2 className="animate-spin text-green-400" size={18} />
            <span className="text-sm text-green-300">
              Fetching sample MRI volume...
            </span>
          </div>
        )}

        {sampleError && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {sampleError}
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="flex items-center gap-3">
              <Upload className="text-green-400" />
              <h2 className="text-2xl font-semibold">Upload MRI Volume</h2>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Select a sample above, or upload your own anonymized NIfTI file.
            </p>

            <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/40 p-10 text-center transition hover:border-green-400">
              <Upload className="mb-4 text-gray-400" size={40} />
              <span className="text-lg font-medium">
                Select .nii or .nii.gz file
              </span>
              <span className="mt-2 text-sm text-gray-500">
                NIfTI MRI volume input
              </span>

              <input
                type="file"
                accept=".nii,.gz,.nii.gz"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    setFileName(file.name);
                    setSelectedFile(file);
                    setSelectedSampleId(null);
                    setSampleError("");
                    resetInferenceState();
                  }
                }}
              />
            </label>

            {fileName && (
              <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-gray-300">
                Selected file:{" "}
                <span className="text-green-400">{fileName}</span>
              </p>
            )}

            <button
              onClick={runInference}
              disabled={!selectedFile || isRunning}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-400 px-6 py-3 font-semibold text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isRunning ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Brain size={18} />
              )}
              {isRunning ? "Running model..." : "Run Inference"}
            </button>

            {isRunning && (
              <div className="mt-6 rounded-2xl border border-green-400/20 bg-black/50 p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-green-400">
                      Inference Progress
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {progressStage || "Running inference"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-400">
                    {progress}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {inferenceError && (
              <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                {inferenceError}
              </div>
            )}

            {predictionResult && (
              <div className="mt-6 rounded-2xl border border-green-400/20 bg-black/50 p-4">
                <h3 className="mb-3 font-semibold text-green-400">
                  Backend Response
                </h3>

                <pre className="overflow-auto text-xs text-gray-300">
                  {JSON.stringify(predictionResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="flex items-center gap-3">
              <FileJson className="text-green-400" />
              <h2 className="text-2xl font-semibold">Sagittal Volume Viewer</h2>
            </div>
            <NiftiViewer
              file={selectedFile}
              landmarks={predictionResult?.landmarks || []}
            />
          </div>
        </div>
      </section>

      <SpineOverview />
    </main>
  );
}
