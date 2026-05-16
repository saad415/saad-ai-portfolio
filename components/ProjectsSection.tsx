"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const FILTERS = ["All", "AI/ML", "Full Stack", "Data Engineering", "Research"] as const;
type Filter = (typeof FILTERS)[number];

export default function ProjectsSection({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<Filter>("All");
  const [restoreKey, setRestoreKey] = useState(0);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      setActive("All");
      setRestoreKey((key) => key + 1);
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const filtered =
    active === "All" ? projects : projects.filter((p) => p.categoryTag === active);

  return (
    <section
      key={restoreKey}
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
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-green-400">
          Selected work
        </p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2
            className="font-semibold tracking-tight"
            style={{ fontSize: "clamp(1.6rem, 3vw, 3rem)" }}
          >
            Featured Projects
          </h2>

          {/* Animated filter tabs */}
          <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActive(f)}
                className={`relative rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  active === f ? "text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                {active === f && (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 rounded-xl bg-green-400"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{f}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ y: 16 }}
          animate={{ y: 0 }}
          exit={{ y: -8 }}
          transition={{ duration: 0.3 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch"
        >
          {filtered.map((project, i) => (
            <motion.div
              key={project.title}
              initial={{ y: 24 }}
              animate={{ y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className="h-full"
            >
              <ProjectCard {...project} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-zinc-600">No projects in this category yet.</p>
      )}
    </section>
  );
}
