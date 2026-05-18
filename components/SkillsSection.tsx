"use client";

import { motion } from "framer-motion";
import { BrainCircuit, CloudCog, Network, Workflow } from "lucide-react";

const skillGroups = [
  {
    title: "Deep Learning & AI",
    icon: BrainCircuit,
    skills: [
      "PyTorch",
      "MONAI",
      "nnUNet",
      "Swin-UNETR",
      "U-Net",
      "Heatmap Regression",
      "Medical Image Segmentation",
      "DICOM",
      "NIfTI",
    ],
  },
  {
    title: "Programming & Deployment",
    icon: CloudCog,
    skills: [
      "Python",
      "FastAPI",
      "Docker",
      "Linux",
      "REST APIs",
      "Git",
    ],
  },
  {
    title: "AI Systems & APIs",
    icon: Workflow,
    skills: [
      "OpenAI API",
      "RAG Pipelines",
      "Semantic Search",
      "LLM Applications",
    ],
  },
  {
    title: "Applied AI Engineering",
    icon: Network,
    skills: [
      "Prompt Engineering",
      "Agentic Workflows",
      "LLM Evaluation",
      "Vector Databases",
      "LangChain",
      "Model Deployment",
      "AI Automation",
    ],
  },
];

export default function SkillsSection() {
  return (
    <section id="skills" className="relative w-full px-[5vw] py-28">
      <div className="pointer-events-none absolute right-0 top-1/2 h-80 w-80 translate-x-1/3 -translate-y-1/2 rounded-full bg-emerald-300/5 blur-[90px]" />

      <motion.div
        initial={{ y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-teal-300">
          Technical stack
        </p>
        <h2
          className="font-semibold tracking-tight"
          style={{ fontSize: "clamp(1.6rem, 3vw, 3rem)" }}
        >
          Skills
        </h2>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {skillGroups.map((group, index) => {
          const Icon = group.icon;

          return (
            <motion.div
              key={group.title}
              initial={{ y: 24 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
              className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-7"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
                  <Icon size={18} className="text-teal-300" />
                </span>
                <h3
                  className="font-semibold text-white"
                  style={{ fontSize: "clamp(1.05rem, 1.25vw, 1.35rem)" }}
                >
                  {group.title}
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-400 transition hover:border-teal-300/50 hover:text-teal-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
