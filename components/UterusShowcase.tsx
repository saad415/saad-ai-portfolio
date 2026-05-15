"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Brain, ChevronLeft, ChevronRight } from "lucide-react";

const samples = [
  {
    id: "uterus-01",
    title: "Sagittal MRI · landmarks overlaid",
    image: "/showcase/spine/uterus1.png",
    labels: ["APD-1", "APD-2", "Fundus Outer"],
  },
  {
    id: "uterus-02",
    title: "Cervical region · cavity detected",
    image: "/showcase/spine/uterus2.png",
    labels: ["Cavity Cervix", "Inner OS"],
  },
  {
    id: "uterus-03",
    title: "Full landmark set · 6 points",
    image: "/showcase/spine/uterus3.png",
    labels: ["APD-1", "APD-2", "Cavity Fundus", "Inner OS"],
  },
  {
    id: "uterus-04",
    title: "Rare acquisition protocol",
    image: "/showcase/spine/uterus4.png",
    labels: ["Fundus Outer", "Cavity Cervix", "Cavity Fundus"],
  },
];

export default function UterusShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = samples[activeIndex];

  const goPrevious = () =>
    setActiveIndex((i) => (i === 0 ? samples.length - 1 : i - 1));

  const goNext = () =>
    setActiveIndex((i) => (i === samples.length - 1 ? 0 : i + 1));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((i) => (i === samples.length - 1 ? 0 : i + 1));
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-pink-950/30 backdrop-blur">
      <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
        <span>MODEL OUTPUT · REAL PREDICTIONS</span>
        <span className="rounded-full bg-pink-400/10 px-3 py-1 text-pink-400">
          6 landmarks
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="relative aspect-[16/10] bg-black">
          <Image
            key={active.id}
            src={active.image}
            alt={active.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={activeIndex === 0}
            className="object-contain p-3 transition duration-700 ease-out"
          />

          <div className="absolute left-4 top-4 z-20 rounded-full border border-pink-400/20 bg-black/70 px-3 py-1 text-xs text-pink-300 backdrop-blur">
            {active.title}
          </div>

          <button
            onClick={goPrevious}
            className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-300 backdrop-blur transition hover:border-pink-400 hover:text-pink-400"
            aria-label="Previous MRI sample"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-300 backdrop-blur transition hover:border-pink-400 hover:text-pink-400"
            aria-label="Next MRI sample"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-4 left-4 right-4 z-20 grid gap-2 rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Brain size={14} className="text-pink-400" />
              <span>Multi-decoder 3D U-Net · SharpHeatmapLoss</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {active.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-pink-400/10 px-2 py-1 text-xs text-pink-300"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {samples.map((sample, index) => (
          <button
            key={sample.id}
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition-all ${
              active.id === sample.id
                ? "w-8 bg-pink-400"
                : "w-2.5 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Show ${sample.title}`}
          />
        ))}
      </div>
    </div>
  );
}
