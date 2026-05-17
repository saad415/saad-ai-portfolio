"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import Link from "next/link";

type ProjectCardProps = {
  title: string;
  category: string;
  categoryTag: string;
  description: string;
  tech: string[];
  href: string;
  pipeline?: string[];
};

const CATEGORY_COLORS: Record<string, string> = {
  "Data Engineering": "text-amber-300",
  "AI/ML":            "text-teal-300",
  "Full Stack":       "text-teal-300",
  "Research":         "text-teal-300",
};

const GLOW_COLORS: Record<string, string> = {
  "Data Engineering": "radial-gradient(600px circle at 50% 0%, rgba(252,211,77,0.08), transparent 60%)",
  default:            "radial-gradient(600px circle at 50% 0%, rgba(45,212,191,0.09), transparent 60%)",
};

export default function ProjectCard({
  title,
  category,
  categoryTag,
  description,
  tech,
  href,
  pipeline,
}: ProjectCardProps) {
  const categoryColor = CATEGORY_COLORS[categoryTag] ?? "text-teal-300";
  const glowBg = GLOW_COLORS[categoryTag] ?? GLOW_COLORS.default;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className="h-full"
    >
      <Link
        href={href}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b1014]/75 p-8 shadow-xl shadow-black/10 transition-colors hover:border-teal-300/20"
      >
        {/* Hover glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: glowBg }}
        />

        {/* Category */}
        <p className={`relative z-10 text-sm font-medium uppercase tracking-widest ${categoryColor}`}>
          {category}
        </p>

        {/* Title + arrow */}
        <div className="relative z-10 mt-5 flex items-start justify-between gap-4">
          <h3
            className={`font-bold text-white transition-colors group-hover:${categoryColor}`}
            style={{ fontSize: "clamp(1.3rem, 1.8vw, 1.7rem)" }}
          >
            {title}
          </h3>
          <ArrowUpRight
            size={24}
            className="mt-0.5 shrink-0 text-zinc-600 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-current"
          />
        </div>

        {/* Description */}
        <p className="relative z-10 mt-5 flex-1 text-base leading-7 text-zinc-400">
          {description}
        </p>

        {/* Pipeline flow */}
        {pipeline && pipeline.length > 0 && (
          <div className="relative z-10 mt-5 flex flex-wrap items-center gap-1.5">
            {pipeline.map((step, i) => (
              <span key={step} className="flex items-center gap-1.5">
                <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400">
                  {step}
                </span>
                {i < pipeline.length - 1 && (
                  <ChevronRight size={12} className="shrink-0 text-zinc-600" />
                )}
              </span>
            ))}
          </div>
        )}

        {/* Tech stack */}
        <div className="relative z-10 mt-5 flex flex-wrap gap-2">
          {tech.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-400"
            >
              {item}
            </span>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}
