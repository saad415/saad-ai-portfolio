"use client";

import { motion } from "framer-motion";
import { ArrowRight, Activity, Brain, Server } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import SpineShowcase from "./SpineShowcase";

const pipeline = [
  { icon: Brain, label: "3D MRI input" },
  { icon: Activity, label: "Landmark inference" },
  { icon: Server, label: "FastAPI + PyTorch" },
];

export default function Hero() {
  return (
    <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-16 overflow-hidden px-6 pt-28 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="pointer-events-none absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-green-400/10 blur-3xl" />

      <div>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 text-sm uppercase tracking-[0.35em] text-green-400"
        >
          AI Systems • Medical Imaging • Full Stack Inference
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-balance text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl"
        >
          Building AI systems that move from research notebooks to usable products.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400"
        >
          I work across deep learning, medical image analysis, backend inference
          APIs, and interactive web interfaces — turning trained models into
          systems people can actually use.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-wrap gap-4"
        >
          <a
            href="/projects/spine-demo"
            className="inline-flex items-center gap-2 rounded-full bg-green-400 px-6 py-3 font-semibold text-black transition hover:bg-green-300"
          >
            Try spine AI demo <ArrowRight size={18} />
          </a>

          <a
            href="#projects"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition hover:border-green-400 hover:text-green-400"
          >
            View systems
          </a>

          <a
            href="https://github.com/saad415"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition hover:border-green-400 hover:text-green-400"
          >
            <FaGithub size={18} />
            GitHub
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7 }}
      >
        <SpineShowcase />
      </motion.div>
    </section>
  );
}