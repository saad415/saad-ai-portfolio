import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Brain,
  Layers3,
  Database,
  Cpu,
  GitBranch,
} from "lucide-react";
import Link from "next/link";

const MetricCard = ({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub: string;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <p className="text-3xl font-bold text-teal-400">{value}</p>
    <p className="mt-1 font-medium text-white">{label}</p>
    <p className="mt-0.5 text-sm text-zinc-500">{sub}</p>
  </div>
);

export default function MedicalAnnotationPage() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-32 pb-16">
        <Link
          href="/#projects"
          className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-teal-400"
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <p className="text-xs uppercase tracking-[0.35em] text-teal-400 mb-4">
          Medical Imaging · Full Stack
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Medical MRI Annotation Platform
        </h1>
        <p className="mt-3 text-lg text-zinc-400 italic">
          Browser-based volumetric MRI annotation — NIfTI upload, 3-plane viewer, landmarks, segmentation, and versioned exports
        </p>

        {/* Pipeline flow */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {["NIfTI Upload", "3D Viewer", "Landmarks", "Segmentation", "Version History", "Slicer Export"].map(
            (step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-xl border border-teal-400/20 bg-teal-400/5 px-3 py-1.5 text-sm text-teal-300">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                )}
              </span>
            )
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/projects/medical-annotation-live"
            className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-teal-300"
          >
            <Brain size={15} /> Live Demo
            <ArrowUpRight size={14} />
          </Link>
          <a
            href="https://github.com/saad415/portfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 px-5 py-2.5 text-sm font-semibold text-teal-400 transition hover:bg-teal-400/10"
          >
            <GitBranch size={15} /> View Source
            <ArrowUpRight size={14} />
          </a>
        </div>
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard value="3" label="Anatomical Planes" sub="Axial · Coronal · Sagittal" />
          <MetricCard value="NIfTI" label="File Format" sub=".nii / .nii.gz in-browser parse" />
          <MetricCard value="JSONB" label="Version History" sub="Every save snapshotted in Postgres" />
          <MetricCard value="REST" label="FastAPI Backend" sub="Railway + Neon Postgres + Supabase" />
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-white/8" />
      </div>

      {/* What it does */}
      <section className="mx-auto max-w-5xl px-6 py-16 space-y-12">
        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Brain size={18} className="text-teal-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">What It Does</h2>
            <p className="mt-3 leading-8 text-zinc-400">
              A fully browser-based MRI annotation workstation that lets radiologists and researchers upload
              NIfTI volumes (.nii / .nii.gz), navigate axial, coronal, and sagittal planes with a slice
              slider, and place point landmarks or paint segmentation masks directly on the canvas — no
              desktop software required.
            </p>
            <p className="mt-3 leading-8 text-zinc-400">
              Every save creates a versioned JSONB snapshot in Postgres so annotations can be reviewed,
              compared, and restored to any prior state. Cases are exported in a 3D Slicer-compatible
              JSON format ready for downstream ML pipelines or clinical review workflows.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Layers3 size={18} className="text-teal-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">Why These Choices</h2>
            <ul className="mt-4 space-y-3">
              {[
                {
                  title: "NIfTI parsed entirely in the browser",
                  body: "nifti-reader-js decodes volumetric data client-side so no large binary upload is needed before the radiologist can start annotating — the volume streams straight onto the canvas.",
                },
                {
                  title: "HTML5 Canvas for rendering",
                  body: "Canvas gives pixel-perfect control over slice rendering, colour-mapped overlays, landmark hit-testing, and brush-stroke segmentation masks without shipping a heavy WebGL library.",
                },
                {
                  title: "FastAPI + Neon Postgres on Railway",
                  body: "FastAPI's async request handling pairs well with psycopg2 connection pooling against Neon's serverless Postgres — zero cold-start latency and no idle compute cost.",
                },
                {
                  title: "Supabase Storage for volumes",
                  body: "NIfTI files can be several hundred MB. Supabase object storage handles large uploads independently of the database, returning a public URL the frontend uses to re-hydrate volumes on revisit.",
                },
                {
                  title: "JSONB snapshots for version history",
                  body: "Storing annotation snapshots as JSONB columns rather than a separate audit table keeps queries simple — each save atomically appends a complete copy alongside its metadata.",
                },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <ChevronRight size={16} className="mt-1 shrink-0 text-teal-400" />
                  <p className="leading-7 text-zinc-400">
                    <span className="font-semibold text-white">{title}:</span> {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex gap-5 mb-8">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Cpu size={18} className="text-teal-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Architecture</h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 space-y-8">
          {/* Frontend layer */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 1 — Frontend (Next.js · App Router)
            </p>
            <div className="rounded-2xl border border-teal-400/20 bg-teal-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">NIfTI Upload</p>
                  <p className="text-xs text-zinc-500 mt-0.5">nifti-reader-js · in-browser parse</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Canvas Viewer</p>
                  <p className="text-xs text-zinc-500 mt-0.5">3-plane · slice slider · colour map</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Annotation Tools</p>
                  <p className="text-xs text-zinc-500 mt-0.5">landmark · brush · eraser</p>
                </div>
              </div>
            </div>
          </div>

          {/* API layer */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 2 — API (FastAPI · Railway · Docker)
            </p>
            <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">POST /annotations/:id</p>
                  <p className="text-xs text-zinc-500 mt-0.5">save · upsert case</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">GET /annotations/:id</p>
                  <p className="text-xs text-zinc-500 mt-0.5">load landmarks + strokes</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">GET /export</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Slicer-compatible JSON</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-zinc-500 text-center">
                  Routes:{" "}
                  <span className="text-zinc-300">cases</span> ·{" "}
                  <span className="text-zinc-300">annotations (CRUD)</span> ·{" "}
                  <span className="text-zinc-300">versions (list / restore)</span> ·{" "}
                  <span className="text-zinc-300">volume upload</span>
                </p>
              </div>
            </div>
          </div>

          {/* Storage layer */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 3 — Persistence
            </p>
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Neon Postgres</p>
                  <p className="text-xs text-zinc-500 mt-0.5">cases · landmarks · strokes · versions</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">JSONB Snapshots</p>
                  <p className="text-xs text-zinc-500 mt-0.5">full annotation state per save</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Supabase Storage</p>
                  <p className="text-xs text-zinc-500 mt-0.5">.nii.gz volume blobs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Export layer */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 4 — Export &amp; Downstream
            </p>
            <div className="rounded-2xl border border-green-400/20 bg-green-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Slicer JSON</p>
                  <p className="text-xs text-zinc-500 mt-0.5">3D Slicer-compatible markup</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">ML Dataset</p>
                  <p className="text-xs text-zinc-500 mt-0.5">landmark coords + seg masks</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Version Restore</p>
                  <p className="text-xs text-zinc-500 mt-0.5">roll back any prior save</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/8">
            {[
              "Next.js 16",
              "TypeScript",
              "Tailwind CSS",
              "FastAPI",
              "psycopg2",
              "Neon Postgres",
              "Supabase Storage",
              "Docker",
              "Railway",
              "nifti-reader-js",
              "HTML5 Canvas",
              "Lucide React",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex gap-5 mb-8">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Database size={18} className="text-teal-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Feature Highlights</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "3-Plane MRI Viewer",
              body: "Axial, coronal, and sagittal slices rendered on HTML5 Canvas with a per-plane slice slider and greyscale colour mapping.",
            },
            {
              title: "Landmark Annotation",
              body: "Click to place named, coloured point markers on any slice of any plane. Markers persist across plane switches and re-opens.",
            },
            {
              title: "Brush Segmentation",
              body: "Free-paint segmentation strokes with adjustable radius and label colour stored as individual stroke records, not rasterised bitmaps.",
            },
            {
              title: "Annotation Version History",
              body: "Every explicit save appends a JSONB snapshot. Radiologists can browse the history panel and one-click restore any prior state.",
            },
            {
              title: "Deferred NIfTI Upload",
              body: "The volume is parsed locally the moment it is selected, so annotation starts instantly. The binary is only uploaded to Supabase on explicit Save.",
            },
            {
              title: "Slicer-Compatible Export",
              body: "The export endpoint returns a JSON structure that matches 3D Slicer markup conventions, ready to import into clinical review or ML tooling.",
            },
          ].map(({ title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-teal-400/30 transition-colors"
            >
              <p className="font-semibold text-white text-sm">{title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
