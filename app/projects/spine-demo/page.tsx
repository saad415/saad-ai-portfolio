"use client";

import { useState } from "react";
import { Upload, Brain, FileJson, ShieldAlert } from "lucide-react";
import NiftiViewer from "@/components/NiftiViewer";

export default function SpineDemoPage() {
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runMockInference = () => {
    setIsRunning(true);

    setTimeout(() => {
      setIsRunning(false);
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
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

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="flex items-center gap-3">
              <Upload className="text-green-400" />
              <h2 className="text-2xl font-semibold">Upload MRI Volume</h2>
            </div>

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
              onClick={runMockInference}
              disabled={!selectedFile || isRunning}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-400 px-6 py-3 font-semibold text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Brain size={18} />
              {isRunning ? "Running model..." : "Run Inference"}
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="flex items-center gap-3">
              <FileJson className="text-green-400" />
              <h2 className="text-2xl font-semibold">Sagittal Volume Viewer</h2>
            </div>

            <NiftiViewer file={selectedFile} />
          </div>
        </div>
      </section>
    </main>
  );
}