import Navbar from "@/components/Navbar";
import {
  Activity,
  BarChart3,
  Binary,
  BrainCircuit,
  Dna,
  Layers3,
  Network,
  SplitSquareHorizontal,
} from "lucide-react";

const workflow = [
  {
    title: "Sequence Windows",
    body: "Fixed-length DNA windows are organized around donor, acceptor, and background sequence regions for supervised splice-signal learning.",
    icon: Dna,
  },
  {
    title: "Nucleotide Encoding",
    body: "A, C, G, and T are converted into one-hot vectors so each sample becomes a model-ready sequence tensor.",
    icon: Binary,
  },
  {
    title: "CNN Classifier",
    body: "A 1D convolutional network learns local splice-signal patterns from motif-centred genomic windows.",
    icon: BrainCircuit,
  },
  {
    title: "Benchmark Report",
    body: "The training run reports class-balanced metrics including precision, recall, F1-score, and a confusion matrix.",
    icon: BarChart3,
  },
];

const metrics = [
  { value: "3", label: "Sequence classes", sub: "donor, acceptor, background" },
  { value: "201 bp", label: "Window length", sub: "centered genomic context" },
  { value: "1D CNN", label: "Model architecture", sub: "PyTorch sequence classifier" },
  { value: "F1", label: "Primary metric", sub: "class-aware evaluation" },
];

const stack = [
  "Python",
  "PyTorch",
  "NumPy",
  "scikit-learn",
  "Matplotlib",
  "DNA Encoding",
  "1D CNN",
  "Bioinformatics",
];

export default function MiniSpliceNetPage() {
  return (
    <main className="min-h-screen bg-transparent px-6 py-24 text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.35em] text-teal-300">
          Genomics Deep Learning
        </p>
        <div className="mt-4 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <h1 className="max-w-4xl text-5xl font-bold leading-tight">
              MiniSpliceNet — Deep Learning for Splice-Site Classification
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-400">
              A PyTorch-based genome-annotation workflow for classifying DNA
              sequence windows into donor splice site, acceptor splice site,
              and non-splice background sequence classes.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b1014]/75 p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3">
              <Network className="text-teal-300" size={24} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Sequence Modelling Pipeline
                </p>
                <p className="text-xl font-semibold text-white">
                  DNA window to splice class
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              {[
                "DNA sequence window",
                "One-hot nucleotide tensor",
                "1D convolutional feature extractor",
                "Softmax splice-site classifier",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-300/10 text-sm font-bold text-teal-300">
                    {index + 1}
                  </span>
                  <span className="text-sm text-zinc-300">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="text-3xl font-bold text-teal-300">{metric.value}</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {metric.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {metric.sub}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-16 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-300">
              Problem Framing
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Splice-signal modelling for genome annotation
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-400">
              Splice-site recognition is central to transcript annotation.
              MiniSpliceNet implements this as a reproducible supervised
              learning workflow: construct labelled sequence windows, encode
              nucleotides, train a neural sequence classifier, and evaluate
              class-specific performance.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {workflow.map(({ title, body, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-[#0b1014]/75 p-6"
              >
                <Icon className="text-teal-300" size={22} />
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <Layers3 className="text-teal-300" size={24} />
            <h2 className="mt-4 text-xl font-semibold">Architecture</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              The core model uses 1D convolutions over nucleotide channels,
              nonlinear activations, global pooling, and a dense classifier for
              three-way splice-site prediction.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <SplitSquareHorizontal className="text-teal-300" size={24} />
            <h2 className="mt-4 text-xl font-semibold">Evaluation</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Stratified train and validation splits keep donor, acceptor, and
              background classes balanced while reporting precision, recall,
              F1-score, and confusion-matrix results.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <Activity className="text-teal-300" size={24} />
            <h2 className="mt-4 text-xl font-semibold">Research Context</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              The workflow connects splice-signal detection with genome
              annotation tasks such as FASTA/GTF-derived sequence modelling and
              transcriptomics-informed isoform analysis.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
