import { Brain, Database, Layers3, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function LoadingMedicalAnnotationLive() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-28">
        <div className="flex flex-col gap-6 border-b border-white/[0.08] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="h-3 w-64 animate-pulse rounded-full bg-teal-300/20" />
            <div className="mt-5 space-y-4">
              <div className="h-14 w-full max-w-3xl animate-pulse rounded-2xl bg-white/[0.06]" />
              <div className="h-14 w-full max-w-2xl animate-pulse rounded-2xl bg-white/[0.05]" />
              <div className="h-14 w-full max-w-xl animate-pulse rounded-2xl bg-white/[0.04]" />
            </div>
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full max-w-3xl animate-pulse rounded-full bg-white/[0.06]" />
              <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/[0.04]" />
            </div>
          </div>

          <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-3 lg:w-[440px]">
            <LoadingMetric icon={<Layers3 size={18} />} label="Volume" value="3-plane MRI" />
            <LoadingMetric icon={<Database size={18} />} label="Backend" value="State contract" />
            <LoadingMetric icon={<Brain size={18} />} label="Output" value="ML-ready JSON" />
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-4 w-28 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-300/80 px-5 py-2.5 text-sm font-semibold text-[#04100f]">
              <Plus size={16} /> Add MRI
            </div>
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0b1014]/70 px-5 py-4"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/[0.07]" />
                  <div className="h-3 w-1/3 animate-pulse rounded-full bg-white/[0.04]" />
                </div>
                <div className="h-7 w-24 animate-pulse rounded-full bg-yellow-300/10" />
                <div className="h-10 w-24 animate-pulse rounded-full bg-teal-300/30" />
                <div className="h-10 w-24 animate-pulse rounded-full bg-red-300/10" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function LoadingMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="text-teal-300">{icon}</div>
      <p className="mt-3 text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
