import Navbar from "@/components/Navbar";
import { ArrowLeft, Target, FlaskConical, BarChart3, Cpu, ChevronRight } from "lucide-react";
import Link from "next/link";

const MetricCard = ({ value, label, sub }: { value: string; label: string; sub: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <p className="text-3xl font-bold text-pink-400">{value}</p>
    <p className="mt-1 font-medium text-white">{label}</p>
    <p className="mt-0.5 text-sm text-zinc-500">{sub}</p>
  </div>
);

export default function UterusThesisPage() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-32 pb-16">
        <Link
          href="/#research"
          className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-pink-400"
        >
          <ArrowLeft size={14} /> Back to Research
        </Link>

        <p className="text-xs uppercase tracking-[0.35em] text-pink-400 mb-4">
          Thesis II · Pelvic MRI · Sep 2025 – Mar 2026
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Automatic Detection of Uterine<br className="hidden md:block" /> Anatomical Landmarks in Pelvic MRI
        </h1>
        <p className="mt-3 text-lg text-zinc-400 italic">
          A Segmentation-Guided Multi-Decoder 3D U-Net with SharpHeatmapLoss
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-zinc-500">
          <span><span className="text-white font-medium">Author:</span> Saad Ahmad</span>
          <span><span className="text-white font-medium">Institution:</span> FAU Erlangen-Nuremberg</span>
          <span><span className="text-white font-medium">Lab:</span> Smart Imaging Lab</span>
          <span><span className="text-white font-medium">Supervisor:</span> Prof. Dr. Jana Hutter</span>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/projects/uterus-demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-pink-400 hover:text-pink-400"
          >
            Live Demo <ChevronRight size={15} />
          </Link>
        </div>
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard value="4.52 mm" label="Overall Mean Error" sub="192 landmarks evaluated" />
          <MetricCard value="2.90 mm" label="Best: Cavity Cervix" sub="sub-3 mm precision" />
          <MetricCard value="3.66 mm" label="Median Error" sub="All 6 landmarks" />
          <MetricCard value="32" label="Test Cases" sub="3 acquisition protocols" />
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-white/8" />
      </div>

      {/* Problem / Approach */}
      <section className="mx-auto max-w-5xl px-6 py-16 space-y-12">
        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Target size={18} className="text-pink-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">Problem Statement</h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
              Uterine biometry — measuring fundal thickness, body length, cervical length, and AP diameter — is
              essential for managing endometrial cancer, fibroids, and endometriosis. Yet it is performed manually
              with high inter-observer variability. <span className="text-white font-medium">No prior automated 3D approach</span> existed
              for multi-landmark localization from a single pelvic MRI acquisition.
            </p>
            <p className="mt-3 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
              The six anatomical targets — APD-1, APD-2, Fundus Outer, Cavity Cervix, Inner OS, and Cavity Fundus —
              span the full uterine extent and vary significantly in appearance across acquisition protocols, making
              a single-model approach particularly challenging.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <FlaskConical size={18} className="text-pink-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">Approach</h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
              Proposed a <span className="text-white font-medium">segmentation-guided multi-decoder 3D U-Net</span> predicting all six uterine
              landmarks simultaneously via dedicated decoder branches. Three key innovations drive performance:
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { title: "Geometrically Consistent Augmentation", body: "In-plane rotations and left-right flips with coordinate transformations across LPS, RAS, and voxel space ensure landmark annotations remain valid after augmentation, exposing the model to the full range of uterine tilt and orientation seen in real patients." },
                { title: "ROI-Guided Inference", body: "Uterine segmentation masks are used to crop the inference region, eliminating background noise and reducing false activations from pelvic structures. The model only processes voxels within the uterine envelope." },
                { title: "Dual-Model Architecture", body: "Two custom 3D U-Nets with shared encoders for contextual learning of landmark relationships, and independent decoder branches per landmark group: Model 1 for APD-1, APD-2, and Fundus Outer; Model 2 for Cavity Cervix, Inner OS, and Cavity Fundus. The shared encoders capture inter-landmark spatial context while separate decoders specialize on landmark-specific features, preventing cross-task gradient interference." },
                { title: "SharpHeatmapLoss", body: "A custom loss function combining MSE with a cubic penalty term that forces sharply peaked Gaussian heatmaps. Standard MSE allows diffuse activations; the cubic term penalizes spread disproportionately, compelling the network to localize with sub-voxel precision." },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <ChevronRight size={16} className="mt-1 shrink-0 text-pink-400" />
                  <p className="max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9"><span className="font-semibold text-white">{title}:</span> {body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex gap-5 mb-8">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Cpu size={18} className="text-pink-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Architecture</h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 overflow-x-auto space-y-10">
          {/* Pipeline */}
          <div>
            <p className="mb-4 text-sm uppercase tracking-widest text-zinc-600 md:text-base">Inference Pipeline</p>
            <div className="flex items-center gap-2 flex-wrap text-base text-zinc-300 md:text-lg">
              {["T2 Pelvic MRI", "Uterus Segmentation Mask", "ROI Crop", "Isotropic Resampling (1mm³)", "Resize to 96³", "TwoHead U-Net", "ThreeHead U-Net", "Heatmap Peak Extraction", "6 LPS Landmarks"].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm md:text-base">{step}</span>
                  {i < arr.length - 1 && <ChevronRight size={14} className="text-zinc-600 shrink-0" />}
                </span>
              ))}
            </div>
          </div>

          {/* SharpHeatmapLoss */}
          <div>
            <p className="mb-4 text-sm uppercase tracking-widest text-zinc-600 md:text-base">SharpHeatmapLoss</p>
            <div className="rounded-2xl border border-pink-400/20 bg-pink-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3 justify-center text-base md:text-lg">
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-pink-300 md:text-base">L = MSE(ŷ, y)</span>
                <span className="text-zinc-500">+</span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-pink-300 md:text-base">λ · Σ(ŷ³)</span>
                <span className="text-sm text-zinc-500 md:text-base">(cubic spread penalty)</span>
              </div>
              <p className="mx-auto mt-3 max-w-4xl text-center text-sm leading-6 text-zinc-500 md:text-base md:leading-7">
                The cubic term penalizes diffuse activations disproportionately, forcing the network to concentrate probability mass at the true landmark center.
              </p>
            </div>
          </div>

          {/* Dual model */}
          <div>
            <p className="mb-4 text-sm uppercase tracking-widest text-zinc-600 md:text-base">Dual-Model Architecture</p>
            <div className="grid md:grid-cols-2 gap-5">
              {/* TwoHead */}
              <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
                <p className="text-center text-sm uppercase tracking-widest text-blue-400 mb-5 md:text-base">Model 1 — TwoHead U-Net</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-lg border border-blue-400/20 bg-blue-400/5 px-4 py-2 text-sm text-blue-300 text-center w-full md:text-base">Input: 96³ MRI crop</div>
                  <div className="h-3 w-px bg-white/10" />
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 text-center w-full md:text-base">Shared 3D Encoder (4 levels)</div>
                  <div className="h-3 w-px bg-white/10" />
                  <div className="grid grid-cols-1 gap-2 w-full sm:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-center text-zinc-300 md:text-base">Decoder A<br/><span className="text-zinc-500">APD-1, APD-2</span></div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-center text-zinc-300 md:text-base">Decoder B<br/><span className="text-zinc-500">Fundus Outer</span></div>
                  </div>
                  <div className="h-3 w-px bg-white/10" />
                  <div className="rounded-lg border border-blue-400/20 bg-blue-400/5 px-4 py-2 text-sm text-blue-300 text-center w-full font-medium md:text-base">3 Heatmaps → 3 Landmark Coords</div>
                </div>
              </div>
              {/* ThreeHead */}
              <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-5">
                <p className="text-center text-sm uppercase tracking-widest text-purple-400 mb-5 md:text-base">Model 2 — ThreeHead U-Net</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-lg border border-purple-400/20 bg-purple-400/5 px-4 py-2 text-sm text-purple-300 text-center w-full md:text-base">Input: 96³ MRI crop</div>
                  <div className="h-3 w-px bg-white/10" />
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 text-center w-full md:text-base">Shared 3D Encoder (4 levels)</div>
                  <div className="h-3 w-px bg-white/10" />
                  <div className="grid grid-cols-1 gap-2 w-full sm:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-center text-zinc-300 md:text-base">Dec. A<br/><span className="text-zinc-500">Cav. Cervix</span></div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-center text-zinc-300 md:text-base">Dec. B<br/><span className="text-zinc-500">Inner OS</span></div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-center text-zinc-300 md:text-base">Dec. C<br/><span className="text-zinc-500">Cav. Fundus</span></div>
                  </div>
                  <div className="h-3 w-px bg-white/10" />
                  <div className="rounded-lg border border-purple-400/20 bg-purple-400/5 px-4 py-2 text-sm text-purple-300 text-center w-full font-medium md:text-base">3 Heatmaps → 3 Landmark Coords</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/8">
            {["PyTorch", "3D U-Net", "SharpHeatmapLoss", "96³ Input", "1 mm³ Isotropic", "ROI-Guided Inference", "Gaussian σ=3mm", "Adam Optimizer"].map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-400 md:text-base">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Per-landmark results */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex gap-5 mb-8">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <BarChart3 size={18} className="text-pink-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Per-Landmark Results</h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-base md:text-lg">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04]">
                <th className="px-5 py-3.5 text-left text-sm uppercase tracking-widest text-zinc-500">Landmark</th>
                <th className="px-5 py-3.5 text-right text-sm uppercase tracking-widest text-zinc-500">Mean Error</th>
                <th className="px-5 py-3.5 text-left text-sm uppercase tracking-widest text-zinc-500">Model</th>
                <th className="px-5 py-3.5 text-left text-sm uppercase tracking-widest text-zinc-500">Bar</th>
              </tr>
            </thead>
            <tbody>
              {[
                { lm: "Cavity Cervix",  err: "2.90 mm", pct: 43, model: "ThreeHead", best: true },
                { lm: "Cavity Fundus",  err: "2.94 mm", pct: 44, model: "ThreeHead", best: true },
                { lm: "Inner OS",       err: "4.85 mm", pct: 72, model: "ThreeHead", best: false },
                { lm: "Fundus Outer",   err: "5.11 mm", pct: 76, model: "TwoHead",   best: false },
                { lm: "APD-1",          err: "5.66 mm", pct: 84, model: "TwoHead",   best: false },
                { lm: "APD-2",          err: "5.66 mm", pct: 84, model: "TwoHead",   best: false },
              ].map((row) => (
                <tr key={row.lm} className={`border-b border-white/5 ${row.best ? "bg-pink-400/5" : "hover:bg-white/[0.02]"}`}>
                  <td className="px-5 py-3.5 font-medium">
                    <span className={row.best ? "text-pink-400" : "text-white"}>{row.lm}</span>
                  </td>
                  <td className={`px-5 py-3.5 text-right font-mono ${row.best ? "text-pink-400 font-semibold" : "text-zinc-300"}`}>{row.err}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-sm ${row.model === "ThreeHead" ? "bg-purple-400/10 text-purple-300" : "bg-blue-400/10 text-blue-300"}`}>
                      {row.model}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="h-1.5 w-full rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${row.best ? "bg-pink-400" : "bg-pink-400/40"}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-600 md:text-base">Scale max ≈ 6.7 mm · Lower = better · Cavity Cervix & Fundus achieve sub-3 mm precision.</p>
      </section>

      {/* Clinical impact */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="mb-6 text-2xl font-semibold text-white">Clinical Impact & Future Directions</h2>
          <p className="mb-4 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
            This is the <span className="text-white font-medium">first automated 3D approach</span> for uterine multi-landmark localization from pelvic MRI, enabling:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              { title: "Reproducible uterine biometry at scale", body: "reducing inter-reader variability in fibroid monitoring, endometriosis staging, and surgical planning." },
              { title: "Sub-3 mm precision on two landmarks", body: "Cavity Cervix (2.90 mm) and Cavity Fundus (2.94 mm), opening the door to automated cervical length measurement." },
              { title: "Multi-protocol generalization", body: "evaluated across 3 acquisition protocols and 32 test cases, demonstrating robustness to scanner and sequence variation." },
            ].map(({ title, body }) => (
              <li key={title} className="flex gap-3">
                <ChevronRight size={16} className="mt-1 shrink-0 text-pink-400" />
                <p className="max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9"><span className="font-semibold text-white">{title}</span> — {body}</p>
              </li>
            ))}
          </ul>
          <p className="max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
            Future directions include joint spinal-uterine landmark prediction from a single pelvic MRI acquisition,
            leveraging the geometric relationship between the sacrum and uterus established in Thesis I.
          </p>

          <div className="mt-8 flex flex-wrap gap-2 pt-4 border-t border-white/8">
            {["Python", "PyTorch", "3D U-Net", "SharpHeatmapLoss", "NIfTI", "nibabel", "SciPy", "3D Slicer", "ROI-Guided Inference"].map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 md:text-base">{t}</span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
