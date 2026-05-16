"use client";

import { ArrowRight, MapPin, Download } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import Image from "next/image";

const roles = ["AI Engineer", "Medical Imaging Researcher", "Full-Stack Developer"];

const stats = [
  { value: "3D",   label: "MRI Analysis" },
  { value: "96%",  label: "Model Accuracy" },
  { value: "Live", label: "Inference API" },
];

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden px-[5vw] pt-20 pb-10">
      {/* Background glows */}
      <div className="pointer-events-none absolute left-0 top-0 h-[600px] w-[600px] -translate-x-1/4 -translate-y-1/4 rounded-full bg-green-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-96 w-96 translate-x-1/4 rounded-full bg-green-400/5 blur-[100px]" />

      {/* ── Hero: text left · photo right ── */}
      <div className="grid items-center gap-[4vw] lg:grid-cols-[1fr_40%] lg:min-h-[85vh]">

        {/* ── LEFT: text ── */}
        <div>
          <div className="anim-fade-up anim-delay-1 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-green-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-green-400">
              Available for opportunities
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <MapPin size={11} />
              Remote / Worldwide
            </span>
          </div>

          <h1
            className="anim-fade-up anim-delay-2 mt-4 font-semibold leading-[1.05] tracking-tight text-white"
            style={{ fontSize: "clamp(1.8rem, 4vw, 6rem)" }}
          >
            Saad Ahmad
          </h1>

          <div className="anim-fade-up anim-delay-3 mt-3 flex items-center gap-3">
            <span className="h-px w-8 bg-green-400/50" />
            <span
              className="font-medium text-green-400"
              style={{ fontSize: "clamp(0.8rem, 1.2vw, 1.2rem)" }}
            >
              {roles[0]} &nbsp;·&nbsp; {roles[1]}
            </span>
          </div>

          <p
            className="anim-fade-up anim-delay-4 mt-5 leading-7 text-zinc-400"
            style={{ fontSize: "clamp(0.95rem, 1.2vw, 1.25rem)", maxWidth: "55ch" }}
          >
            I build AI systems that move from research notebooks to usable products —
            spanning deep learning, medical image analysis, backend inference APIs,
            and interactive web interfaces.
          </p>

          {/* Quick stats */}
          <div className="anim-fade-up anim-delay-5 mt-8 flex flex-wrap gap-10">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span
                  className="font-bold text-white"
                  style={{ fontSize: "clamp(1.2rem, 2vw, 2.5rem)" }}
                >
                  {s.value}
                </span>
                <span className="text-xs text-zinc-500">{s.label}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="anim-fade-up anim-delay-6 mt-8 flex flex-wrap gap-3">
            <a
              href="/projects/spine-demo"
              className="inline-flex items-center gap-2 rounded-full bg-green-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-green-300"
            >
              Try spine AI demo <ArrowRight size={16} />
            </a>
            <a
              href="#projects"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-green-400 hover:text-green-400"
            >
              View projects
            </a>
            <a
              href="/Saad_Ahmad_CV.pdf"
              download
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-green-400 hover:text-green-400"
            >
              <Download size={15} /> CV
            </a>
            <a
              href="https://github.com/saad415"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-green-400 hover:text-green-400"
            >
              <FaGithub size={16} />
            </a>
            <a
              href="https://linkedin.com/in/saad-ahmad"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-green-400 hover:text-green-400"
            >
              <FaLinkedin size={16} />
            </a>
          </div>
        </div>

        {/* ── RIGHT: photo scales with viewport ── */}
        <div
          className="anim-fade-up anim-delay-1 relative w-full"
          style={{ height: "clamp(320px, 70vh, 780px)" }}
        >
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-green-400/15 via-transparent to-green-400/5 blur-xl" />
          <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10">
            <Image
              src="/profile.png"
              alt="Saad Ahmad"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-top"
              priority
            />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
          <div className="absolute -bottom-3 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/90 px-4 py-2 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]" />
            <span className="text-xs font-medium text-zinc-300">Available for hire</span>
          </div>
        </div>

      </div>

    </section>
  );
}
