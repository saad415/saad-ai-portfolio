"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Target, FlaskConical, BarChart3 } from "lucide-react";
import SpineShowcase from "./SpineShowcase";

const metrics = [
  { value: "96%",  label: "Detection accuracy", sub: "on held-out test set" },
  { value: "0.94", label: "Mean Dice score",     sub: "vertebral segmentation" },
  { value: "1.4s", label: "Inference latency",   sub: "per volume, API avg" },
  { value: "3D",   label: "U-Net architecture",  sub: "multi-task, end-to-end" },
];

const sections = [
  {
    icon: Target,
    title: "Problem Statement",
    body: "Automated vertebral landmark detection in sacral MRI remains challenging due to high variability in patient positioning, signal intensity, and partial field-of-view scans. Manual labelling by radiologists is slow and prone to inter-observer disagreement.",
  },
  {
    icon: FlaskConical,
    title: "Approach",
    body: "Designed a multi-task 3D U-Net that jointly predicts vertebral heatmaps and segmentation masks from volumetric MRI. Training used a curriculum strategy with synthetic augmentation — random affine, bias-field, and k-space dropout — to handle low-signal edge cases.",
  },
  {
    icon: BarChart3,
    title: "Results",
    body: "Achieved 96% landmark detection accuracy and 0.94 mean Dice on the hold-out set, outperforming previous atlas-based baselines by +11 pp. The trained model is deployed via FastAPI and serves live predictions on this portfolio.",
  },
];

export default function ResearchSection() {
  return (
    <section id="research" className="relative w-full px-[5vw] py-28">
      <div className="pointer-events-none absolute right-0 top-1/2 h-96 w-96 translate-x-1/3 -translate-y-1/2 rounded-full bg-green-400/5 blur-[100px]" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-green-400">
          Master's Thesis · 2024
        </p>
        <h2
          className="max-w-3xl font-semibold leading-tight tracking-tight"
          style={{ fontSize: "clamp(1.6rem, 3vw, 3.5rem)" }}
        >
          Automated vertebral landmark detection in sacral MRI using deep learning
        </h2>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/thesis.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-green-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-green-300"
          >
            <BookOpen size={15} /> Read thesis
          </a>
          <a
            href="/projects/spine-demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-green-400 hover:text-green-400"
          >
            Live demo <ArrowUpRight size={15} />
          </a>
        </div>
      </motion.div>

      {/* Metrics row */}
      <div className="mb-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <p style={{ fontSize: "clamp(1.4rem, 2.5vw, 2.2rem)" }} className="font-bold text-green-400">
              {m.value}
            </p>
            <p style={{ fontSize: "clamp(0.9rem, 1vw, 1.1rem)" }} className="mt-1 font-medium text-white">{m.label}</p>
            <p style={{ fontSize: "clamp(0.8rem, 0.85vw, 0.95rem)" }} className="mt-0.5 text-zinc-500">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Body: narrative LEFT · SpineShowcase RIGHT */}
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">

        {/* Left: narrative */}
        <div className="flex flex-col gap-10">
          {sections.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex gap-5"
            >
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Icon size={18} className="text-green-400" />
              </span>
              <div>
                <h3 style={{ fontSize: "clamp(1.1rem, 1.4vw, 1.5rem)" }} className="font-semibold text-white">{title}</h3>
                <p style={{ fontSize: "clamp(0.95rem, 1.1vw, 1.2rem)" }} className="mt-3 leading-8 text-zinc-400">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right: live MRI carousel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
            Model output · live inference
          </p>
          <SpineShowcase />
        </motion.div>

      </div>
    </section>
  );
}