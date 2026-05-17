"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Target, FlaskConical, BarChart3 } from "lucide-react";
import SpineShowcase from "./SpineShowcase";
import UterusShowcase from "./UterusShowcase";

/* ── shared sub-components ── */

const SectionTag = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 text-xs uppercase tracking-[0.3em] text-teal-300">{children}</p>
);

const MetricCard = ({
  value, label, sub, delay,
}: { value: string; label: string; sub: string; delay: number }) => (
  <motion.div
    initial={{ y: 20 }}
    whileInView={{ y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ delay }}
    className="rounded-2xl border border-white/[0.08] bg-[#0b1014]/65 p-6"
  >
    <p style={{ fontSize: "clamp(1.2rem, 2vw, 2.2rem)" }} className="font-bold text-teal-300">{value}</p>
    <p style={{ fontSize: "clamp(0.85rem, 1vw, 1.05rem)" }} className="mt-1 font-medium text-white">{label}</p>
    <p style={{ fontSize: "clamp(0.75rem, 0.85vw, 0.9rem)" }} className="mt-0.5 text-zinc-500">{sub}</p>
  </motion.div>
);

const NarrativeItem = ({
  icon: Icon, title, body, delay,
}: { icon: React.ElementType; title: string; body: string; delay: number }) => (
  <motion.div
    initial={{ x: -16 }}
    whileInView={{ x: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ delay, duration: 0.5 }}
    className="flex gap-5"
  >
    <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
      <Icon size={18} className="text-teal-300" />
    </span>
    <div>
      <h4 style={{ fontSize: "clamp(1.05rem, 1.3vw, 1.4rem)" }} className="font-semibold text-white">{title}</h4>
      <p style={{ fontSize: "clamp(0.9rem, 1.05vw, 1.15rem)" }} className="mt-3 leading-8 text-zinc-400">{body}</p>
    </div>
  </motion.div>
);

const StackChips = ({ stack }: { stack: string[] }) => (
  <div className="flex flex-wrap gap-2 pt-2">
    {stack.map((t) => (
      <span key={t} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-400">{t}</span>
    ))}
  </div>
);

const JANA_HUTTER_SCHOLAR_URL =
  "https://scholar.google.com/citations?hl=en&user=Wwj1FxcAAAAJ";

/* ── Main component ── */

export default function ResearchSection() {
  return (
    <section id="research" className="relative w-full px-[5vw] py-28">
      <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 translate-x-1/3 rounded-full bg-teal-300/6 blur-[100px]" />
      <div className="pointer-events-none absolute left-0 bottom-1/4 h-80 w-80 -translate-x-1/3 rounded-full bg-emerald-300/5 blur-[90px]" />

      {/* ── Section heading ── */}
      <motion.div
        initial={{ y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6 }}
        className="mb-20"
      >
        <SectionTag>Research</SectionTag>
        <h2
          className="font-semibold leading-tight tracking-tight"
          style={{ fontSize: "clamp(1.6rem, 3vw, 3.5rem)" }}
        >
          Master&apos;s Thesis
        </h2>
        <p style={{ fontSize: "clamp(0.9rem, 1.05vw, 1.1rem)" }} className="mt-3 text-zinc-500">
          FAU Erlangen-Nuremberg · Smart Imaging Lab · Supervisor:{" "}
          <a
            href={JANA_HUTTER_SCHOLAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-zinc-400 transition hover:text-teal-300"
          >
            Prof. Dr. Jana Hutter <ArrowUpRight size={13} />
          </a>
        </p>
      </motion.div>

      {/* ══════════════════════════════════════════
          THESIS I — Spine / Sacral MRI
      ══════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 32 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-10">
          <SectionTag>Thesis I · 17 September 2025 - 17 March 2026</SectionTag>
          <h3
            className="max-w-3xl font-semibold leading-tight tracking-tight"
            style={{ fontSize: "clamp(1.3rem, 2.4vw, 2.8rem)" }}
          >
            Automatic lumbosacral vertebra localization in variable field-of-view pelvic MRI
          </h3>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/thesis/spine"
              className="inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
            >
              <BookOpen size={15} /> Imeplentation Details
            </a>
            <a
              href="/projects/spine-demo"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-teal-300/60 hover:bg-teal-300/10 hover:text-teal-200"
            >
              Live demo <ArrowUpRight size={15} />
            </a>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { value: "4.21 mm", label: "Mean localization error", sub: "" },
            { value: "S1-S5", label: "Individual sacral detection", sub: "" },
            { value: "1.4s", label: "Per-volume inference", sub: "" },
            { value: "Multi-Center", label: "MRI protocol robustness", sub: "" },
          ].map((m, i) => <MetricCard key={m.label} {...m} delay={i * 0.07} />)}
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div className="flex flex-col gap-10">
            {[
              { icon: Target,       title: "Problem Statement", body: "Automatic vertebra localization in pelvic MRI is challenging due to variable field-of-view coverage, anatomical diversity, and partial visibility of the lumbosacral spine. Manual landmark annotation is time-consuming and subject to inter-observer variability, limiting reproducibility in clinical workflows." },
              { icon: FlaskConical, title: "Approach",          body: "Developed a dual-head 3D U-Net for volumetric vertebra landmark detection in sagittal T2-weighted pelvic MRI. The system jointly predicts vertebral center heatmaps and an anatomical S1 reference point, enabling robust S1-anchored labeling across incomplete or variable spine coverage." },
              { icon: BarChart3,    title: "Results",           body: "Achieved a mean vertebral localization error of 4.21 mm across multi-center pelvic MRI datasets, with robust detection of lumbar and sacral vertebrae (L1-L5, S1-S5)." },
            ].map((s, i) => <NarrativeItem key={s.title} {...s} delay={i * 0.08} />)}
            <StackChips stack={["Python", "PyTorch", "3D U-Net", "FastAPI", "Docker", "NIfTI", "nibabel"]} />
          </div>

          <motion.div
            initial={{ scale: 0.96 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <p style={{ fontSize: "clamp(0.7rem, 0.8vw, 0.85rem)" }} className="mb-4 uppercase tracking-widest text-zinc-600">
              Model output · live inference
            </p>
            <SpineShowcase />
          </motion.div>
        </div>
      </motion.div>

      {/* ── Divider between theses ── */}
      <div className="my-24 flex items-center gap-6">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-widest text-zinc-600">Thesis II</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* ══════════════════════════════════════════
          THESIS II — Uterus / Pelvic MRI
      ══════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 32 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-10">
          <SectionTag>Thesis II · 17 September 2025 - 17 March 2026</SectionTag>
          <h3
            className="max-w-3xl font-semibold leading-tight tracking-tight"
            style={{ fontSize: "clamp(1.3rem, 2.4vw, 2.8rem)" }}
          >
            Automatic detection of uterine anatomical landmarks in pelvic MRI
          </h3>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/thesis/uterus"
              className="inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
            >
              <BookOpen size={15} /> Imeplentation Details
            </a>
            <a
              href="/projects/uterus-demo"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-pink-400 hover:text-pink-400"
            >
              Live demo <ArrowUpRight size={15} />
            </a>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { value: "4.52 mm", label: "Overall mean error", sub: "192 landmarks evaluated" },
            { value: "2.90 mm", label: "Best landmark precision", sub: "Cavity Cervix" },
            { value: "3.66 mm", label: "Median localization error", sub: "All 6 landmarks" },
            { value: "32", label: "Multi-protocol test cases", sub: "3 acquisition protocols" },
          ].map((m, i) => <MetricCard key={m.label} {...m} delay={i * 0.07} />)}
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div className="flex flex-col gap-10">
            {[
              { icon: Target,       title: "Problem Statement", body: "Uterine biometry — measuring fundal thickness, body length, cervical length, and AP diameter — is essential for managing endometrial cancer, fibroids, and endometriosis, yet is performed manually with high inter-observer variability. No prior automated 3D approach existed for multi-landmark localization." },
              { icon: FlaskConical, title: "Approach",          body: "Built the preprocessing pipeline used across the entire project, handling raw MRI data from three different scanner protocols. Using an nnU-Net v2 uterine segmentation as a region of interest, trained a multi-decoder 3D U-Net with a shared encoder and independent decoder branches for each landmark group, predicting six uterine landmarks simultaneously. Introduced SharpHeatmapLoss — a custom loss combining MSE with a cubic penalty term that forces sharply peaked heatmaps — and ROI-guided inference using uterine segmentation masks to eliminate background noise." },
              { icon: BarChart3,    title: "Results",           body: "Achieved 4.52 mm overall mean error across 192 landmarks and 32 test cases from 3 acquisition protocols. Cavity Cervix and Cavity Fundus reached sub-3 mm precision. Landmark detection contributed directly to a real-time reporting pipeline achieving end-to-end results in under 60 seconds, submitted to IEEE Transactions on Medical Imaging." },
            ].map((s, i) => <NarrativeItem key={s.title} {...s} delay={i * 0.08} />)}
            <StackChips stack={["Python", "PyTorch", "3D U-Net", "SharpHeatmapLoss", "NIfTI", "nibabel", "SciPy", "3D Slicer"]} />
          </div>

          <motion.div
            initial={{ scale: 0.96 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <p style={{ fontSize: "clamp(0.7rem, 0.8vw, 0.85rem)" }} className="mb-4 uppercase tracking-widest text-zinc-600">
              Model output · real predictions
            </p>
            <UterusShowcase />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
