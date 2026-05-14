import { spineProject } from "@/app/projects/spine-demo/spine_details";

export default function SpineOverview() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24 text-zinc-300">
      {/* Problem */}
      <div className="mb-24">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-green-400">
          Problem
        </p>

        <h2 className="mb-6 text-3xl font-semibold text-white">
          Why pelvic MRI is difficult
        </h2>

        <p className="leading-8 text-zinc-400">
          {spineProject.problem.content}
        </p>
      </div>

      {/* Approach */}
      <div className="mb-24">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-green-400">
          Approach
        </p>

        <h2 className="mb-6 text-3xl font-semibold text-white">
          S1-anchored vertebra detection
        </h2>

        <p className="leading-8 text-zinc-400">
          {spineProject.innovation.content}
        </p>

        <ul className="mt-8 space-y-4">
          {spineProject.innovation.features.map((feature) => (
            <li key={feature.title}>
              <span className="font-semibold text-white">
                {feature.title}
              </span>
              <span className="text-zinc-400">
                {" "}
                — {feature.description}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pipeline */}
      <div className="mb-24">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-green-400">
          Pipeline
        </p>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <p className="leading-8 text-zinc-300">
            {spineProject.pipeline.join(" → ")}
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="mb-24">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-green-400">
          Results
        </p>

        <h2 className="mb-8 text-3xl font-semibold text-white">
          Per-vertebra performance
        </h2>

        <div className="overflow-hidden rounded-3xl border border-white/10">
          <table className="w-full text-left">
            <thead className="border-b border-white/10 bg-white/[0.03] text-zinc-400">
              <tr>
                <th className="p-5">Vertebra</th>
                <th className="p-5">Mean Error</th>
                <th className="p-5">≤5 mm</th>
                <th className="p-5">≤10 mm</th>
              </tr>
            </thead>

            <tbody>
              {spineProject.vertebraResults.map((row) => (
                <tr
                  key={row.vertebra}
                  className="border-b border-white/5"
                >
                  <td className="p-5 font-medium text-white">
                    {row.vertebra}
                  </td>

                  <td className="p-5 text-zinc-400">
                    {row.meanError}
                  </td>

                  <td className="p-5 text-zinc-400">
                    {row.under5mm}
                  </td>

                  <td className="p-5 text-zinc-400">
                    {row.under10mm}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stack */}
      <div className="mb-24">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-green-400">
          Stack
        </p>

        <div className="flex flex-wrap gap-3">
          {spineProject.stack.map((tech) => (
            <div
              key={tech}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300"
            >
              {tech}
            </div>
          ))}
        </div>
      </div>

      {/* Impact */}
      <div>
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-green-400">
          Impact
        </p>

        <ul className="space-y-4 leading-8 text-zinc-400">
          {spineProject.impact.points.map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}