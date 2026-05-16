import Navbar from "@/components/Navbar";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Database,
  Cloud,
  BarChart3,
  GitBranch,
  Cpu,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

const MetricCard = ({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub: string;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <p className="text-3xl font-bold text-orange-400">{value}</p>
    <p className="mt-1 font-medium text-white">{label}</p>
    <p className="mt-0.5 text-sm text-zinc-500">{sub}</p>
  </div>
);

export default function SpotifyProjectPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-32 pb-16">
        <Link
          href="/#projects"
          className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-orange-400"
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <p className="text-xs uppercase tracking-[0.35em] text-orange-400 mb-4">
          Data Engineering · Cloud Pipeline
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Spotify Analytics Pipeline
        </h1>
        <p className="mt-3 text-lg text-zinc-400 italic">
          End-to-end automated data pipeline — Spotify API to Power BI, orchestrated on AWS
        </p>

        {/* Pipeline flow */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {["Spotify API", "Airflow DAG", "AWS EC2", "AWS S3", "Power BI"].map(
            (step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-xl border border-orange-400/20 bg-orange-400/5 px-3 py-1.5 text-sm text-orange-300">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                )}
              </span>
            )
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="https://github.com/saad415/Spotify"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-orange-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-300"
          >
            <GitBranch size={15} /> View on GitHub
            <ArrowUpRight size={14} />
          </a>
        </div>
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard value="Daily" label="Pipeline Schedule" sub="Airflow DAG auto-refresh" />
          <MetricCard value="AWS" label="Cloud Infrastructure" sub="EC2 orchestration + S3 storage" />
          <MetricCard value="6+" label="Dashboard Visuals" sub="Power BI + Deneb custom charts" />
          <MetricCard value="REST" label="Spotify Web API" sub="OAuth2 · track + artist data" />
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-white/8" />
      </div>

      {/* What it does */}
      <section className="mx-auto max-w-5xl px-6 py-16 space-y-12">
        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Database size={18} className="text-orange-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">What It Does</h2>
            <p className="mt-3 leading-8 text-zinc-400">
              A fully automated, cloud-hosted data pipeline that extracts Spotify listening data on a
              daily schedule, stores it on AWS S3, and renders track popularity, audio features, and
              artist trends inside interactive Power BI dashboards. No manual intervention required
              after deployment — the Airflow DAG handles scheduling, retries, and logging end-to-end.
            </p>
            <p className="mt-3 leading-8 text-zinc-400">
              The project demonstrates a production-grade data engineering workflow — not just a
              notebook analysis — by combining REST API ingestion, workflow orchestration, cloud
              object storage, and business intelligence visualization into a single automated system.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <RefreshCw size={18} className="text-orange-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">Why These Choices</h2>
            <ul className="mt-4 space-y-3">
              {[
                {
                  title: "Apache Airflow for orchestration",
                  body: "Provides DAG-based dependency management, retry logic, and a visual UI for monitoring pipeline runs — far more robust than a cron job for a multi-step workflow.",
                },
                {
                  title: "AWS EC2 as the compute host",
                  body: "Runs the Airflow scheduler continuously in the cloud, decoupled from any local machine. EC2 gives full control over the environment without the complexity of managed orchestration services.",
                },
                {
                  title: "AWS S3 as the data lake",
                  body: "Object storage scales infinitely, costs near-zero at this volume, and integrates natively with Power BI's data source connectors — no database server to manage.",
                },
                {
                  title: "Power BI + Deneb for visualization",
                  body: "Deneb (Vega-Lite inside Power BI) enables custom chart grammar beyond the standard visuals — used here for audio feature radar charts and dynamic track image displays.",
                },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <ChevronRight size={16} className="mt-1 shrink-0 text-orange-400" />
                  <p className="leading-7 text-zinc-400">
                    <span className="font-semibold text-white">{title}:</span> {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture diagram */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex gap-5 mb-8">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Cpu size={18} className="text-orange-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Architecture</h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 space-y-8">
          {/* Ingestion layer */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 1 — Ingestion
            </p>
            <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-300 text-center">
                  <p className="font-medium text-white">Spotify Web API</p>
                  <p className="text-xs text-zinc-500 mt-0.5">OAuth2 · REST</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-300 text-center">
                  <p className="font-medium text-white">get_data.py</p>
                  <p className="text-xs text-zinc-500 mt-0.5">tracks · artists · audio features</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-300 text-center">
                  <p className="font-medium text-white">CSV / JSON</p>
                  <p className="text-xs text-zinc-500 mt-0.5">local staging</p>
                </div>
              </div>
            </div>
          </div>

          {/* Orchestration layer */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 2 — Orchestration
            </p>
            <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">dag.py</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Airflow DAG definition</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Daily Schedule</p>
                  <p className="text-xs text-zinc-500 mt-0.5">retry · logging · alerts</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">AWS EC2</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Airflow scheduler host</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-zinc-500 text-center">
                  DAG tasks: <span className="text-zinc-300">fetch_token</span> →{" "}
                  <span className="text-zinc-300">pull_tracks</span> →{" "}
                  <span className="text-zinc-300">pull_audio_features</span> →{" "}
                  <span className="text-zinc-300">upload_to_s3</span>
                </p>
              </div>
            </div>
          </div>

          {/* Storage layer */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 3 — Storage
            </p>
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">AWS S3 Bucket</p>
                  <p className="text-xs text-zinc-500 mt-0.5">partitioned by date</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">tracks/</p>
                  <p className="text-xs text-zinc-500 mt-0.5">CSV snapshots</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">artists/</p>
                  <p className="text-xs text-zinc-500 mt-0.5">CSV snapshots</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization layer */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 4 — Visualization
            </p>
            <div className="rounded-2xl border border-green-400/20 bg-green-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Power BI Desktop</p>
                  <p className="text-xs text-zinc-500 mt-0.5">S3 data source connector</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Deneb Visuals</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Vega-Lite custom charts</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center">
                  <p className="font-medium text-white">Softify_Ec2.pbix</p>
                  <p className="text-xs text-zinc-500 mt-0.5">published report</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/8">
            {[
              "Python 3.x",
              "Apache Airflow",
              "AWS EC2",
              "AWS S3",
              "Power BI",
              "Deneb / Vega-Lite",
              "Spotify Web API",
              "OAuth2",
              "pandas",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Live Dashboard Embed */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex gap-5 mb-6">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <BarChart3 size={18} className="text-orange-400" />
          </span>
          <div>
            <h2 className="mt-1 text-xl font-semibold text-white">Live Dashboard</h2>
            <p className="mt-1 text-sm text-zinc-500">Embedded Power BI report — fully interactive</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] group">
          <div className="relative w-full overflow-hidden">
            <Image
              src="/spotify.gif"
              alt="Spotify Analytics Power BI Dashboard"
              width={1400}
              height={875}
              className="w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              priority
            />
            {/* overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <a
                href="https://app.powerbi.com/groups/me/reports/8fe7f296-f66c-4e4b-a423-d686a53feeb9"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-orange-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-300"
              >
                Open Live Report <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/8">
            <p className="text-xs text-zinc-600">Data updated 12/22/23 · Power BI · Hover to open</p>
            <a
              href="https://app.powerbi.com/groups/me/reports/8fe7f296-f66c-4e4b-a423-d686a53feeb9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-orange-400 transition hover:text-orange-300"
            >
              Open in Power BI <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* Dashboard highlights */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex gap-5 mb-8">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <BarChart3 size={18} className="text-orange-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Dashboard Highlights</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Track Popularity Trends",
              body: "Line charts tracking popularity score over time for top tracks, updated each daily run.",
            },
            {
              title: "Audio Feature Radar",
              body: "Deneb Vega-Lite radar chart comparing danceability, energy, valence, acousticness, and speechiness per track.",
            },
            {
              title: "Artist Leaderboard",
              body: "Ranked table of artists by total streams and follower count, with dynamic album art loaded from the Spotify CDN.",
            },
            {
              title: "Listening Heatmap",
              body: "Day-of-week vs hour matrix showing when tracks were played, surfacing listening behaviour patterns.",
            },
            {
              title: "Genre Distribution",
              body: "Donut chart breaking down the genre mix of top-played artists, refreshed on each pipeline run.",
            },
            {
              title: "Pipeline Run Log",
              body: "A table of recent DAG execution timestamps and row counts ingested, giving full pipeline observability inside the report.",
            },
          ].map(({ title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-orange-400/30 transition-colors"
            >
              <p className="font-semibold text-white text-sm">{title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Skills demonstrated */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <div className="flex gap-5 mb-6">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Cloud size={18} className="text-orange-400" />
            </span>
            <h2 className="mt-1 text-xl font-semibold text-white">Skills Demonstrated</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { area: "REST API Integration", detail: "OAuth2 token management, paginated endpoint consumption, rate-limit handling against the Spotify Web API." },
              { area: "Workflow Orchestration", detail: "DAG authoring in Apache Airflow with task dependencies, SLA monitoring, and automatic retries on failure." },
              { area: "Cloud Infrastructure", detail: "EC2 instance provisioning, IAM role configuration, S3 bucket policies, and cost-conscious instance sizing." },
              { area: "Business Intelligence", detail: "Power BI data modelling, DAX measures, and advanced Deneb (Vega-Lite) custom visual grammar." },
            ].map(({ area, detail }) => (
              <div key={area} className="flex gap-3">
                <ChevronRight size={16} className="mt-1 shrink-0 text-orange-400" />
                <div>
                  <p className="font-semibold text-white text-sm">{area}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between items-center flex-wrap gap-4 pt-4 border-t border-white/8">
            <div className="flex flex-wrap gap-2">
              {["Python", "Apache Airflow", "AWS EC2", "AWS S3", "Power BI", "Deneb", "Spotify API"].map((t) => (
                <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400">{t}</span>
              ))}
            </div>
            <a
              href="https://github.com/saad415/Spotify"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 px-5 py-2.5 text-sm font-semibold text-orange-400 transition hover:bg-orange-400/10"
            >
              <GitBranch size={15} /> View Source <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
