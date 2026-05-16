import Navbar from "@/components/Navbar";
import { ArrowLeft, Target, FlaskConical, BarChart3, Cpu, ChevronRight } from "lucide-react";
import Link from "next/link";

const MetricCard = ({ value, label, sub }: { value: string; label: string; sub: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <p className="text-3xl font-bold text-green-400">{value}</p>
    <p className="mt-1 font-medium text-white">{label}</p>
    <p className="mt-0.5 text-sm text-zinc-500">{sub}</p>
  </div>
);

export default function SpineThesisPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-32 pb-16">
        <Link
          href="/#research"
          className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-green-400"
        >
          <ArrowLeft size={14} /> Back to Research
        </Link>

        <p className="text-xs uppercase tracking-[0.35em] text-green-400 mb-4">
          Thesis I · Sacral MRI · Sep 2025 – Mar 2026
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Automatic lumbosacral vertebra localization in variable field-of-view pelvic MRI
        </h1>
        <p className="mt-3 text-lg text-zinc-400 italic">
          A Deep Learning Approach for Variable Field-of-View Pelvic Imaging
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-zinc-500">
          <span><span className="text-white font-medium">Author:</span> Saad Ahmad</span>
          <span><span className="text-white font-medium">Institution:</span> FAU Erlangen-Nuremberg</span>
          <span><span className="text-white font-medium">Lab:</span> Smart Imaging Lab</span>
          <span><span className="text-white font-medium">Supervisor:</span> Prof. Dr. Jana Hutter</span>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/projects/spine-demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-green-400 hover:text-green-400"
          >
            Live Demo <ChevronRight size={15} />
          </Link>
        </div>
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard value="4.21 mm" label="Mean Localization Error" sub="257 landmarks, multi-center" />
          <MetricCard value="3.77 mm" label="S1 Anchor Error" sub="100% within 10 mm" />
          <MetricCard value="3.54 mm" label="Median Error" sub="Across all protocols" />
          <MetricCard value="222" label="Training Cases" sub="Protocol II + III" />
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-white/8" />
      </div>

      {/* Problem / Approach / Results */}
      <section className="mx-auto max-w-5xl px-6 py-16 space-y-12">
        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Target size={18} className="text-green-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">The Problem This Work Solves</h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
              Accurate lumbosacral vertebrae localization in pelvic MRI is clinically critical for spinal surgery
              planning, radiation therapy field definition, endometriosis staging, and large-scale morphometric studies.
              Yet existing automated methods fundamentally fail in this setting — they assume full spinal visibility
              from C2 or T1, which is never available in pelvic MRI.
            </p>
            <p className="mt-3 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
              In pelvic imaging, the spine appears only incidentally: <span className="text-white font-medium">84.7% of cases</span> show
              partial or sacral-only coverage. No prior work had addressed individual S1–S5 sacral vertebra detection
              in this context, leaving a critical gap in automated pelvic MRI analysis.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <FlaskConical size={18} className="text-green-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">The Innovation: S1-Anchored Detection</h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
              The core insight is that pelvic MRI <span className="text-white font-medium">always captures the S1 vertebra</span> — it is
              the anatomical bridge between the sacrum and the pelvis. Rather than requiring a superior reference
              (the conventional approach), this work proposes making S1 the anchor point for bidirectional vertebral
              labeling, implemented through a novel two-stage system:
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { title: "Dual-Head 3D U-Net", body: "A lightweight architecture (~400K parameters) with a shared encoder-decoder and two task-specific output heads — one detecting all vertebral centers, one dedicated to S1 morphology. Joint training enables the model to learn both global vertebral patterns and S1-specific anatomy simultaneously." },
                { title: "S1-Anchored Post-Processing", body: "A multi-stage inference pipeline that detects S1 from its dedicated heatmap, then propagates labels bidirectionally — cranially through lumbar vertebrae and caudally through sacral segments — without any need for upper vertebrae to be present in the scan." },
                { title: "Biased Patch Sampling", body: "70% of training patches are drawn from high-activity heatmap regions, forcing the model to learn from challenging anatomical boundaries rather than uniform sampling." },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <ChevronRight size={16} className="mt-1 shrink-0 text-green-400" />
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
            <Cpu size={18} className="text-green-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Architecture</h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 overflow-x-auto">
          {/* Pipeline flow */}
          <p className="mb-6 text-sm uppercase tracking-widest text-zinc-600 md:text-base">Inference Pipeline</p>
          <div className="flex items-center gap-2 flex-wrap text-base text-zinc-300 md:text-lg mb-10">
            {["Pelvic MRI (NIfTI)", "Isotropic Resampling", "Patch Extraction (biased)", "Dual-Head 3D U-Net", "S1 Heatmap → Anchor", "Bidirectional Label Propagation", "L4–S5 Landmarks"].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm md:text-base">{step}</span>
                {i < arr.length - 1 && <ChevronRight size={14} className="text-zinc-600 shrink-0" />}
              </span>
            ))}
          </div>

          {/* Network diagram */}
          <p className="mb-6 text-sm uppercase tracking-widest text-zinc-600 md:text-base">Dual-Head 3D U-Net</p>
          <div className="flex flex-col items-center gap-3">
            {/* Input */}
            <div className="rounded-xl border border-green-400/30 bg-green-400/5 px-8 py-3 text-base font-medium text-green-300 text-center md:text-lg">
              Input Volume — 3D MRI Patch
            </div>
            <div className="h-4 w-px bg-white/15" />

            {/* Encoder */}
            <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-white/[0.03] p-5">
              <p className="text-center text-sm uppercase tracking-widest text-zinc-500 mb-4 md:text-base">Shared Encoder</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {["Conv3D + BN + ReLU", "Residual Block ×2", "Max Pool ↓2", "Residual Block ×2", "Max Pool ↓4", "Bottleneck"].map((b) => (
                  <span key={b} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-300 md:text-base">{b}</span>
                ))}
              </div>
            </div>
            <div className="h-4 w-px bg-white/15" />

            {/* Decoder branches */}
            <div className="w-full max-w-2xl grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
                <p className="text-center text-sm uppercase tracking-widest text-blue-400 mb-4 md:text-base">Head 1 · All Vertebrae</p>
                <div className="flex flex-col gap-2">
                  {["Decoder + Skip Connections", "ConvTranspose3D ×3", "1×1×1 Conv"].map((b) => (
                    <div key={b} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-center text-zinc-300 md:text-base">{b}</div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-blue-400/20 bg-blue-400/5 px-3 py-2 text-sm text-center text-blue-300 font-medium md:text-base">
                  Multi-class Heatmap (L4–S5)
                </div>
              </div>
              <div className="rounded-2xl border border-green-400/20 bg-green-400/5 p-5">
                <p className="text-center text-sm uppercase tracking-widest text-green-400 mb-4 md:text-base">Head 2 · S1 Dedicated</p>
                <div className="flex flex-col gap-2">
                  {["Decoder + Skip Connections", "ConvTranspose3D ×3", "1×1×1 Conv"].map((b) => (
                    <div key={b} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-center text-zinc-300 md:text-base">{b}</div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-green-400/20 bg-green-400/5 px-3 py-2 text-sm text-center text-green-300 font-medium md:text-base">
                  S1 Anchor Heatmap
                </div>
              </div>
            </div>
            <div className="h-4 w-px bg-white/15" />

            {/* Post-processing */}
            <div className="w-full max-w-2xl rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
              <p className="text-center text-sm uppercase tracking-widest text-yellow-400 mb-4 md:text-base">S1-Anchored Post-Processing</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {["Peak Extraction (S1)", "Bidirectional Propagation", "Caudal: S2→S5", "Cranial: L5→L4"].map((b) => (
                  <span key={b} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-300 md:text-base">{b}</span>
                ))}
              </div>
            </div>
            <div className="h-4 w-px bg-white/15" />

            {/* Output */}
            <div className="rounded-xl border border-green-400/30 bg-green-400/5 px-8 py-3 text-base font-medium text-green-300 text-center md:text-lg">
              Output — L4, L5, S1, S2, S3, S4, S5 Landmark Coordinates
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {["~400K Parameters", "Adam Optimizer", "ReduceLROnPlateau", "MSE Heatmap Loss", "Gaussian σ=2mm", "Biased Patch Sampling 70%"].map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-400 md:text-base">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Per-vertebra results */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex gap-5 mb-8">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <BarChart3 size={18} className="text-green-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Per-Vertebra Results</h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[780px] text-base md:text-lg">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04]">
                <th className="px-5 py-3.5 text-left text-sm uppercase tracking-widest text-zinc-500">Vertebra</th>
                <th className="px-5 py-3.5 text-right text-sm uppercase tracking-widest text-zinc-500">Mean Error</th>
                <th className="px-5 py-3.5 text-right text-sm uppercase tracking-widest text-zinc-500">≤5 mm</th>
                <th className="px-5 py-3.5 text-right text-sm uppercase tracking-widest text-zinc-500">≤10 mm</th>
                <th className="px-5 py-3.5 text-left text-sm uppercase tracking-widest text-zinc-500">Bar</th>
              </tr>
            </thead>
            <tbody>
              {[
                { v: "L4", err: "4.36 mm", p5: "70.0%", p10: "90.0%",  pct: 65, anchor: false },
                { v: "L5", err: "3.65 mm", p5: "78.9%", p10: "97.4%",  pct: 54, anchor: false },
                { v: "S1 (Anchor)", err: "3.77 mm", p5: "75.0%", p10: "100%", pct: 56, anchor: true },
                { v: "S2", err: "4.33 mm", p5: "75.0%", p10: "97.7%",  pct: 65, anchor: false },
                { v: "S3", err: "3.54 mm", p5: "83.7%", p10: "97.7%",  pct: 53, anchor: false },
                { v: "S4", err: "4.79 mm", p5: "69.2%", p10: "89.7%",  pct: 72, anchor: false },
                { v: "S5", err: "5.25 mm", p5: "62.5%", p10: "87.5%",  pct: 78, anchor: false },
              ].map((row) => (
                <tr key={row.v} className={`border-b border-white/5 ${row.anchor ? "bg-green-400/5" : "hover:bg-white/[0.02]"}`}>
                  <td className="px-5 py-3.5 font-medium">
                    <span className={row.anchor ? "text-green-400" : "text-white"}>{row.v}</span>
                  </td>
                  <td className={`px-5 py-3.5 text-right font-mono ${row.anchor ? "text-green-400 font-semibold" : "text-zinc-300"}`}>{row.err}</td>
                  <td className="px-5 py-3.5 text-right text-zinc-400">{row.p5}</td>
                  <td className={`px-5 py-3.5 text-right ${row.anchor && row.p10 === "100%" ? "text-green-400 font-semibold" : "text-zinc-400"}`}>{row.p10}</td>
                  <td className="px-5 py-3.5">
                    <div className="h-1.5 w-full rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${row.anchor ? "bg-green-400" : "bg-green-400/50"}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-600 md:text-base">S1 anchor achieved 100% detection within 10 mm across all 44 test instances. S4–S5 show higher variance due to progressive developmental fusion.</p>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="mb-6 text-2xl font-semibold text-white">Contextualized Against Prior Work</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[760px] text-base md:text-lg">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04]">
                <th className="px-5 py-3.5 text-left text-sm uppercase tracking-widest text-zinc-500">Method</th>
                <th className="px-5 py-3.5 text-left text-sm uppercase tracking-widest text-zinc-500">Setting</th>
                <th className="px-5 py-3.5 text-right text-sm uppercase tracking-widest text-zinc-500">Performance</th>
              </tr>
            </thead>
            <tbody>
              {[
                { method: "Existing methods", setting: "Require full spinal visibility (C2/T1 reference)", perf: "Not applicable", highlight: false },
                { method: "Glocker et al. (CT)", setting: "Full-spine CT, regression forests", perf: "8.6 mm", highlight: false },
                { method: "Windsor et al. (MRI)", setting: "Spine-dedicated MRI, full FOV", perf: "2–4 mm (lumbar only)", highlight: false },
                { method: "This work", setting: "Pelvic MRI, partial FOV, all sacral levels", perf: "4.21 mm (L1–S5, multi-center)", highlight: true },
              ].map((row) => (
                <tr key={row.method} className={`border-b border-white/5 ${row.highlight ? "bg-green-400/5" : "hover:bg-white/[0.02]"}`}>
                  <td className={`px-5 py-3.5 font-medium ${row.highlight ? "text-green-400" : "text-white"}`}>{row.method}</td>
                  <td className="px-5 py-3.5 text-zinc-400">{row.setting}</td>
                  <td className={`px-5 py-3.5 text-right font-mono ${row.highlight ? "text-green-400 font-semibold" : "text-zinc-400"}`}>{row.perf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-600 md:text-base">Results are within the range of spine-dedicated methods despite operating on a fundamentally harder problem: partial spinal coverage, lower through-plane resolution, and variable patient positioning.</p>
      </section>

      {/* Clinical Impact */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="mb-6 text-2xl font-semibold text-white">Clinical Impact & Future Directions</h2>
          <p className="mb-4 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
            This is the <span className="text-white font-medium">first published method</span> for individual S1–S5 sacral vertebra detection in pelvic MRI, enabling:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              { title: "Reproducible lumbosacral morphometry", body: "in gynecological imaging workflows — reducing inter-reader variability in surgical and radiotherapy planning." },
              { title: "Observer-independent spinal measurements at population scale", body: "unlocking large-scale epidemiological studies previously blocked by manual bottlenecks." },
              { title: "A modular building block", body: "for joint pelvic analysis systems that co-localize vertebral and uterine anatomy from a single MRI acquisition." },
            ].map(({ title, body }) => (
              <li key={title} className="flex gap-3">
                <ChevronRight size={16} className="mt-1 shrink-0 text-green-400" />
                <p className="max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9"><span className="font-semibold text-white">{title}</span> {body}</p>
              </li>
            ))}
          </ul>
          <p className="max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
            Future work is planned toward a <span className="text-white font-medium">unified pelvic MRI framework</span> that jointly predicts both spinal and uterine landmarks, leveraging the geometric relationship between the sacrum and uterus to mutually constrain predictions.
          </p>

          <div className="mt-8 flex flex-wrap gap-2 pt-4 border-t border-white/8">
            {["Python", "PyTorch", "3D U-Net", "NIfTI / nibabel", "Gaussian Heatmap Regression", "SciPy", "3D Slicer", "Adam + ReduceLROnPlateau", "Multi-center evaluation"].map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 md:text-base">{t}</span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
