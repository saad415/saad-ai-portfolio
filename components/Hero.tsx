"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";

export default function Hero() {
  return (
    <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center overflow-hidden px-6 pt-24">
      
      {/* Background Glow Effects */}
      <div className="pointer-events-none absolute right-10 top-32 h-72 w-72 rounded-full bg-green-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-32 left-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

      {/* Small Intro */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-4 text-sm uppercase tracking-[0.35em] text-green-400"
      >
        AI Engineer • Deep Learning • Full Stack AI Systems
      </motion.p>

      {/* Main Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="max-w-5xl text-5xl font-bold leading-tight md:text-7xl"
      >
        Building interactive AI systems from research models to production apps.
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="mt-6 max-w-3xl text-lg leading-8 text-gray-400 md:text-xl"
      >
        I develop deep learning models, medical imaging pipelines, and
        deployable full-stack AI applications using PyTorch, FastAPI,
        React, Next.js, Docker, GitHub Actions, and cloud-native engineering.
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="mt-10 flex flex-wrap gap-4"
      >
        {/* Projects Button */}
        <a
          href="#projects"
          className="inline-flex items-center gap-2 rounded-full bg-green-400 px-6 py-3 font-semibold text-black transition hover:bg-green-300"
        >
          View Projects <ArrowRight size={18} />
        </a>

        {/* GitHub Button */}
        <a
          href="https://github.com/saad415"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:border-green-400 hover:text-green-400"
        >
          <FaGithub size={18} />
          GitHub
        </a>

        {/* LinkedIn / Contact Button */}
        <a
          href="#contact"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:border-green-400 hover:text-green-400"
        >
          <FaLinkedin size={18} />
          Contact
        </a>
      </motion.div>
    </section>
  );
}