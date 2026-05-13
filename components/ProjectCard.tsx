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
      whileHover={{ y: -8 }}
      transition={{ duration: 0.25 }}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-400/0 via-transparent to-blue-500/0 opacity-0 transition duration-500 group-hover:opacity-100 group-hover:from-green-400/10 group-hover:to-blue-500/10" />

      {/* Category */}
      <p className="relative z-10 text-sm uppercase tracking-widest text-green-400">
        {category}
      </p>

      {/* Title */}
      <div className="relative z-10 mt-4 flex items-start justify-between gap-4">
        <h3 className="text-2xl font-bold text-white transition group-hover:text-green-400">
          {title}
        </h3>

        <ArrowUpRight className="transition group-hover:text-green-400 group-hover:translate-x-1 group-hover:-translate-y-1" />
      </div>

      {/* Description */}
      <p className="relative z-10 mt-5 leading-7 text-gray-400">
        {description}
      </p>

      {/* Tech stack */}
      <div className="relative z-10 mt-6 flex flex-wrap gap-2">
        {tech.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-gray-300"
          >
            {item}
          </span>
        ))}
      </div>
    </motion.a>
  );
}