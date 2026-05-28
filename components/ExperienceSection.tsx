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
    company: "Smart Imaging Lab, Universitatsklinikum Erlangen",
    role: "Research Assistant (Master's Thesis)",
    period: "09/2025 - 03/2026",
    location: "Erlangen, Germany",
    bullets: [
      "Designed a 3D dual-decoder U-Net for automatic lumbosacral vertebral landmark localization in pelvic MRI, achieving 4.21 mm mean localization error across multi-center datasets.",
      "Developed dual- and triple-decoder 3D U-Net architectures for uterine landmark detection, achieving 4.52 mm mean landmark error across three MRI acquisition protocols.",
      "Validated deep learning models on multi-center, multi-vendor pelvic MRI datasets (0.55T-3T) across heterogeneous clinical imaging protocols.",
    ],
  },
  {
    company: "Sofitsians",
    role: "AI Engineer",
    period: "04/2024 - 02/2025",
    location: "Remote",
    bullets: [
      "Developed AI-powered applications using LLMs, OpenAI APIs, and React.js for intelligent user experiences.",
      "Built and integrated RESTful APIs, RAG pipelines, and semantic search systems for AI-driven solutions.",
      "Implemented AI workflow automation with prompt engineering, model integration, and frontend components to streamline user interactions.",
    ],
  },
  {
    company: "Sofitsians",
    role: "Software Developer (.NET)",
    period: "11/2019 - 01/2021",
    location: "Islamabad, Pakistan - On-site",
    bullets: [
      "Developed and maintained full-stack web applications using C#, ASP.NET MVC, and SQL Server for enterprise-level business workflows.",
      "Designed and optimized relational database schemas, stored procedures, and complex SQL queries to improve application performance and data reliability.",
      "Built and integrated REST APIs and backend services to support scalable frontend and third-party system integrations.",
    ],
  },
];

export default function ExperienceSection() {
  return (
    <section id="experience" className="relative w-full px-[5vw] py-28">
      <div className="pointer-events-none absolute left-0 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-300/6 blur-[90px]" />

      {/* Header */}
      <motion.div
        initial={{ y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6 }}
        className="mb-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-teal-300">Career</p>
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
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-teal-300/60 hover:bg-teal-300/10 hover:text-teal-200"
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
                      ? "border-teal-300 bg-teal-300/15 shadow-[0_0_10px_2px_rgba(45,212,191,0.22)]"
                      : "border-white/20 bg-[#070a0d]"
                  }`}
                >
                  <Briefcase size={11} className={exp.current ? "text-teal-300" : "text-zinc-500"} />
                </span>
              </div>

              {/* Card */}
              <div className="flex-1 rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-8 pb-9">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 style={{ fontSize: "clamp(1.1rem, 1.4vw, 1.5rem)" }} className="font-semibold text-white">{exp.role}</h3>
                      {exp.current && (
                        <span className="rounded-full bg-teal-300/12 px-2.5 py-0.5 text-xs font-medium text-teal-300">
                          Current
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "clamp(0.95rem, 1.1vw, 1.2rem)" }} className="mt-1 font-medium text-teal-300">{exp.company}</p>
                  </div>
                  <div className="text-right text-zinc-500" style={{ fontSize: "clamp(0.85rem, 1vw, 1.05rem)" }}>
                    <p>{exp.period}</p>
                    <p>{exp.location}</p>
                  </div>
                </div>

                <ul className="mt-6 flex flex-col gap-3">
                  {exp.bullets.map((b, j) => (
                    <li key={j} className="flex gap-3 leading-7 text-zinc-400" style={{ fontSize: "clamp(0.9rem, 1.05vw, 1.15rem)" }}>
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300/50" />
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
