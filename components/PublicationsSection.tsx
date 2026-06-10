"use client";

import { motion } from "framer-motion";
import { FileText, X } from "lucide-react";
import { useState } from "react";

const publications = [
  {
    authors:
      "Deepak Bhatia, Saad Ahmad, Smiti Tripathy, Maria Camila Bustos Vivas, Lieselotte Kratzsch, Anika Knupfer, Jordina Aviles Verdera, Susanne Schulz-Heise, Matthias May, and Jana Hutter",
    title:
      "Female-RHINO: A Real-Time Scanner-Integrated Framework for Automated Quantitative Uterine MRI Analysis and Structured Reporting",
    venue: "IEEE Journal of Biomedical and Health Informatics",
    year: "2026",
    abstract:
      "Standardized assessment of uterine MRI remains challenging due to anatomical variability, observer dependence, and the lack of workflow-integrated automated analysis tools. This work presents Female-RHINO: (R)eproductive (H)ealth (I)maging A(N)alysis T(O)ol, a real-time AI-assisted framework for automated quantitative uterine MRI analysis and structured reporting during image acquisition. We present an end-to-end system that integrates inline communication with the MRI scanner and deep learning-based analysis to derive quantitative uterine biomarkers from sagittal T2-weighted pelvic MRI. The framework combines segmentation and anatomical landmark detection models trained and evaluated on more than 500 multi-center datasets spanning diverse protocols, vendors, and patient populations. It performs volumetry, detects and quantifies common incidental findings such as fibroids and Nabothian cysts, and extracts six anatomical landmarks for biometric assessment. Results are compiled into a structured, clinician-oriented report with integrated visualizations, without manual interaction. Evaluation on independent retrospective and prospective cohorts demonstrated robust performance across varying acquisition settings. Mean Dice similarity coefficients were 0.82 for the uterus and 0.80 for fibroids, with lower but consistent agreement for Nabothian cysts. Landmark detection achieved a mean radial error of 3.7 mm. End-to-end processing was completed in under 60 seconds, enabling availability of results during the ongoing scan. Prospective deployment yielded immediate, standardized, and reproducible analyses supported by inter-observer agreement. The proposed system enables real-time, scanner-integrated AI for automated uterine MRI analysis and reporting, with potential to improve standardization, efficiency, and clinical workflow in pelvic imaging.",
  },
];

export default function PublicationsSection() {
  const [selectedPublication, setSelectedPublication] = useState<(typeof publications)[number] | null>(null);

  return (
    <section id="publications" className="relative w-full px-[5vw] py-28">
      <motion.div
        initial={{ y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-teal-300">
          Research output
        </p>
        <h2
          className="font-semibold tracking-tight"
          style={{ fontSize: "clamp(1.6rem, 3vw, 3rem)" }}
        >
          Publications
        </h2>
      </motion.div>

      <div className="flex flex-col gap-5">
        {publications.map((publication, index) => (
          <motion.button
            key={publication.title}
            type="button"
            onClick={() => setSelectedPublication(publication)}
            initial={{ y: 24 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className="w-full rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-8 text-left transition hover:border-teal-300/30 hover:bg-[#0d1518]/75 focus:border-teal-300/50 focus:outline-none"
            aria-label={`Open abstract for ${publication.title}`}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
                <FileText size={19} className="text-teal-300" />
              </span>

              <div>
                <p className="text-sm leading-6 text-zinc-500">
                  {publication.authors}
                </p>
                <h3
                  className="mt-2 max-w-5xl font-semibold leading-snug text-white"
                  style={{ fontSize: "clamp(1.05rem, 1.4vw, 1.45rem)" }}
                >
                  {publication.title}
                </h3>
                <p className="mt-3 text-sm font-medium text-teal-300">
                  {publication.venue}, {publication.year}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Click to read abstract
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {selectedPublication && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publication-abstract-title"
          onClick={() => setSelectedPublication(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="themed-scrollbar max-h-[86vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#070a0d] p-6 shadow-2xl shadow-black/50 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-300/10">
                <FileText size={19} className="text-teal-300" />
              </span>
              <button
                type="button"
                onClick={() => setSelectedPublication(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-zinc-300 transition hover:border-teal-300/60 hover:text-teal-200"
                aria-label="Close abstract"
              >
                <X size={17} />
              </button>
            </div>

            <p className="mt-6 text-sm leading-6 text-zinc-500">
              {selectedPublication.authors}
            </p>
            <h3
              id="publication-abstract-title"
              className="mt-3 max-w-3xl font-semibold leading-tight text-white"
              style={{ fontSize: "clamp(1.35rem, 2.5vw, 2.25rem)" }}
            >
              {selectedPublication.title}
            </h3>
            <p className="mt-4 text-sm font-semibold text-teal-300">
              {selectedPublication.venue}, {selectedPublication.year}
            </p>

            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">
                Abstract
              </p>
              <p className="mt-4 text-lg leading-9 text-zinc-200">
                {selectedPublication.abstract}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}
