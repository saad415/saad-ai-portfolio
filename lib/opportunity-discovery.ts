import type { DiscoveredOpportunity } from "@/lib/tracker-db";

const profileKeywords = [
  "ai engineer",
  "ai/ml",
  "applied ai",
  "artificial intelligence",
  "data scientist",
  "machine learning",
  "machine learning engineer",
  "ml engineer",
  "mlops",
  "deep learning",
  "computer vision",
  "medical imaging",
  "biomedical",
  "health ai",
  "image analysis",
  "segmentation",
  "mri",
  "medical image",
  "pytorch",
  "tensorflow",
  "python",
  "fastapi",
  "llm",
  "large language model",
  "rag",
  "semantic search",
  "phd",
  "ph.d",
  "doctoral",
  "doctoral candidate",
  "research assistant",
  "research engineer",
  "research scientist",
  "postdoc",
  "postdoctoral",
];

const europeKeywords = [
  "germany",
  "europe",
  "eu",
  "remote",
  "netherlands",
  "switzerland",
  "austria",
  "denmark",
  "sweden",
  "finland",
  "norway",
  "france",
  "belgium",
  "luxembourg",
  "italy",
  "spain",
  "portugal",
  "ireland",
  "uk",
  "united kingdom",
  "poland",
  "czech",
  "estonia",
];

const jobSearchQueries = [
  "machine learning engineer",
  "ai engineer",
  "computer vision engineer",
  "medical imaging ai",
  "research engineer machine learning",
  "llm engineer",
  "mlops engineer",
];

const researchSearchQueries = [
  "machine learning phd",
  "medical imaging phd",
  "computer vision phd",
  "artificial intelligence doctoral researcher",
  "research engineer machine learning",
  "postdoc computer vision",
  "biomedical ai phd",
];

export async function discoverOpportunities() {
  const results = await Promise.allSettled([
    discoverJobOpportunities(),
    discoverResearchOpportunities(),
  ]);

  const opportunities = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return dedupeAndRank(opportunities).slice(0, 40);
}

export async function discoverJobOpportunities() {
  const results = await Promise.allSettled([
    fetchArbeitnowJobs(),
    fetchEuresJobs(),
    fetchLinkedInJobs(),
    fetchWellfoundJobs(),
    fetchDeepTechJobs(),
  ]);

  const opportunities = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return dedupeAndRank(opportunities).slice(0, 80);
}

export async function discoverResearchOpportunities() {
  const results = await Promise.allSettled([
    fetchEuraxessResearchPosts(),
    fetchAcademicTransferPosts(),
    fetchEllisPosts(),
    fetchMscaRelatedPosts(),
    fetchAcademicPositionsPosts(),
    fetchNatureCareersPosts(),
    fetchFindAPhdPosts(),
  ]);

  const opportunities = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return dedupeAndRank(opportunities).slice(0, 80);
}

async function fetchArbeitnowJobs(): Promise<DiscoveredOpportunity[]> {
  const response = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json() as {
    data?: Array<{
      title?: string;
      company_name?: string;
      location?: string;
      remote?: boolean;
      url?: string;
      description?: string;
      tags?: string[];
    }>;
  };

  return (payload.data ?? [])
    .map((job) => {
      const text = [
        job.title,
        job.company_name,
        job.location,
        job.description,
        ...(job.tags ?? []),
      ].join(" ");
      const score = scoreOpportunity(text);

      return {
        source: "Arbeitnow",
        type: "job",
        organization: cleanText(job.company_name) || "Unknown organization",
        title: cleanText(job.title) || "Untitled role",
        country: inferCountry(job.location),
        city: cleanText(job.location),
        url: job.url ?? "",
        deadline: null,
        summary: summarize(job.description),
        match_score: score.score,
        matched_keywords: score.keywords,
      };
    })
    .filter((job) => job.url && job.match_score >= 25);
}

async function fetchEuraxessResearchPosts(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(researchSearchQueries.map(async (query) => {
    const url = `https://euraxess.ec.europa.eu/jobs/search?keywords=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    return parseEuraxessHtml(html, url);
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchEuresJobs(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(jobSearchQueries.map(async (query) => {
    const url = `https://eures.europa.eu/job-search_en?keywords=${encodeURIComponent(query)}&locationCodes=eu`;
    const html = await fetchHtml(url);
    return parseGenericOpportunityLinks({
      html,
      baseUrl: url,
      source: "EURES",
      defaultType: "job",
      fallbackOrganization: "European employer",
      summary: "Job opportunity discovered from the EURES European job mobility portal.",
    });
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchAcademicTransferPosts(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(researchSearchQueries.map(async (query) => {
    const url = `https://www.academictransfer.com/en/jobs/?q=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    return parseGenericOpportunityLinks({
      html,
      baseUrl: url,
      source: "AcademicTransfer",
      defaultType: "research",
      fallbackOrganization: "Dutch research institution",
      summary: "Academic or research opportunity discovered from AcademicTransfer.",
      minimumScore: 25,
    });
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchEllisPosts(): Promise<DiscoveredOpportunity[]> {
  const url = "https://ellis.eu/jobs";
  const html = await fetchHtml(url);

  return parseGenericOpportunityLinks({
    html,
    baseUrl: url,
    source: "ELLIS",
    defaultType: "research",
    fallbackOrganization: "ELLIS network institution",
    summary: "AI or machine learning research opening discovered from ELLIS.",
    minimumScore: 20,
  });
}

async function fetchMscaRelatedPosts(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled([
    "MSCA doctoral network machine learning",
    "Marie Curie doctoral candidate artificial intelligence",
    "MSCA PhD computer vision",
  ].map(async (query) => {
    const url = `https://euraxess.ec.europa.eu/jobs/search?keywords=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    return parseGenericOpportunityLinks({
      html,
      baseUrl: url,
      source: "MSCA / EURAXESS",
      defaultType: "phd",
      fallbackOrganization: "MSCA doctoral network",
      summary: "MSCA-related doctoral or research opportunity discovered through EURAXESS.",
      minimumScore: 20,
    });
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchAcademicPositionsPosts(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(researchSearchQueries.map(async (query) => {
    const url = `https://academicpositions.com/find-jobs?keywords=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    return parseGenericOpportunityLinks({
      html,
      baseUrl: url,
      source: "Academic Positions",
      defaultType: "research",
      fallbackOrganization: "European academic institution",
      summary: "Academic opportunity discovered from Academic Positions.",
      minimumScore: 25,
    });
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchNatureCareersPosts(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(researchSearchQueries.map(async (query) => {
    const url = `https://www.nature.com/naturecareers/jobs?keywords=${encodeURIComponent(query)}&location=europe`;
    const html = await fetchHtml(url);
    return parseGenericOpportunityLinks({
      html,
      baseUrl: url,
      source: "Nature Careers",
      defaultType: "research",
      fallbackOrganization: "Research institution",
      summary: "Science or research opportunity discovered from Nature Careers.",
      minimumScore: 25,
    });
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchFindAPhdPosts(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(researchSearchQueries.map(async (query) => {
    const url = `https://www.findaphd.com/phds/?Keywords=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    return parseGenericOpportunityLinks({
      html,
      baseUrl: url,
      source: "FindAPhD",
      defaultType: "phd",
      fallbackOrganization: "PhD host institution",
      summary: "PhD project discovered from FindAPhD.",
      minimumScore: 20,
    });
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchLinkedInJobs(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(jobSearchQueries.map(async (query) => {
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=European%20Union`;
    const html = await fetchHtml(url);
    return parseGenericOpportunityLinks({
      html,
      baseUrl: url,
      source: "LinkedIn",
      defaultType: "job",
      fallbackOrganization: "European employer",
      summary: "Job opportunity discovered from LinkedIn Jobs.",
      minimumScore: 30,
    });
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchWellfoundJobs(): Promise<DiscoveredOpportunity[]> {
  const url = "https://wellfound.com/location/europe";
  const html = await fetchHtml(url);

  return parseGenericOpportunityLinks({
    html,
    baseUrl: url,
    source: "Wellfound",
    defaultType: "job",
    fallbackOrganization: "European startup",
    summary: "Startup job opportunity discovered from Wellfound Europe.",
    minimumScore: 25,
  });
}

async function fetchDeepTechJobs(): Promise<DiscoveredOpportunity[]> {
  const url = "https://deeptechjobs.eu/";
  const html = await fetchHtml(url);

  return parseGenericOpportunityLinks({
    html,
    baseUrl: url,
    source: "DeepTechJobs",
    defaultType: "job",
    fallbackOrganization: "European deep-tech company",
    summary: "Deep-tech job opportunity discovered from DeepTechJobs.",
    minimumScore: 20,
  });
}

function parseEuraxessHtml(html: string, fallbackUrl: string): DiscoveredOpportunity[] {
  const matches = [...html.matchAll(/href="(\/jobs\/\d+[^"]*)">([^<]{12,})<\/a>/g)];

  return matches.map((match) => {
    const title = cleanText(match[2]);
    const href = match[1] ?? "";
    const url = href.startsWith("http")
      ? href
      : `https://euraxess.ec.europa.eu${href}`;
    const text = extractContextAround(html, match.index ?? 0);
    const score = scoreOpportunity(`${title} ${text}`);

    return {
      source: "EURAXESS",
      type: title.toLowerCase().includes("phd") || title.toLowerCase().includes("doctoral")
        ? "phd"
        : "research",
      organization: "EURAXESS research opportunity",
      title: title || "Research opportunity",
      country: null,
      city: null,
      url: url || fallbackUrl,
      deadline: extractDeadline(text),
      summary: "Research opportunity discovered from EURAXESS search.",
      match_score: Math.max(score.score, 45),
      matched_keywords: score.keywords.length ? score.keywords : ["research"],
    };
  });
}

async function fetchHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 opportunity-tracker",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return "";
    }

    return response.text();
  } catch {
    return "";
  }
}

function parseGenericOpportunityLinks({
  html,
  baseUrl,
  source,
  defaultType,
  fallbackOrganization,
  summary,
  minimumScore = 25,
}: {
  html: string;
  baseUrl: string;
  source: string;
  defaultType: string;
  fallbackOrganization: string;
  summary: string;
  minimumScore?: number;
}) {
  const anchorMatches = [...html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)];

  return anchorMatches
    .map((match) => {
      const href = decodeHtml(match[2] ?? "");
      const title = cleanText(decodeHtml(match[3] ?? ""));
      const url = resolveOpportunityUrl(href, baseUrl);
      const context = cleanText(decodeHtml(extractContextAround(html, match.index ?? 0)));
      const text = `${title} ${context} ${url}`;
      const score = scoreOpportunity(text);

      return {
        source,
        type: inferOpportunityType(title, defaultType),
        organization: fallbackOrganization,
        title,
        country: inferCountry(text),
        city: null,
        url,
        deadline: extractDeadline(context),
        summary,
        match_score: score.score,
        matched_keywords: score.keywords,
      };
    })
    .filter((opportunity) =>
      opportunity.url &&
      isLikelyOpportunityTitle(opportunity.title) &&
      opportunity.match_score >= minimumScore,
    );
}

function scoreOpportunity(text: string) {
  const haystack = stripHtml(text).toLowerCase();
  const matchedProfile = profileKeywords.filter((keyword) => haystack.includes(keyword));
  const matchedEurope = europeKeywords.filter((keyword) => haystack.includes(keyword));
  const hasPhdSignal = ["phd", "doctoral", "doctorate"].some((keyword) => haystack.includes(keyword));
  const hasRoleSignal = ["engineer", "research", "developer", "scientist"].some((keyword) => haystack.includes(keyword));

  const score = Math.min(
    100,
    matchedProfile.length * 12 +
      matchedEurope.length * 7 +
      (hasPhdSignal ? 15 : 0) +
      (hasRoleSignal ? 10 : 0),
  );

  return {
    score,
    keywords: [...new Set([...matchedProfile, ...matchedEurope])].slice(0, 10),
  };
}

function dedupeAndRank(opportunities: DiscoveredOpportunity[]) {
  const byUrl = new Map<string, DiscoveredOpportunity>();

  for (const opportunity of opportunities) {
    const existing = byUrl.get(opportunity.url);

    if (!existing || opportunity.match_score > existing.match_score) {
      byUrl.set(opportunity.url, opportunity);
    }
  }

  return [...byUrl.values()].sort((a, b) => b.match_score - a.match_score);
}

function cleanText(value?: string | null) {
  return stripHtml(value ?? "").replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function resolveOpportunityUrl(href: string, baseUrl: string) {
  try {
    return new URL(href, baseUrl).toString().split("#")[0];
  } catch {
    return "";
  }
}

function inferOpportunityType(title: string, fallback: string) {
  const text = title.toLowerCase();

  if (["phd", "ph.d", "doctoral", "doctorate"].some((keyword) => text.includes(keyword))) {
    return "phd";
  }

  if (["postdoc", "postdoctoral", "research", "scientist"].some((keyword) => text.includes(keyword))) {
    return "research";
  }

  return fallback;
}

function extractContextAround(html: string, index: number) {
  const start = Math.max(0, index - 700);
  const end = Math.min(html.length, index + 1400);
  return html.slice(start, end);
}

function extractDeadline(text: string) {
  const cleaned = cleanText(text);
  const labelledDate = cleaned.match(
    /(?:deadline|closing date|apply by|application deadline|deadline for applications|expires|until)[:\s-]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,12}\s+\d{4}|[A-Za-z]{3,12}\s+\d{1,2},?\s+\d{4})/i,
  );
  const anyDate = cleaned.match(
    /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,12}\s+\d{4}|[A-Za-z]{3,12}\s+\d{1,2},?\s+\d{4})\b/,
  );

  return normalizeDate(labelledDate?.[1] ?? anyDate?.[1] ?? null);
}

function normalizeDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const text = value.trim().replace(/,/g, "");
  const isoLike = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  const dayFirst = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

  if (isoLike) {
    return toIsoDate(Number(isoLike[1]), Number(isoLike[2]), Number(isoLike[3]));
  }

  if (dayFirst) {
    const year = Number(dayFirst[3].length === 2 ? `20${dayFirst[3]}` : dayFirst[3]);
    return toIsoDate(year, Number(dayFirst[2]), Number(dayFirst[1]));
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toIsoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

function toIsoDate(year: number, month: number, day: number) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isLikelyOpportunityTitle(title: string) {
  const text = title.toLowerCase();

  if (title.length < 10 || title.length > 180) {
    return false;
  }

  if (["cookie", "privacy", "login", "sign in", "contact", "about", "newsletter", "terms"].some((word) => text.includes(word))) {
    return false;
  }

  return [
    "ai",
    "artificial intelligence",
    "machine learning",
    "ml",
    "deep learning",
    "computer vision",
    "medical imaging",
    "data scientist",
    "research",
    "phd",
    "doctoral",
    "postdoc",
    "engineer",
    "scientist",
    "llm",
    "rag",
    "python",
  ].some((keyword) => text.includes(keyword));
}

function summarize(value?: string | null) {
  const text = cleanText(value);
  return text.length > 320 ? `${text.slice(0, 317)}...` : text || null;
}

function inferCountry(location?: string | null) {
  const text = (location ?? "").toLowerCase();

  if (text.includes("germany") || text.includes("berlin") || text.includes("munich")) {
    return "Germany";
  }

  if (text.includes("remote")) {
    return "Remote";
  }

  return null;
}
