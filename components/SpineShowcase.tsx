"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Brain, ChevronLeft, ChevronRight } from "lucide-react";
import { spineProject } from "@/app/projects/spine-demo/spine_details";
const samples = [
  {
    id: "case-01",
    title: "Sagittal MRI • S1 detected",
    image: "/showcase/spine/image1.png",
    confidence: "0.96",
    labels: ["S2", "S3", "S4", "S5"],
  },
  {
    id: "case-02",
    title: "Lumbar-sacral overlay",
    image: "/showcase/spine/image2.png",
    confidence: "0.94",
    labels: ["L4", "L5", "S1"],
  },
  {
    id: "case-03",
    title: "Filtered outliers",
    image: "/showcase/spine/image4.png",
    confidence: "0.91",
    labels: ["L5", "S1"],
  },
  {
    id: "case-04",
    title: "Multi-label detection",
    image: "/showcase/spine/image5.png",
    confidence: "0.93",
    labels: ["L5", "S1", "S2"],
  },
  {
    id: "case-05",
    title: "Low-signal case",
    image: "/showcase/spine/image6.png",
    confidence: "0.89",
    labels: ["S1", "S2"],
  },
  {
    id: "case-06",
    title: "Anchored S1 sequence",
    image: "/showcase/spine/case-06.png",
    confidence: "0.95",
    labels: ["L5", "S1"],
  },
];

export default function SpineShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);

  const active = samples[activeIndex];

  const goPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? samples.length - 1 : currentIndex - 1
    );
  };

  const goNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === samples.length - 1 ? 0 : currentIndex + 1
    );
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) =>
        currentIndex === samples.length - 1 ? 0 : currentIndex + 1
      );
    }, 1500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-green-950/30 backdrop-blur">
      <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
        <span>LIVE SYSTEM SNAPSHOT</span>

        <span className="rounded-full bg-green-400/10 px-3 py-1 text-green-400">
          inference-ready
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="relative aspect-[4/3] bg-black">
          <Image
            key={active.id}
            src={active.image}
            alt={active.title}
            fill
            priority={activeIndex === 0}
            className="object-contain p-3 transition duration-700 ease-out"
          />

          <div className="absolute left-4 top-4 z-20 rounded-full border border-green-400/20 bg-black/70 px-3 py-1 text-xs text-green-300 backdrop-blur">
            {active.title}
          </div>

          <button
            onClick={goPrevious}
            className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-300 backdrop-blur transition hover:border-green-400 hover:text-green-400"
            aria-label="Previous MRI sample"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-300 backdrop-blur transition hover:border-green-400 hover:text-green-400"
            aria-label="Next MRI sample"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-4 left-4 right-4 z-20 grid gap-2 rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="inline-flex items-center gap-2">
                <Brain size={14} className="text-green-400" />
                Multi-task 3D U-Net
              </span>

              <span>confidence {active.confidence}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {active.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-green-400/10 px-2 py-1 text-xs text-green-300"
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
                ? "w-8 bg-green-400"
                : "w-2.5 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Show ${sample.title}`}
          />
        ))}
      </div>
    </div>
  );
}