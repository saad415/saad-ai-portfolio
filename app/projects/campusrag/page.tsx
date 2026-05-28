"use client";

import Navbar from "@/components/Navbar";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Database,
  Gauge,
  LockKeyhole,
  Network,
  Server,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

type TenantId = "medicine" | "engineering" | "cs";

type Tenant = {
  id: TenantId;
  label: string;
  unit: string;
  accent: string;
  docs: string[];
  usage: {
    requests: number;
    docs: number;
    tokens: number;
    cost: string;
    limitRemaining: number;
  };
};

const tenants: Tenant[] = [
  {
    id: "medicine",
    label: "Medicine",
    unit: "Clinical AI Pilot",
    accent: "text-rose-300",
    docs: [],
    usage: { requests: 0, docs: 0, tokens: 0, cost: "EUR 0.00", limitRemaining: 10 },
  },
  {
    id: "engineering",
    label: "Engineering",
    unit: "Robotics Research Group",
    accent: "text-amber-300",
    docs: [],
    usage: { requests: 0, docs: 0, tokens: 0, cost: "EUR 0.00", limitRemaining: 10 },
  },
  {
    id: "cs",
    label: "Computer Science",
    unit: "NLP Teaching Project",
    accent: "text-teal-300",
    docs: [],
    usage: { requests: 0, docs: 0, tokens: 0, cost: "EUR 0.00", limitRemaining: 10 },
  },
];

function localMetrics(tenant: Tenant) {
  return [
    `campusrag_requests_total{tenant="${tenant.id}"} ${tenant.usage.requests}`,
    `campusrag_documents_total{tenant="${tenant.id}"} ${tenant.usage.docs}`,
    `campusrag_tokens_total{tenant="${tenant.id}"} ${tenant.usage.tokens}`,
    `campusrag_limit_remaining{tenant="${tenant.id}"} ${tenant.usage.limitRemaining}`,
    `campusrag_errors_total{tenant="${tenant.id}"} 0`,
  ].join("\n");
}

type ChatResult = {
  answer: string;
  source: string;
  tenant: Tenant;
  tokens: number;
  limitRemaining: number;
  accessDecision: string;
  modelRoute: string;
  computePartition: string;
};

type UploadResult = {
  tenant: Tenant;
  document: {
    title: string;
    content: string;
  };
};

type OperationsStatus = {
  accessControl: {
    policy: string;
    decision: string;
    ssoReady: string;
  };
  modelRouting: {
    gateway: string;
    route: string;
    fallback: string;
  };
  compute: {
    scheduler: string;
    partition: string;
    gpuShare: number;
    queueDepth: number;
  };
  observability: {
    metrics: string;
    latencyMs: number;
    dashboard: string;
  };
};

const architecture = [
  {
    title: "Web UI",
    sub: "Next.js chat, upload, tenant dashboard",
    icon: Bot,
  },
  {
    title: "FastAPI",
    sub: "/chat, /upload, /usage, /metrics",
    icon: Server,
  },
  {
    title: "Tenant Layer",
    sub: "separate docs, vectors, limits, accounting",
    icon: ShieldCheck,
  },
  {
    title: "RAG Store",
    sub: "ChromaDB or pgvector collections per tenant",
    icon: Database,
  },
  {
    title: "Model Gateway",
    sub: "OpenAI-compatible, LiteLLM/vLLM-ready",
    icon: Network,
  },
  {
    title: "Metrics",
    sub: "Prometheus-ready usage and error counters",
    icon: Activity,
  },
];

const roadmap = [
  "Replace demo retrieval with ChromaDB or pgvector-backed embeddings",
  "Route model calls through LiteLLM to Ollama, vLLM, or external APIs",
  "Add Keycloak/OIDC SSO with project and group based access control",
  "Deploy with Docker Compose today, Kubernetes or Slurm workers later",
  "Attach Grafana dashboards for request, latency, token, and cost views",
];

const questions: Record<TenantId, string[]> = {
  medicine: [
    "Which document defines the uterine biometry reporting workflow?",
    "Can Engineering access the clinical MRI policy?",
  ],
  engineering: [
    "What notes are available for sensor calibration?",
    "Can Medicine access robotics safety documents?",
  ],
  cs: [
    "Which document contains the LLM evaluation rubric?",
    "Can this tenant see clinical review documents?",
  ],
};

function MetricCard({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-teal-300">{label}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{sub}</p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: typeof Bot;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
        <Icon size={19} className="text-teal-300" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {title}
        </h2>
      </div>
    </div>
  );
}

export default function CampusRagPage() {
  const [campusTenants, setCampusTenants] = useState<Tenant[]>(tenants);
  const [activeTenant, setActiveTenant] = useState<TenantId>("medicine");
  const [query, setQuery] = useState(questions.medicine[0]);
  const [answer, setAnswer] = useState(
    "Choose a tenant and run a query. The response will come from the CampusRAG API route.",
  );
  const [source, setSource] = useState("not queried yet");
  const [metricsText, setMetricsText] = useState(localMetrics(tenants[0]));
  const [isLoading, setIsLoading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("New GPU access policy");
  const [uploadContent, setUploadContent] = useState(
    "Researchers may request GPU-backed AI inference access through their project tenant. Usage is logged per tenant for fair allocation and cost attribution.",
  );
  const [uploadStatus, setUploadStatus] = useState("No document uploaded in this session.");
  const [fileStatus, setFileStatus] = useState("Choose a .txt file or paste text manually.");
  const [operations, setOperations] = useState<OperationsStatus>({
    accessControl: {
      policy: "tenant_id + role check before document retrieval",
      decision: "allowed_tenant_scoped",
      ssoReady: "OIDC/Keycloak group mapping",
    },
    modelRouting: {
      gateway: "OpenAI-compatible LiteLLM-style gateway",
      route: "litellm/clinical-llama",
      fallback: "ollama/local-llama",
    },
    compute: {
      scheduler: "Slurm/Kubernetes-ready dispatch layer",
      partition: "gpu-clinical",
      gpuShare: 2,
      queueDepth: 3,
    },
    observability: {
      metrics: "/api/campusrag/metrics",
      latencyMs: 420,
      dashboard: "Prometheus/Grafana-ready labels",
    },
  });

  const tenant = useMemo(
    () => campusTenants.find((item) => item.id === activeTenant) ?? campusTenants[0],
    [activeTenant, campusTenants],
  );

  const refreshMetrics = useCallback(async (tenantId: TenantId) => {
    const response = await fetch(`/api/campusrag/metrics?tenantId=${tenantId}`, {
      cache: "no-store",
    });
    setMetricsText(await response.text());
  }, []);

  const refreshOperations = useCallback(async (tenantId: TenantId) => {
    const response = await fetch(`/api/campusrag/status?tenantId=${tenantId}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as OperationsStatus | { error: string };

    if (!response.ok || "error" in payload) {
      return;
    }

    setOperations(payload);
  }, []);

  const runQuery = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/campusrag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: activeTenant, question: query }),
      });
      const payload = (await response.json()) as ChatResult | { error: string };

      if (!response.ok || "error" in payload) {
        setAnswer("error" in payload ? payload.error : "CampusRAG query failed.");
        return;
      }

      setAnswer(payload.answer);
      setSource(payload.source);
      setOperations((current) => ({
        ...current,
        accessControl: {
          ...current.accessControl,
          decision: payload.accessDecision,
        },
        modelRouting: {
          ...current.modelRouting,
          route: payload.modelRoute,
        },
        compute: {
          ...current.compute,
          partition: payload.computePartition,
        },
      }));
      setCampusTenants((items) =>
        items.map((item) => (item.id === payload.tenant.id ? payload.tenant : item)),
      );
      await refreshMetrics(activeTenant);
      await refreshOperations(activeTenant);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant, query, refreshMetrics, refreshOperations]);

  const uploadDocument = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/campusrag/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: activeTenant,
          title: uploadTitle,
          content: uploadContent,
        }),
      });
      const payload = (await response.json()) as UploadResult | { error: string };

      if (!response.ok || "error" in payload) {
        setUploadStatus("error" in payload ? payload.error : "Upload failed.");
        return;
      }

      setCampusTenants((items) =>
        items.map((item) => (item.id === payload.tenant.id ? payload.tenant : item)),
      );
      setQuery(`What does "${payload.document.title}" say?`);
      setSource(payload.document.title);
      setUploadStatus(`Uploaded "${payload.document.title}" to ${payload.tenant.label}.`);
      setAnswer("Document uploaded. Run the query to retrieve from the new tenant-local document.");
      await refreshMetrics(activeTenant);
      await refreshOperations(activeTenant);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant, refreshMetrics, refreshOperations, uploadContent, uploadTitle]);

  const loadTextFile = useCallback(async (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".txt")) {
      setFileStatus("Only .txt files are supported in this prototype.");
      return;
    }

    const text = await file.text();
    setUploadTitle(file.name.replace(/\.txt$/i, ""));
    setUploadContent(text.slice(0, 20000));
    setFileStatus(`Loaded ${file.name} (${text.length.toLocaleString()} characters).`);
  }, []);

  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-32">
        <Link
          href="/#projects"
          className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-teal-300"
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.35em] text-teal-300">
              AI Inference Platform / RAG / Multi-Tenant Systems
            </p>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              CampusRAG: Multi-Tenant AI Inference Platform
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-400">
              A university computing-center prototype for secure RAG-based AI
              services: tenant-isolated document retrieval, OpenAI-compatible
              inference APIs, usage accounting, request limits, and
              Prometheus-style monitoring.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://github.com/saad415/portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
              >
                View Source <ArrowUpRight size={14} />
              </a>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-teal-300/40 hover:bg-teal-300/10"
              >
                Open Demo <ChevronRight size={14} />
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-teal-300/20 bg-teal-300/[0.04] p-6">
            <p className="text-sm font-medium text-teal-200">
              Why it matches RRZE / HPC@FAU
            </p>
            <ul className="mt-4 space-y-3">
              {[
                "Web UI and API for AI inference workflows",
                "RAG-capable environment with tenant separation",
                "Usage accounting and fair-resource controls",
                "Docker-first architecture, Kubernetes and Slurm ready",
                "Monitoring-ready service metrics for operations",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-300">
                  <CheckCircle2 size={16} className="mt-1 shrink-0 text-teal-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            value="3"
            label="Tenants"
            sub="separate documents, vector collections, and usage records"
          />
          <MetricCard
            value="5"
            label="Core APIs"
            sub="/upload, /chat, /tenants, /status, and /metrics"
          />
          <MetricCard
            value="RAG"
            label="Retrieval"
            sub="source-grounded answers from tenant-local knowledge"
          />
          <MetricCard
            value="SSO"
            label="Ready Design"
            sub="planned Keycloak/OIDC integration for institutions"
          />
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-6xl px-6 pb-16">
        <SectionTitle
          icon={Bot}
          eyebrow="Interactive Prototype"
          title="Tenant-Isolated RAG Demo"
        />

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-4 text-sm font-semibold text-white">
              Select tenant
            </p>
            <div className="space-y-3">
              {campusTenants.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTenant(item.id);
                    setQuery(questions[item.id][0]);
                    setAnswer("Tenant changed. Run a query to retrieve from this tenant's API-backed corpus.");
                    setSource("not queried yet");
                    setMetricsText(localMetrics(item));
                    setUploadStatus("No document uploaded in this session.");
                    setFileStatus("Choose a .txt file or paste text manually.");
                    refreshOperations(item.id);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    activeTenant === item.id
                      ? "border-teal-300/45 bg-teal-300/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <p className={`text-sm font-semibold ${item.accent}`}>
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{item.unit}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <LockKeyhole size={15} className="text-teal-300" />
                Isolated documents
              </div>
              <div className="space-y-2">
                {tenant.docs.length ? (
                  tenant.docs.map((doc, index) => (
                    <div
                      key={`${doc}-${index}`}
                      className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
                    >
                      {doc}
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-sm leading-6 text-zinc-500">
                    No documents uploaded for this tenant yet.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Upload size={15} className="text-teal-300" />
                Upload tenant document
              </div>
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={(event) => loadTextFile(event.target.files?.[0])}
                className="mb-3 w-full rounded-xl border border-dashed border-teal-300/25 bg-teal-300/[0.04] px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-full file:border-0 file:bg-teal-300 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#04100f]"
              />
              <p className="mb-3 text-xs leading-5 text-zinc-500">{fileStatus}</p>
              <input
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-teal-300/50"
                placeholder="Document title"
              />
              <textarea
                value={uploadContent}
                onChange={(event) => setUploadContent(event.target.value)}
                className="mt-3 min-h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm leading-6 text-white outline-none transition focus:border-teal-300/50"
                placeholder="Paste text content for this tenant"
              />
              <button
                type="button"
                onClick={uploadDocument}
                disabled={isLoading}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-teal-300/40 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Upload to {tenant.label}
                <ArrowUpRight size={14} />
              </button>
              <p className="mt-3 text-xs leading-5 text-zinc-500">{uploadStatus}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#080d10]/80 p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {questions[tenant.id].map((item) => (
                <button
                  key={item}
                  onClick={() => setQuery(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    query === item
                      ? "border-teal-300/50 bg-teal-300/10 text-teal-200"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <label className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Query
            </label>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white outline-none transition focus:border-teal-300/50"
            />
            <button
              type="button"
              onClick={runQuery}
              disabled={isLoading}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-300 px-4 py-2 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Running..." : "Run Query"}
              <ArrowUpRight size={14} />
            </button>

            <div className="mt-5 rounded-2xl border border-teal-300/20 bg-teal-300/[0.05] p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-200">
                <Bot size={16} />
                RAG answer
              </div>
              <p className="leading-7 text-zinc-300">{answer}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">
                  source: {source}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">
                  tenant: {tenant.id}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">
                  limit remaining: {tenant.usage.limitRemaining}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <SectionTitle
          icon={Network}
          eyebrow="Architecture"
          title="Inference Service Layers"
        />

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {architecture.map(({ title, sub, icon: Icon }, index) => (
              <div key={title} className="relative rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-300/10">
                    <Icon size={17} className="text-teal-300" />
                  </span>
                  <span className="text-xs font-semibold text-zinc-600">
                    0{index + 1}
                  </span>
                </div>
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <SectionTitle
          icon={ShieldCheck}
          eyebrow="Operations Control Plane"
          title="Routing, Access, and GPU Resource Status"
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-semibold text-teal-300">Access Control</p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {operations.accessControl.policy}
            </p>
            <p className="mt-3 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-400">
              decision: {operations.accessControl.decision}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-semibold text-teal-300">Model Routing</p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {operations.modelRouting.gateway}
            </p>
            <p className="mt-3 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-400">
              route: {operations.modelRouting.route}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-semibold text-teal-300">GPU/HPC Resource</p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {operations.compute.scheduler}
            </p>
            <p className="mt-3 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-400">
              {operations.compute.partition}: {operations.compute.gpuShare} GPU share
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-semibold text-teal-300">Observability</p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {operations.observability.dashboard}
            </p>
            <p className="mt-3 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-400">
              latency: {operations.observability.latencyMs} ms, queue: {operations.compute.queueDepth}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-zinc-500">
          Runtime uploads and accounting mutations are persisted through a
          file-backed service store under <span className="text-zinc-300">data/campusrag-state.json</span>,
          keeping the API layer ready for a later SQLite or PostgreSQL swap.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <SectionTitle
          icon={BarChart3}
          eyebrow="Accounting"
          title="Usage and Resource Management"
        />

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            value={String(tenant.usage.requests)}
            label="Requests"
            sub={`${tenant.label} chat calls this month`}
          />
          <MetricCard
            value={String(tenant.usage.docs)}
            label="Documents"
            sub="tenant-local uploads indexed for RAG"
          />
          <MetricCard
            value={tenant.usage.tokens.toLocaleString()}
            label="Tokens"
            sub="estimated input and output usage"
          />
          <MetricCard
            value={tenant.usage.cost}
            label="Cost"
            sub="simple attribution estimate"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <SectionTitle
          icon={Gauge}
          eyebrow="Operations"
          title="Prometheus-Style Metrics"
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <pre className="overflow-x-auto rounded-3xl border border-white/10 bg-black/40 p-5 text-sm leading-7 text-teal-100">
            {metricsText}
          </pre>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="font-semibold text-white">Operational behavior</p>
            <ul className="mt-4 space-y-3">
              {[
                "Every request is tagged with tenant_id",
                "Usage counters can feed cost attribution",
                "Rate limits protect shared GPU capacity",
                "Metrics are shaped for Grafana dashboards",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-400">
                  <ChevronRight size={15} className="mt-1 shrink-0 text-teal-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <SectionTitle
          icon={Upload}
          eyebrow="Implementation Plan"
          title="From Prototype to Real Service"
        />

        <div className="grid gap-4 md:grid-cols-5">
          {roadmap.map((item, index) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="mb-4 text-sm font-bold text-teal-300">
                0{index + 1}
              </p>
              <p className="text-sm leading-6 text-zinc-300">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
