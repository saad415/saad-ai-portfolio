"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Target, FlaskConical, BarChart3 } from "lucide-react";
import SpineShowcase from "./SpineShowcase";
import UterusShowcase from "./UterusShowcase";

/* ── shared sub-components ── */

const SectionTag = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 text-xs uppercase tracking-[0.3em] text-green-400">{children}</p>
);

const MetricCard = ({
  value, label, sub, delay,
}: { value: string; label: string; sub: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
  >
    <p style={{ fontSize: "clamp(1.2rem, 2vw, 2.2rem)" }} className="font-bold text-green-400">{value}</p>
    <p style={{ fontSize: "clamp(0.85rem, 1vw, 1.05rem)" }} className="mt-1 font-medium text-white">{label}</p>
    <p style={{ fontSize: "clamp(0.75rem, 0.85vw, 0.9rem)" }} className="mt-0.5 text-zinc-500">{sub}</p>
  </motion.div>
);

const NarrativeItem = ({
  icon: Icon, title, body, delay,
}: { icon: React.ElementType; title: string; body: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -16 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="flex gap-5"
  >
    <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
      <Icon size={18} className="text-green-400" />
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
      <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400">{t}</span>
    ))}
  </div>
);

/* ── Main component ── */

export default function ResearchSection() {
  return (
    <section id="research" className="relative w-full px-[5vw] py-28">
      <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 translate-x-1/3 rounded-full bg-green-400/5 blur-[100px]" />
      <div className="pointer-events-none absolute left-0 bottom-1/4 h-80 w-80 -translate-x-1/3 rounded-full bg-green-400/4 blur-[90px]" />

      {/* ── Section heading ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-20"
      >
        <SectionTag>Research</SectionTag>
        <h2
          className="font-semibold leading-tight tracking-tight"
          style={{ fontSize: "clamp(1.6rem, 3vw, 3.5rem)" }}
        >
          Master's Theses
        </h2>
        <p style={{ fontSize: "clamp(0.9rem, 1.05vw, 1.1rem)" }} className="mt-3 text-zinc-500">
          FAU Erlangen-Nuremberg · Smart Imaging Lab · Supervisor: Prof. Dr. Jana Hutter
        </p>
      </motion.div>

      {/* ══════════════════════════════════════════
          THESIS I — Spine / Sacral MRI
      ══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-10">
          <SectionTag>Thesis I · Sacral MRI · 2024</SectionTag>
          <h3
            className="max-w-3xl font-semibold leading-tight tracking-tight"
            style={{ fontSize: "clamp(1.3rem, 2.4vw, 2.8rem)" }}
          >
            Automated vertebral landmark detection in sacral MRI using deep learning
          </h3>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/thesis/spine"
              className="inline-flex items-center gap-2 rounded-full bg-green-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-green-300"
            >
              <BookOpen size={15} /> Imeplentation Details
            </a>
            <a
              href="/projects/spine-demo"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-green-400 hover:text-green-400"
            >
              Live demo <ArrowUpRight size={15} />
            </a>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { value: "96%",  label: "Detection accuracy", sub: "on held-out test set" },
            { value: "0.94", label: "Mean Dice score",     sub: "vertebral segmentation" },
            { value: "1.4s", label: "Inference latency",   sub: "per volume, API avg" },
            { value: "3D",   label: "U-Net architecture",  sub: "multi-task, end-to-end" },
          ].map((m, i) => <MetricCard key={m.label} {...m} delay={i * 0.07} />)}
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div className="flex flex-col gap-10">
            {[
              { icon: Target,       title: "Problem Statement", body: "Automated vertebral landmark detection in sacral MRI remains challenging due to high variability in patient positioning, signal intensity, and partial field-of-view scans. Manual labelling by radiologists is slow and prone to inter-observer disagreement." },
              { icon: FlaskConical, title: "Approach",          body: "Designed a multi-task 3D U-Net that jointly predicts vertebral heatmaps and segmentation masks from volumetric MRI. Training used a curriculum strategy with synthetic augmentation — random affine, bias-field, and k-space dropout — to handle low-signal edge cases." },
              { icon: BarChart3,    title: "Results",           body: "Achieved 96% landmark detection accuracy and 0.94 mean Dice on the hold-out set, outperforming previous atlas-based baselines by +11 pp. The trained model is deployed via FastAPI and serves live predictions on this portfolio." },
            ].map((s, i) => <NarrativeItem key={s.title} {...s} delay={i * 0.08} />)}
            <StackChips stack={["Python", "PyTorch", "3D U-Net", "FastAPI", "Docker", "NIfTI", "nibabel"]} />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
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
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-10">
          <SectionTag>Thesis II · Pelvic MRI · Sep 2025 – Mar 2026</SectionTag>
          <h3
            className="max-w-3xl font-semibold leading-tight tracking-tight"
            style={{ fontSize: "clamp(1.3rem, 2.4vw, 2.8rem)" }}
          >
            Automatic detection of uterine anatomical landmarks in pelvic MRI
          </h3>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/thesis/uterus"
              className="inline-flex items-center gap-2 rounded-full bg-green-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-green-300"
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
            { value: "4.52mm", label: "Overall mean error",  sub: "192 landmarks evaluated" },
            { value: "2.90mm", label: "Best: Cavity Cervix", sub: "highest precision" },
            { value: "3.66mm", label: "Median error",        sub: "all 6 landmarks" },
            { value: "32",     label: "Test cases",          sub: "3 acquisition protocols" },
          ].map((m, i) => <MetricCard key={m.label} {...m} delay={i * 0.07} />)}
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div className="flex flex-col gap-10">
            {[
              { icon: Target,       title: "Problem Statement", body: "Uterine biometry — measuring fundal thickness, body length, cervical length, and AP diameter — is essential for managing endometrial cancer, fibroids, and endometriosis, yet is performed manually with high inter-observer variability. No prior automated 3D approach existed for multi-landmark localization." },
              { icon: FlaskConical, title: "Approach",          body: "Proposed a segmentation-guided multi-decoder 3D U-Net predicting six uterine landmarks simultaneously. Introduced SharpHeatmapLoss — a custom loss combining MSE with a cubic penalty term that forces sharply peaked heatmaps — and ROI-guided inference using uterine segmentation masks to eliminate background noise." },
              { icon: BarChart3,    title: "Results",           body: "Achieved 4.52 mm overall mean error across 192 landmarks and 32 test cases from 3 acquisition protocols. Cavity Cervix and Cavity Fundus reached sub-3 mm precision. Enables reproducible uterine biometry at scale, reducing inter-reader variability in fibroid monitoring and endometriosis staging." },
            ].map((s, i) => <NarrativeItem key={s.title} {...s} delay={i * 0.08} />)}
            <StackChips stack={["Python", "PyTorch", "3D U-Net", "SharpHeatmapLoss", "NIfTI", "nibabel", "SciPy", "3D Slicer"]} />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
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
