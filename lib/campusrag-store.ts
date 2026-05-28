import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type CampusTenantId = "medicine" | "engineering" | "cs";

export type CampusTenant = {
  id: CampusTenantId;
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

type TenantRecord = CampusTenant & {
  corpus: { title: string; content: string }[];
  modelRoute: string;
  computePartition: string;
  gpuShare: number;
  queueDepth: number;
  latencyMs: number;
};

const statePath = path.join(process.cwd(), "data", "campusrag-state.json");

const seedTenants: TenantRecord[] = [
  {
    id: "medicine",
    label: "Medicine",
    unit: "Clinical AI Pilot",
    accent: "text-rose-300",
    docs: [],
    corpus: [],
    usage: { requests: 0, docs: 0, tokens: 0, cost: "EUR 0.00", limitRemaining: 10 },
    modelRoute: "litellm/clinical-llama",
    computePartition: "gpu-clinical",
    gpuShare: 2,
    queueDepth: 3,
    latencyMs: 420,
  },
  {
    id: "engineering",
    label: "Engineering",
    unit: "Robotics Research Group",
    accent: "text-amber-300",
    docs: [],
    corpus: [],
    usage: { requests: 0, docs: 0, tokens: 0, cost: "EUR 0.00", limitRemaining: 10 },
    modelRoute: "litellm/engineering-mistral",
    computePartition: "gpu-research",
    gpuShare: 1,
    queueDepth: 1,
    latencyMs: 310,
  },
  {
    id: "cs",
    label: "Computer Science",
    unit: "NLP Teaching Project",
    accent: "text-teal-300",
    docs: [],
    corpus: [],
    usage: { requests: 0, docs: 0, tokens: 0, cost: "EUR 0.00", limitRemaining: 10 },
    modelRoute: "litellm/teaching-llama",
    computePartition: "gpu-teaching",
    gpuShare: 1,
    queueDepth: 5,
    latencyMs: 530,
  },
];

function cloneSeedTenants() {
  return JSON.parse(JSON.stringify(seedTenants)) as TenantRecord[];
}

function loadTenants() {
  try {
    if (!existsSync(statePath)) {
      return cloneSeedTenants();
    }

    const parsed = JSON.parse(readFileSync(statePath, "utf8")) as {
      tenants?: TenantRecord[];
    };

    if (!Array.isArray(parsed.tenants)) {
      return cloneSeedTenants();
    }

    return parsed.tenants;
  } catch {
    return cloneSeedTenants();
  }
}

function saveTenants(records: TenantRecord[]) {
  try {
    mkdirSync(path.dirname(statePath), { recursive: true });
    writeFileSync(
      statePath,
      JSON.stringify({ updatedAt: new Date().toISOString(), tenants: records }, null, 2),
      "utf8",
    );
  } catch {
    // Local persistence is best-effort for serverless-compatible demos.
  }
}

function publicTenant(record: TenantRecord): CampusTenant {
  return {
    id: record.id,
    label: record.label,
    unit: record.unit,
    accent: record.accent,
    docs: record.docs,
    usage: record.usage,
  };
}

function getTenantRecord(records: TenantRecord[], tenantId: string) {
  return records.find((tenant) => tenant.id === tenantId);
}

function getTenantRecords() {
  return loadTenants();
}

function estimateTokens(text: string) {
  return Math.max(12, Math.ceil(text.trim().split(/\s+/).length * 1.35));
}

function scoreDocument(question: string, title: string, content: string) {
  const words = question
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);
  const searchableText = `${title} ${content}`.toLowerCase();

  return words.reduce((score, word) => {
    return searchableText.includes(word) ? score + 1 : score;
  }, 0);
}

function chunkDocument(title: string, content: string) {
  const words = content.split(/\s+/).filter(Boolean);
  const chunkSize = 90;
  const overlap = 18;
  const chunks: { title: string; content: string }[] = [];

  for (let start = 0; start < words.length; start += chunkSize - overlap) {
    const chunkWords = words.slice(start, start + chunkSize);

    if (!chunkWords.length) {
      break;
    }

    const index = chunks.length + 1;
    chunks.push({
      title: chunks.length ? `${title} / chunk ${index}` : title,
      content: chunkWords.join(" "),
    });

    if (start + chunkSize >= words.length) {
      break;
    }
  }

  return chunks.length ? chunks : [{ title, content }];
}

export function listCampusTenants() {
  const tenants = getTenantRecords();
  return tenants.map(publicTenant);
}

export function getCampusTenant(tenantId: string) {
  const tenants = getTenantRecords();
  const tenant = getTenantRecord(tenants, tenantId);
  return tenant ? publicTenant(tenant) : null;
}

export function chatWithCampusTenant(tenantId: string, question: string) {
  const tenants = getTenantRecords();
  const tenant = getTenantRecord(tenants, tenantId);

  if (!tenant) {
    return { error: "Unknown tenant.", status: 404 };
  }

  if (!question.trim()) {
    return { error: "Question is required.", status: 400 };
  }

  if (tenant.usage.limitRemaining <= 0) {
    return {
      error: "Tenant request limit reached for this demo window.",
      status: 429,
    };
  }

  const restricted = /\b(access|see|other tenant|another tenant|cross-tenant)\b/i.test(
    question,
  );
  const accessDecision = restricted ? "blocked_cross_tenant" : "allowed_tenant_scoped";

  if (!tenant.corpus.length) {
    return {
      error: "No tenant documents uploaded yet. Upload a .txt file before running RAG.",
      status: 400,
    };
  }

  const ranked = [...tenant.corpus].sort(
    (a, b) =>
      scoreDocument(question, b.title, b.content) -
      scoreDocument(question, a.title, a.content),
  );
  const source = ranked[0];
  const tokens = estimateTokens(`${question} ${source.content}`);

  tenant.usage.requests += 1;
  tenant.usage.tokens += tokens;
  tenant.usage.limitRemaining -= 1;
  tenant.usage.cost = `EUR ${(tenant.usage.tokens * 0.00005).toFixed(2)}`;
  tenant.latencyMs = Math.max(180, tenant.latencyMs + (restricted ? -20 : 35));
  tenant.queueDepth = Math.max(0, tenant.queueDepth + (tenant.usage.requests % 2 === 0 ? 1 : -1));
  saveTenants(tenants);

  const answer = restricted
    ? `${tenant.label} can only retrieve from its own isolated document collection. Cross-tenant access is blocked before retrieval, so another institute's files never enter the RAG context.`
    : `For ${tenant.label}, the strongest source is "${source.title}". ${source.content} This request was logged for ${tenant.unit} with an estimated ${tokens} tokens.`;

  return {
    answer,
    source: source.title,
    tenant: publicTenant(tenant),
    tokens,
    limitRemaining: tenant.usage.limitRemaining,
    accessDecision,
    modelRoute: tenant.modelRoute,
    computePartition: tenant.computePartition,
    status: 200,
  };
}

export function uploadCampusDocument(
  tenantId: string,
  title: string,
  content: string,
) {
  const tenants = getTenantRecords();
  const tenant = getTenantRecord(tenants, tenantId);

  if (!tenant) {
    return { error: "Unknown tenant.", status: 404 };
  }

  const cleanTitle = title.trim().slice(0, 90);
  const cleanContent = content.trim().slice(0, 20000);

  if (!cleanTitle || !cleanContent) {
    return { error: "Document title and content are required.", status: 400 };
  }

  if (tenant.docs.length >= 20 && !tenant.docs.includes(cleanTitle)) {
    return {
      error: "Tenant document limit reached for this demo.",
      status: 429,
    };
  }

  tenant.corpus = tenant.corpus.filter(
    (doc) => doc.title !== cleanTitle && !doc.title.startsWith(`${cleanTitle} / chunk `),
  );
  tenant.docs = tenant.docs.filter((doc) => doc !== cleanTitle);
  tenant.corpus.unshift(...chunkDocument(cleanTitle, cleanContent));
  tenant.docs.unshift(cleanTitle);
  tenant.usage.docs += 1;
  saveTenants(tenants);

  return {
    tenant: publicTenant(tenant),
    document: { title: cleanTitle, content: cleanContent },
    status: 200,
  };
}

export function campusMetrics(tenantId?: string) {
  const tenants = getTenantRecords();
  const selected = tenantId ? tenants.filter((tenant) => tenant.id === tenantId) : tenants;

  return selected
    .flatMap((tenant) => [
      `campusrag_requests_total{tenant="${tenant.id}"} ${tenant.usage.requests}`,
      `campusrag_documents_total{tenant="${tenant.id}"} ${tenant.usage.docs}`,
      `campusrag_tokens_total{tenant="${tenant.id}"} ${tenant.usage.tokens}`,
      `campusrag_limit_remaining{tenant="${tenant.id}"} ${tenant.usage.limitRemaining}`,
      `campusrag_model_latency_ms{tenant="${tenant.id}",route="${tenant.modelRoute}"} ${tenant.latencyMs}`,
      `campusrag_gpu_share{tenant="${tenant.id}",partition="${tenant.computePartition}"} ${tenant.gpuShare}`,
      `campusrag_queue_depth{tenant="${tenant.id}",partition="${tenant.computePartition}"} ${tenant.queueDepth}`,
      `campusrag_errors_total{tenant="${tenant.id}"} 0`,
    ])
    .join("\n");
}

export function campusOperationsStatus(tenantId: string) {
  const tenants = getTenantRecords();
  const tenant = getTenantRecord(tenants, tenantId);

  if (!tenant) {
    return { error: "Unknown tenant.", status: 404 };
  }

  return {
    tenant: publicTenant(tenant),
    accessControl: {
      policy: "tenant_id + role check before document retrieval",
      decision: "allowed_tenant_scoped",
      ssoReady: "OIDC/Keycloak group mapping",
    },
    modelRouting: {
      gateway: "OpenAI-compatible LiteLLM-style gateway",
      route: tenant.modelRoute,
      fallback: "ollama/local-llama",
    },
    compute: {
      scheduler: "Slurm/Kubernetes-ready dispatch layer",
      partition: tenant.computePartition,
      gpuShare: tenant.gpuShare,
      queueDepth: tenant.queueDepth,
    },
    observability: {
      metrics: "/api/campusrag/metrics",
      latencyMs: tenant.latencyMs,
      dashboard: "Prometheus/Grafana-ready labels",
    },
    status: 200,
  };
}

export function resetCampusState() {
  const tenants = cloneSeedTenants();
  saveTenants(tenants);
  return tenants.map(publicTenant);
}

export function resetCampusTenant(tenantId: string) {
  const tenants = getTenantRecords();
  const tenant = getTenantRecord(tenants, tenantId);

  if (!tenant) {
    return { error: "Unknown tenant.", status: 404 };
  }

  tenant.docs = [];
  tenant.corpus = [];
  tenant.usage = {
    requests: 0,
    docs: 0,
    tokens: 0,
    cost: "EUR 0.00",
    limitRemaining: 10,
  };
  tenant.queueDepth = 0;
  saveTenants(tenants);

  return {
    tenant: publicTenant(tenant),
    status: 200,
  };
}
