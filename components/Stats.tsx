"use client";

import { motion } from "framer-motion";

const stats = [
  {
    number: "10+",
    label: "Deep Learning Projects",
  },
  {
    number: "3D",
    label: "Medical Imaging Pipelines",
  },
  {
    number: "Full Stack",
    label: "AI Systems Development",
  },
  {
    number: "CI/CD",
    label: "Cloud & Deployment Skills",
  },
];

export default function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-32">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: false, amount: 0 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl"
          >
            <h3 className="text-4xl font-bold text-green-400">
              {stat.number}
            </h3>

            <p className="mt-3 text-lg text-gray-400">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}