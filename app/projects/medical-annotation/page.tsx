import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Brain,
  ChevronRight,
  Cpu,
  Database,
  GitBranch,
  Layers3,
  Search,
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

const Flow = ({ steps }: { steps: string[] }) => (
  <div className="flex flex-wrap items-center gap-2">
    {steps.map((step, index) => (
      <span key={step} className="flex items-center gap-2">
        <span className="rounded-xl border border-teal-400/20 bg-teal-400/5 px-3 py-1.5 text-sm text-teal-300">
          {step}
        </span>
        {index < steps.length - 1 && (
          <ChevronRight size={14} className="shrink-0 text-zinc-600" />
        )}
      </span>
    ))}
  </div>
);

const ArchitectureStep = ({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) => (
  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm">
    <p className="font-medium text-white">{title}</p>
    <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>
  </div>
);

const ArchitectureLayer = ({
  label,
  tone,
  steps,
}: {
  label: string;
  tone: string;
  steps: { title: string; sub: string }[];
}) => (
  <div>
    <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
      {label}
    </p>
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex flex-wrap items-center gap-3">
        {steps.map((step, index) => (
          <span key={step.title} className="flex items-center gap-3">
            <ArchitectureStep {...step} />
            {index < steps.length - 1 && (
              <ChevronRight size={16} className="text-zinc-600" />
            )}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const featureHighlights = [
  {
    title: "3-Plane MRI Viewer",
    body: "Axial, coronal, and sagittal slices rendered on HTML5 Canvas with slice controls and grayscale volume rendering.",
  },
  {
    title: "Editable Landmarks",
    body: "Named, colored point markers can be placed, selected, moved, renamed, resized, recolored, and deleted.",
  },
  {
    title: "Brush Segmentation",
    body: "Paint and erase segmentation masks with adjustable radius, opacity, labels, and 3D region-growing seed behavior.",
  },
  {
    title: "Versioned State",
    body: "Every explicit save creates a JSONB snapshot in Postgres so a case can be reviewed or restored later.",
  },
  {
    title: "ML-Ready Exports",
    body: "Exports include JSON, 3D Slicer markup, segmentation masks, and segmentation NIfTI files for downstream ML workflows.",
  },
  {
    title: "RAG Project Assistant",
    body: "The Ask AI page indexes Markdown project notes with hybrid retrieval, then uses Groq to answer architecture questions with citations.",
  },
];

export default function MedicalAnnotationPage() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 pb-16 pt-32">
        <Link
          href="/#projects"
          className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-teal-400"
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-teal-400">
          Medical Imaging / Full Stack / AI Systems
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Medical MRI Annotation Platform
        </h1>
        <p className="mt-3 text-lg italic text-zinc-400">
          Browser-based volumetric MRI annotation, versioned backend state,
          ML-ready exports, and a RAG-backed AI project assistant.
        </p>

        <div className="mt-8">
          <Flow
            steps={[
              "NIfTI Upload",
              "3D Viewer",
              "Segmentation",
              "Version History",
              "ML Export",
              "RAG Assistant",
            ]}
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/projects/medical-annotation-live"
            className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-teal-300"
          >
            <Brain size={15} /> Live Demo
            <ArrowUpRight size={14} />
          </Link>
          <Link
            href="/ask"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-teal-400/40 hover:bg-teal-400/10 hover:text-teal-200"
          >
            <Bot size={15} /> Ask AI About It
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

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard
            value="3"
            label="Anatomical Planes"
            sub="Axial / Coronal / Sagittal"
          />
          <MetricCard
            value="NIfTI"
            label="Volume Format"
            sub=".nii / .nii.gz in-browser parse"
          />
          <MetricCard
            value="JSONB"
            label="Version History"
            sub="Every save snapshotted in Postgres"
          />
          <MetricCard
            value="RAG"
            label="AI Assistant"
            sub="Groq + Postgres/pgvector retrieval"
          />
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-white/8" />
      </div>

      <section className="mx-auto max-w-5xl space-y-12 px-6 py-16">
        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Brain size={18} className="text-teal-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">What It Does</h2>
            <p className="mt-3 leading-8 text-zinc-400">
              This is a browser-based MRI annotation workstation for uploading
              NIfTI volumes, reviewing axial/coronal/sagittal slices, placing
              editable landmarks, and painting segmentation masks without
              opening desktop imaging software.
            </p>
            <p className="mt-3 leading-8 text-zinc-400">
              The backend persists clinical review state, landmarks, mask
              strokes, notes, and version history so annotations can be saved,
              restored, audited, and exported for ML or 3D Slicer workflows.
            </p>
            <p className="mt-3 leading-8 text-zinc-400">
              A companion Ask AI layer explains the system from indexed project
              documentation. It chunks Markdown notes, stores retrieval metadata
              in Postgres/pgvector, combines vector and keyword search, and uses
              Groq to generate source-grounded answers.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Layers3 size={18} className="text-teal-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">
              Why These Choices
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                {
                  title: "NIfTI parsed in the browser",
                  body: "The user can inspect a medical volume immediately, before any large binary upload is needed.",
                },
                {
                  title: "Canvas rendering",
                  body: "Canvas gives precise control over slices, masks, landmark hit-testing, zoom, and overlay drawing.",
                },
                {
                  title: "FastAPI and Postgres",
                  body: "A Python backend handles annotation state and keeps the clinical workflow separate from the viewer UI.",
                },
                {
                  title: "JSONB version history",
                  body: "Each save stores a full annotation snapshot so previous review states can be restored.",
                },
                {
                  title: "RAG documentation layer",
                  body: "The project can be explained through a modern retrieval pipeline instead of static page copy only.",
                },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <ChevronRight
                    size={16}
                    className="mt-1 shrink-0 text-teal-400"
                  />
                  <p className="leading-7 text-zinc-400">
                    <span className="font-semibold text-white">{title}:</span>{" "}
                    {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-8 flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Cpu size={18} className="text-teal-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Architecture
          </h2>
        </div>

        <div className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <ArchitectureLayer
            label="Layer 1 - Frontend (Next.js / App Router)"
            tone="border-teal-400/20 bg-teal-400/5"
            steps={[
              { title: "NIfTI Upload", sub: "nifti-reader-js / local parse" },
              { title: "Canvas Viewer", sub: "3-plane / zoom / slice controls" },
              { title: "Annotation Tools", sub: "landmarks / masks / eraser" },
            ]}
          />

          <ArchitectureLayer
            label="Layer 2 - API (FastAPI / Railway / Docker)"
            tone="border-blue-400/20 bg-blue-400/5"
            steps={[
              { title: "POST /annotations", sub: "save / upsert state" },
              { title: "GET /annotations", sub: "load landmarks + masks" },
              { title: "GET /export", sub: "Slicer + ML outputs" },
            ]}
          />

          <ArchitectureLayer
            label="Layer 3 - Persistence"
            tone="border-yellow-400/20 bg-yellow-400/5"
            steps={[
              { title: "Neon Postgres", sub: "cases / landmarks / versions" },
              { title: "JSONB Snapshots", sub: "full state per save" },
              { title: "Supabase Storage", sub: ".nii.gz volume blobs" },
            ]}
          />

          <ArchitectureLayer
            label="Layer 4 - Export and Downstream ML"
            tone="border-green-400/20 bg-green-400/5"
            steps={[
              { title: "Slicer Markup", sub: "3D Slicer-compatible JSON" },
              { title: "Mask Export", sub: "segmentation JSON / NIfTI" },
              { title: "ML Dataset", sub: "landmark coords + labelmaps" },
            ]}
          />

          <ArchitectureLayer
            label="Layer 5 - AI Documentation (RAG / pgvector / Groq)"
            tone="border-purple-400/20 bg-purple-400/5"
            steps={[
              { title: "Markdown Corpus", sub: "project / thesis / CV-ready docs" },
              { title: "Hybrid Retrieval", sub: "pgvector + keyword ranking" },
              { title: "Groq Answering", sub: "source-grounded citations" },
            ]}
          />

          <div className="flex flex-wrap gap-2 border-t border-white/8 pt-2">
            {[
              "Next.js 16",
              "TypeScript",
              "FastAPI",
              "PostgreSQL",
              "pgvector",
              "Groq",
              "RAG",
              "Docker",
              "NIfTI",
              "3D Slicer",
              "Supabase Storage",
              "Jina-ready embeddings",
            ].map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-8 flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Database size={18} className="text-teal-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Feature Highlights
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureHighlights.map(({ title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-teal-400/30"
            >
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-3xl border border-teal-400/20 bg-teal-400/5 p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-5">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-400/25 bg-teal-400/10">
                <Search size={18} className="text-teal-300" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Ask the AI assistant about this architecture
                </h2>
                <p className="mt-2 max-w-2xl leading-7 text-zinc-400">
                  The assistant can explain how the annotation workflow,
                  backend persistence, ML exports, and RAG layer fit together
                  using indexed project documentation.
                </p>
              </div>
            </div>
            <Link
              href="/ask"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-teal-300"
            >
              Ask AI <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
