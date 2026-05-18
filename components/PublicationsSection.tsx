"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";

const publications = [
  {
    authors:
      "Bhatia D., Ahmad S., Tripathy S., Bustos Vivas M.C., Kratzsch L., Knupfer A., Aviles Verdera J., Hutter J.",
    title:
      "Real-Time Automated Analysis and Reporting of Uterine Volumetry, Biometry, and Incidental Findings in Female Pelvic MRI",
    venue: "Submitted, IEEE Transactions on Medical Imaging",
    year: "2025",
  },
];

export default function PublicationsSection() {
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
          <motion.article
            key={publication.title}
            initial={{ y: 24 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-8"
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
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
