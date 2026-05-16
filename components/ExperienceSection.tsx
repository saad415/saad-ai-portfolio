"use client";

import { motion } from "framer-motion";
import { Download, Briefcase } from "lucide-react";

type Experience = {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
  current?: boolean;
};

// ── Replace with your real experience ──
const experiences: Experience[] = [
  {
    company: "Your Company",
    role: "AI / ML Engineer",
    period: "Jan 2024 – Present",
    location: "Remote",
    current: true,
    bullets: [
      "Developed and deployed a 3D U-Net pipeline for vertebral landmark detection, serving live predictions via FastAPI.",
      "Reduced inference latency by 40% through model quantisation and async batching.",
      "Built end-to-end CI/CD pipeline with GitHub Actions and Docker for zero-downtime model updates.",
    ],
  },
  {
    company: "Previous Company",
    role: "Full-Stack Developer",
    period: "Jun 2022 – Dec 2023",
    location: "On-site",
    bullets: [
      "Architected and shipped React/Next.js web applications serving 10k+ monthly active users.",
      "Designed RESTful APIs with FastAPI and PostgreSQL; implemented JWT auth and role-based access.",
      "Mentored junior developers and led weekly code-review sessions.",
    ],
  },
  {
    company: "Research Lab / University",
    role: "Research Assistant — Medical Imaging",
    period: "Sep 2021 – May 2022",
    location: "University",
    bullets: [
      "Annotated and pre-processed 400+ sacral MRI volumes for deep learning dataset construction.",
      "Implemented baseline atlas-based landmark detection methods for benchmark comparison.",
    ],
  },
];

export default function ExperienceSection() {
  return (
    <section id="experience" className="relative w-full px-[5vw] py-28">
      <div className="pointer-events-none absolute left-0 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-400/5 blur-[90px]" />

      {/* Header */}
      <motion.div
        initial={{ y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6 }}
        className="mb-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-green-400">Career</p>
          <h2
            className="font-semibold tracking-tight"
            style={{ fontSize: "clamp(1.6rem, 3vw, 3.5rem)" }}
          >
            Work Experience
          </h2>
        </div>
        <a
          href="/Saad_Ahmad_CV.pdf"
          download
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-green-400 hover:text-green-400"
        >
          <Download size={15} /> Download CV
        </a>
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-px bg-white/8 sm:left-[19px]" />

        <div className="flex flex-col gap-10">
          {experiences.map((exp, i) => (
            <motion.div
              key={i}
              initial={{ x: -24 }}
              whileInView={{ x: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: i * 0.12, duration: 0.55 }}
              className="relative flex gap-6 sm:gap-8"
            >
              {/* Timeline dot */}
              <div className="relative z-10 mt-5 flex shrink-0 flex-col items-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                    exp.current
                      ? "border-green-400 bg-green-400/20 shadow-[0_0_10px_2px_rgba(74,222,128,0.25)]"
                      : "border-white/20 bg-black"
                  }`}
                >
                  <Briefcase size={11} className={exp.current ? "text-green-400" : "text-zinc-500"} />
                </span>
              </div>

              {/* Card */}
              <div className="flex-1 rounded-3xl border border-white/8 bg-white/[0.025] p-8 pb-9">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 style={{ fontSize: "clamp(1.1rem, 1.4vw, 1.5rem)" }} className="font-semibold text-white">{exp.role}</h3>
                      {exp.current && (
                        <span className="rounded-full bg-green-400/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
                          Current
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "clamp(0.95rem, 1.1vw, 1.2rem)" }} className="mt-1 font-medium text-green-400">{exp.company}</p>
                  </div>
                  <div className="text-right text-zinc-500" style={{ fontSize: "clamp(0.85rem, 1vw, 1.05rem)" }}>
                    <p>{exp.period}</p>
                    <p>{exp.location}</p>
                  </div>
                </div>

                <ul className="mt-6 flex flex-col gap-3">
                  {exp.bullets.map((b, j) => (
                    <li key={j} className="flex gap-3 leading-7 text-zinc-400" style={{ fontSize: "clamp(0.9rem, 1.05vw, 1.15rem)" }}>
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400/50" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
