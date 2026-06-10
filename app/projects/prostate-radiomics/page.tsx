"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";

/* ─── Supabase URLs ─────────────────────────────────────────────────────── */
const BASE =
  "https://nuzqakkecqaxikynctbq.supabase.co/storage/v1/object/public/porfolio";

const SAMPLE_CASES = [
  {
    id: "case_a",
    label: "Case A",
    subtitle: "Clearly Ambiguous",
    description: "Dice = 0.000 — readers placed tumours in completely different locations",
    accentColor: "rose",
    sliceUrl: `${BASE}/prostate-case-a-adc-slice.png`,
    inferenceUrl: `${BASE}/prostate-case-a-inference.json`,
  },
  {
    id: "case_b",
    label: "Case B",
    subtitle: "Borderline",
    description: "Dice = 0.628 — readers largely agree but with minor spatial discrepancy",
    accentColor: "amber",
    sliceUrl: `${BASE}/prostate-case-b-adc-slice.png`,
    inferenceUrl: `${BASE}/prostate-case-b-inference.json`,
  },
  {
    id: "case_c",
    label: "Case C",
    subtitle: "Clearly Clear",
    description: "Dice = 0.828 — strong inter-reader agreement, large concordant tumour",
    accentColor: "teal",
    sliceUrl: `${BASE}/prostate-case-c-adc-slice.png`,
    inferenceUrl: `${BASE}/prostate-case-c-inference.json`,
  },
] as const;

type AccentColor = (typeof SAMPLE_CASES)[number]["accentColor"];

const ACCENT: Record<AccentColor, { border: string; bg: string; badge: string; bar: string; text: string; activeBorder: string }> = {
  rose: {
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    badge: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    bar: "bg-rose-500",
    text: "text-rose-400",
    activeBorder: "border-rose-400",
  },
  amber: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    bar: "bg-amber-400",
    text: "text-amber-400",
    activeBorder: "border-amber-400",
  },
  teal: {
    border: "border-teal-500/30",
    bg: "bg-teal-500/10",
    badge: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
    bar: "bg-teal-400",
    text: "text-teal-400",
    activeBorder: "border-teal-400",
  },
};

type TopFeature = { name: string; raw_value: number; contribution: number };

type InferenceResult = {
  case_id: string;
  predicted_label: "Ambiguous" | "Clear";
  ambiguity_score: number;
  label_groundtruth: string;
  dice_reader1_reader2: number;
  dice_threshold: number;
  top_features: TopFeature[];
  reader1_volume_voxels: number;
  reader2_volume_voxels: number;
  hausdorff_distance_voxels: number;
  modality: string;
  dataset: string;
};

type Phase = "idle" | "loading" | "done" | "error";

function featureLabel(raw: string): string {
  return raw
    .replace(/^original_/, "")
    .replace(/firstorder_/, "FO › ")
    .replace(/glcm_direction_/, "GLCM d")
    .replace(/glcm_/, "GLCM › ")
    .replace(/shape_/, "Shape › ")
    .replace(/_/g, " ");
}

export default function ProstateRadiomicsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sliceUrl, setSliceUrl] = useState<string | null>(null);
  const [inference, setInference] = useState<InferenceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadCase = async (sample: (typeof SAMPLE_CASES)[number]) => {
    if (phase === "loading") return;
    setSelectedId(sample.id);
    setPhase("loading");
    setSliceUrl(null);
    setInference(null);
    setErrorMsg("");

    try {
      const res = await fetch(sample.inferenceUrl);
      if (!res.ok) throw new Error(`Inference fetch failed: ${res.status}`);
      const data: InferenceResult = await res.json();
      setInference(data);
      setSliceUrl(sample.sliceUrl);
      setPhase("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not load case.");
      setPhase("error");
      setSelectedId(null);
    }
  };

  const activeSample = SAMPLE_CASES.find((s) => s.id === selectedId);
  const accent = activeSample ? ACCENT[activeSample.accentColor] : null;

  return (
    <main className="min-h-screen bg-transparent px-6 py-24 text-white">
      <Navbar />
      <section className="mx-auto max-w-6xl">
        {/* Header */}
        <p className="text-sm uppercase tracking-[0.35em] text-teal-400">
          Interactive AI Demo
        </p>
        <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-tight">
          Prostate MRI Radiomics — Inter-Reader Ambiguity Detection
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          An XGBoost classifier trained on ADC diffusion MRI cases from the{" "}
          <span className="text-white">Prostate158</span> dataset predicts
          whether two expert radiologists will disagree on ADC tumour
          delineation — using radiomic texture features extracted from the
          same ADC modality.
        </p>

        {/* Method pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {["ADC Radiomics · GLCM + Shape + First-Order", "XGBoost · AUC 0.69", "5-fold StratifiedKFold", "ADC features → ADC inter-reader Dice label", "No circular label"].map(
            (t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-gray-300"
              >
                {t}
              </span>
            )
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <div className="flex gap-3">
            <ShieldAlert className="flex-shrink-0 text-yellow-400" size={20} />
            <p className="text-sm leading-6 text-yellow-100">
              All cases are fully anonymized research data from the open-access{" "}
              <span className="font-semibold">Prostate158</span> dataset. Model
              predictions are for research purposes only and do not constitute
              medical advice.
            </p>
          </div>
        </div>

        {/* Case selector */}
        <div className="mt-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
            Choose an example case
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {SAMPLE_CASES.map((sample) => {
              const a = ACCENT[sample.accentColor];
              const isActive = selectedId === sample.id;
              const isLoading = isActive && phase === "loading";
              const isDone = isActive && phase === "done";
              return (
                <button
                  key={sample.id}
                  onClick={() => loadCase(sample)}
                  disabled={phase === "loading"}
                  className={`group relative rounded-2xl border p-6 text-left transition-all ${
                    isActive
                      ? `${a.activeBorder} ${a.bg}`
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <p className={`text-lg font-bold ${isActive ? a.text : "text-white"}`}>
                    {sample.label}
                  </p>
                  <p className={`mt-0.5 text-xs font-semibold uppercase tracking-widest ${isActive ? a.text : "text-gray-500"}`}>
                    {sample.subtitle}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-gray-400">
                    {sample.description}
                  </p>
                  {isLoading && (
                    <Loader2
                      className={`absolute right-4 top-4 animate-spin ${a.text}`}
                      size={18}
                    />
                  )}
                  {isDone && (
                    <CheckCircle2
                      className={`absolute right-4 top-4 ${a.text}`}
                      size={18}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading bar */}
        {phase === "loading" && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-teal-400/20 bg-teal-400/5 px-5 py-4">
            <Loader2 className="animate-spin text-teal-400" size={18} />
            <span className="text-sm text-teal-300">
              Fetching ADC slice and inference results…
            </span>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Main panel */}
        {phase === "done" && inference && sliceUrl && accent && (
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {/* Left — ADC slice */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
                ADC Diffusion Map · Axial Slice
              </p>
              <p className="mb-4 text-sm text-gray-400">
                Case {inference.case_id} · Middle slice · Radiomic features
                extracted from this ADC image ·{" "}
                <span className="text-teal-400">Teal = tumour mask (Reader 1)</span>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sliceUrl}
                alt={`ADC slice case ${inference.case_id}`}
                className="w-full rounded-2xl border border-white/10 object-cover"
                style={{ imageRendering: "pixelated" }}
              />
              <p className="mt-3 text-xs text-gray-600">
                Prostate158 open-access dataset · T₂ + ADC MRI · anonymized
              </p>
            </div>

            {/* Right — inference panel */}
            <div className="flex flex-col gap-5">
              {/* Prediction badge */}
              <div className={`rounded-3xl border p-6 ${accent.border} ${accent.bg}`}>
                <div className="flex items-center gap-3">
                  {inference.predicted_label === "Ambiguous" ? (
                    <AlertTriangle className="text-rose-400" size={22} />
                  ) : (
                    <CheckCircle2 className="text-teal-400" size={22} />
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                      Model Prediction
                    </p>
                    <p className={`text-2xl font-bold ${accent.text}`}>
                      {inference.predicted_label}
                    </p>
                  </div>
                  <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${accent.badge}`}>
                    Ground truth: {inference.label_groundtruth}
                  </span>
                </div>

                {/* Score bar */}
                <div className="mt-5">
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Ambiguity score</span>
                    <span className={`font-bold ${accent.text}`}>
                      {(inference.ambiguity_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${accent.bar}`}
                      style={{ width: `${inference.ambiguity_score * 100}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-600">
                    Threshold: 50% · Score = P(ambiguous | radiomic features)
                  </p>
                </div>
              </div>

              {/* Inter-reader metrics */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} className="text-gray-400" />
                  <p className="text-sm font-semibold text-gray-300">
                    Inter-Reader Agreement
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center">
                    <p className={`text-2xl font-bold ${accent.text}`}>
                      {inference.dice_reader1_reader2.toFixed(3)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Dice Score</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center">
                    <p className="text-2xl font-bold text-white">
                      {inference.hausdorff_distance_voxels.toFixed(1)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Hausdorff (vox)</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center">
                    <p className="text-2xl font-bold text-white">
                      {Math.round(
                        (Math.abs(
                          inference.reader1_volume_voxels -
                            inference.reader2_volume_voxels
                        ) /
                          Math.max(
                            inference.reader1_volume_voxels,
                            inference.reader2_volume_voxels
                          )) *
                          100
                      )}%
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Volume Δ</p>
                  </div>
                </div>

                {/* Reader volumes */}
                <div className="mt-4 space-y-2">
                  {[
                    { label: "Reader 1", vox: inference.reader1_volume_voxels },
                    { label: "Reader 2", vox: inference.reader2_volume_voxels },
                  ].map(({ label, vox }) => {
                    const maxVox = Math.max(
                      inference.reader1_volume_voxels,
                      inference.reader2_volume_voxels
                    );
                    return (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-xs text-gray-500">
                          <span>{label}</span>
                          <span>{vox.toLocaleString()} vox</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-white/40 transition-all duration-700"
                            style={{ width: `${(vox / maxVox) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top features */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-gray-400" />
                  <p className="text-sm font-semibold text-gray-300">
                    Top Radiomic Features
                  </p>
                </div>
                <div className="space-y-2">
                  {inference.top_features.map((f, i) => {
                    const maxContrib = inference.top_features[0].contribution;
                    return (
                      <div
                        key={f.name}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5"
                      >
                        <span className="w-5 text-xs font-bold text-gray-600">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-medium text-white">
                            {featureLabel(f.name)}
                          </p>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full ${accent.bar} opacity-70`}
                              style={{
                                width: `${(f.contribution / maxContrib) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {f.raw_value.toFixed(3)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {(f.contribution * 100).toFixed(2)}%
                          </p>
                        </div>
                        <ChevronRight size={12} className="text-gray-700 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-600">
                  Contribution = XGBoost feature importance × |scaled value|
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Idle state */}
        {phase === "idle" && (
          <div className="mt-10 flex h-64 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] text-gray-600">
            Select a case above to view the ADC slice and model inference.
          </div>
        )}
      </section>
    </main>
  );
}
