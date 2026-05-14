"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

type ProjectCardProps = {
  title: string;
  category: string;
  description: string;
  tech: string[];
  href: string;
};

export default function ProjectCard({
  title,
  category,
  description,
  tech,
  href,
}: ProjectCardProps) {
  return (
    <motion.a
      href={href}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8"
    >
      {/* Hover glow */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(600px circle at 50% 0%, rgba(74,222,128,0.08), transparent 60%)" }}
      />

      {/* Category */}
      <p className="relative z-10 text-sm font-medium uppercase tracking-widest text-green-400">
        {category}
      </p>

      {/* Title + arrow */}
      <div className="relative z-10 mt-5 flex items-start justify-between gap-4">
        <h3
          className="font-bold text-white transition-colors group-hover:text-green-400"
          style={{ fontSize: "clamp(1.3rem, 1.8vw, 1.7rem)" }}
        >
          {title}
        </h3>
        <ArrowUpRight
          size={24}
          className="mt-0.5 shrink-0 text-zinc-600 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-green-400"
        />
      </div>

      {/* Description */}
      <p className="relative z-10 mt-5 flex-1 text-base leading-7 text-zinc-400">
        {description}
      </p>

      {/* Tech stack */}
      <div className="relative z-10 mt-6 flex flex-wrap gap-2">
        {tech.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400"
          >
            {item}
          </span>
        ))}
      </div>
    </motion.a>
  );
}