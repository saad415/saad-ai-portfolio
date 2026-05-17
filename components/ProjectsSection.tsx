"use client";

import { motion } from "framer-motion";
import ProjectCard from "./ProjectCard";

export type Project = {
  title: string;
  category: string;
  categoryTag: "AI/ML" | "Full Stack" | "Research" | "Data Engineering";
  description: string;
  tech: string[];
  href: string;
  pipeline?: string[];
};

export default function ProjectsSection({ projects }: { projects: Project[] }) {
  return (
    <section
      id="projects"
      className="relative w-full px-[5vw] py-28"
    >
      {/* Header */}
      <motion.div
        initial={{ y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-teal-300">
          Selected work
        </p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2
            className="font-semibold tracking-tight"
            style={{ fontSize: "clamp(1.6rem, 3vw, 3rem)" }}
          >
            Featured Projects
          </h2>
        </div>
      </motion.div>

      {/* Cards */}
      <motion.div
        initial={{ y: 16 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.3 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch"
      >
        {projects.map((project, i) => (
          <motion.div
            key={project.title}
            initial={{ y: 24 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="h-full"
          >
            <ProjectCard {...project} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
