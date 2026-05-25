import { saadOpportunityProfile } from "@/lib/opportunity-profile";
import type { DiscoveredOpportunity } from "@/lib/tracker-db";

type OpportunitySeed = Omit<
  DiscoveredOpportunity,
  | "match_score"
  | "matched_keywords"
  | "language_fit"
  | "paid_fit"
  | "competition_level"
  | "technical_fit"
  | "domain_fit"
  | "freshness_score"
  | "overall_score"
  | "match_reason"
  | "red_flags"
> & {
  text: string;
  source_type?: string;
  is_original_source?: boolean;
};

type FitEvaluation = {
  match_score: number;
  matched_keywords: string[];
  language_fit: "yes" | "likely" | "unknown" | "reject";
  paid_fit: "yes" | "likely" | "funded" | "unknown" | "reject";
  competition_level: "low" | "medium" | "high" | "unknown";
  technical_fit: number;
  domain_fit: number;
  freshness_score: number;
  overall_score: number;
  match_reason: string;
  red_flags: string[];
};

const jobSearchQueries = [
  "\"medical imaging\" \"machine learning\"",
  "\"medical imaging\" \"AI engineer\"",
  "\"medical imaging\" \"research engineer\"",
  "\"medical image analysis\" \"engineer\"",
  "\"medical image analysis\" \"machine learning\"",
  "\"computer vision\" \"medical\" \"engineer\"",
  "\"computer vision\" \"healthcare\" \"machine learning\"",
  "\"computer vision\" \"research engineer\"",
  "\"health ai\" \"machine learning\"",
  "\"healthcare ai\" \"engineer\"",
  "\"biomedical ai\" \"engineer\"",
  "\"biomedical\" \"machine learning engineer\"",
  "\"segmentation\" \"pytorch\" \"medical\"",
  "\"image segmentation\" \"deep learning\" \"engineer\"",
  "\"research engineer\" \"computer vision\" \"medical\"",
  "\"llm\" \"healthcare\" \"engineer\"",
  "\"clinical ai\" \"machine learning\"",
  "\"imaging ai\" \"engineer\"",
];

const researchSearchQueries = [
  "\"medical imaging\" \"PhD\" \"machine learning\"",
  "\"medical imaging\" \"doctoral researcher\"",
  "\"medical imaging\" \"research assistant\"",
  "\"medical image analysis\" \"doctoral researcher\"",
  "\"medical image analysis\" \"PhD\"",
  "\"computer vision\" \"biomedical\" \"PhD\"",
  "\"computer vision\" \"medical imaging\" \"PhD\"",
  "\"computer vision\" \"doctoral researcher\" \"health\"",
  "\"health AI\" \"doctoral researcher\"",
  "\"healthcare AI\" \"PhD\"",
  "\"biomedical AI\" \"PhD\"",
  "\"biomedical AI\" \"doctoral researcher\"",
  "\"segmentation\" \"PhD\" \"deep learning\"",
  "\"image segmentation\" \"PhD\" \"medical\"",
  "\"radiology\" \"artificial intelligence\" \"PhD\"",
  "\"radiology\" \"machine learning\" \"doctoral researcher\"",
  "\"research assistant\" \"medical imaging\" \"machine learning\"",
  "\"research engineer\" \"medical imaging\" \"machine learning\"",
  "\"LLM\" \"healthcare\" \"PhD\"",
];

const originalSourcePages = [
  { source: "ELLIS Jobs", url: "https://ellis.eu/jobs", organization: "ELLIS network institution", type: "research" },
];

const greenhouseBoards = [
  { board: "owkin", organization: "Owkin" },
  { board: "deepmind", organization: "Google DeepMind" },
  { board: "recursion", organization: "Recursion" },
  { board: "insitro", organization: "insitro" },
  { board: "tempus", organization: "Tempus AI" },
  { board: "aidoc", organization: "Aidoc" },
  { board: "vizai", organization: "Viz.ai" },
  { board: "nucleai", organization: "Nucleai" },
  { board: "freenome", organization: "Freenome" },
];

const leverBoards = [
  { company: "qbio", organization: "Q Bio" },
  { company: "paige", organization: "Paige" },
  { company: "heartflow", organization: "HeartFlow" },
  { company: "rad-ai", organization: "Rad AI" },
  { company: "caristo", organization: "Caristo Diagnostics" },
  { company: "aiforia", organization: "Aiforia" },
];

const coreRelevanceTerms = [
  "artificial intelligence",
  " ai ",
  "machine learning",
  " ml ",
  "deep learning",
  "computer vision",
  "medical imaging",
  "medical image",
  "biomedical ai",
  "health ai",
  "radiology",
  "computed tomography",
  "ct imaging",
  "mri",
  "segmentation",
  "pytorch",
  "tensorflow",
  "llm",
  "large language model",
  "rag",
  "research engineer",
  "data scientist",
];

export async function discoverOpportunities() {
  const results = await Promise.allSettled([
    discoverJobOpportunities(),
    discoverResearchOpportunities(),
  ]);

  return evaluateWithAi(dedupeAndRank(results.flatMap((result) => result.status === "fulfilled" ? result.value : [])).slice(0, 60));
}

export async function discoverJobOpportunities() {
  const results = await Promise.allSettled([
    fetchArbeitnowJobs(),
    fetchEuresJobs(),
    fetchLinkedInJobs(),
    fetchWellfoundJobs(),
    fetchDeepTechJobs(),
    fetchGreenhouseJobs(),
    fetchLeverJobs(),
  ]);

  return evaluateWithAi(dedupeAndRank(results.flatMap((result) => result.status === "fulfilled" ? result.value : [])).slice(0, 80));
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
    fetchOriginalSourcePages(),
  ]);

  return evaluateWithAi(dedupeAndRank(results.flatMap((result) => result.status === "fulfilled" ? result.value : [])).slice(0, 80));
}

async function fetchArbeitnowJobs(): Promise<DiscoveredOpportunity[]> {
  const response = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) return [];

  const payload = await response.json() as {
    data?: Array<{
      title?: string;
      company_name?: string;
      location?: string;
      url?: string;
      description?: string;
      tags?: string[];
      created_at?: number;
    }>;
  };

  return (payload.data ?? [])
    .map((job) => enrichOpportunity({
      source: "Arbeitnow",
      source_type: "aggregator",
      type: "job",
      organization: cleanText(job.company_name) || "Unknown organization",
      title: cleanText(job.title) || "Untitled role",
      country: inferCountry(job.location),
      city: cleanText(job.location),
      url: job.url ?? "",
      posted_at: job.created_at ? toIsoDateFromTimestamp(job.created_at) : null,
      deadline: null,
      summary: summarize(job.description),
      text: [job.title, job.company_name, job.location, job.description, ...(job.tags ?? [])].join(" "),
    }))
    .filter(shouldKeepOpportunity);
}

async function fetchEuraxessResearchPosts(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(researchSearchQueries.map(async (query) => {
    const url = `https://euraxess.ec.europa.eu/jobs/search?keywords=${encodeURIComponent(query)}`;
    return parseEuraxessHtml(await fetchHtml(url), url);
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchEuresJobs(): Promise<DiscoveredOpportunity[]> {
  return fetchSearchPages(jobSearchQueries, (query) =>
    `https://eures.europa.eu/job-search_en?keywords=${encodeURIComponent(query)}&locationCodes=eu`,
    "EURES",
    "job",
    "European employer",
    "aggregator",
  );
}

async function fetchAcademicTransferPosts(): Promise<DiscoveredOpportunity[]> {
  return fetchSearchPages(researchSearchQueries, (query) =>
    `https://www.academictransfer.com/en/jobs/?q=${encodeURIComponent(query)}`,
    "AcademicTransfer",
    "research",
    "Dutch research institution",
    "original",
    true,
  );
}

async function fetchEllisPosts(): Promise<DiscoveredOpportunity[]> {
  const url = "https://ellis.eu/jobs";
  return parseGenericOpportunityLinks({
    html: await fetchHtml(url),
    baseUrl: url,
    source: "ELLIS",
    defaultType: "research",
    fallbackOrganization: "ELLIS network institution",
    sourceType: "original",
    isOriginalSource: true,
  });
}

async function fetchMscaRelatedPosts(): Promise<DiscoveredOpportunity[]> {
  return fetchSearchPages([
    "MSCA doctoral network machine learning",
    "Marie Curie doctoral candidate artificial intelligence",
    "MSCA PhD computer vision",
  ], (query) =>
    `https://euraxess.ec.europa.eu/jobs/search?keywords=${encodeURIComponent(query)}`,
    "MSCA / EURAXESS",
    "phd",
    "MSCA doctoral network",
    "aggregator",
  );
}

async function fetchAcademicPositionsPosts(): Promise<DiscoveredOpportunity[]> {
  return fetchSearchPages(researchSearchQueries, (query) =>
    `https://academicpositions.com/find-jobs?keywords=${encodeURIComponent(query)}`,
    "Academic Positions",
    "research",
    "European academic institution",
    "aggregator",
  );
}

async function fetchNatureCareersPosts(): Promise<DiscoveredOpportunity[]> {
  return fetchSearchPages(researchSearchQueries, (query) =>
    `https://www.nature.com/naturecareers/jobs?keywords=${encodeURIComponent(query)}&location=europe`,
    "Nature Careers",
    "research",
    "Research institution",
    "aggregator",
  );
}

async function fetchFindAPhdPosts(): Promise<DiscoveredOpportunity[]> {
  return fetchSearchPages(researchSearchQueries, (query) =>
    `https://www.findaphd.com/phds/?Keywords=${encodeURIComponent(query)}`,
    "FindAPhD",
    "phd",
    "PhD host institution",
    "aggregator",
  );
}

async function fetchLinkedInJobs(): Promise<DiscoveredOpportunity[]> {
  return fetchSearchPages(jobSearchQueries, (query) =>
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=Worldwide&f_TPR=r86400`,
    "LinkedIn",
    "job",
    "Employer listed on LinkedIn",
    "aggregator",
  );
}

async function fetchWellfoundJobs(): Promise<DiscoveredOpportunity[]> {
  const url = "https://wellfound.com/location/europe";
  return parseGenericOpportunityLinks({
    html: await fetchHtml(url),
    baseUrl: url,
    source: "Wellfound",
    defaultType: "job",
    fallbackOrganization: "Startup employer",
    sourceType: "aggregator",
  });
}

async function fetchDeepTechJobs(): Promise<DiscoveredOpportunity[]> {
  const url = "https://deeptechjobs.eu/";
  return parseGenericOpportunityLinks({
    html: await fetchHtml(url),
    baseUrl: url,
    source: "DeepTechJobs",
    defaultType: "job",
    fallbackOrganization: "Deep-tech company",
    sourceType: "aggregator",
  });
}

async function fetchOriginalSourcePages(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(originalSourcePages.map(async (source) =>
    parseGenericOpportunityLinks({
      html: await fetchHtml(source.url),
      baseUrl: source.url,
      source: source.source,
      defaultType: source.type,
      fallbackOrganization: source.organization,
      sourceType: "original",
      isOriginalSource: true,
    }),
  ));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchGreenhouseJobs(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(greenhouseBoards.map(async ({ board, organization }) => {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) return [];

    const payload = await response.json() as {
      jobs?: Array<{
        title?: string;
        absolute_url?: string;
        content?: string;
        location?: { name?: string };
        updated_at?: string;
      }>;
    };

    return (payload.jobs ?? []).map((job) => enrichOpportunity({
      source: "Greenhouse",
      source_type: "original",
      is_original_source: true,
      type: inferOpportunityType(job.title ?? "", "job"),
      organization,
      title: cleanText(job.title) || "Untitled role",
      country: inferCountry(job.location?.name),
      city: cleanText(job.location?.name),
      url: job.absolute_url ?? "",
      posted_at: normalizeDate(job.updated_at),
      deadline: extractDeadline(job.content ?? ""),
      summary: summarize(job.content),
      text: [job.title, organization, job.location?.name, job.content].join(" "),
    })).filter(shouldKeepOpportunity);
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchLeverJobs(): Promise<DiscoveredOpportunity[]> {
  const pages = await Promise.allSettled(leverBoards.map(async ({ company, organization }) => {
    const response = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) return [];

    const jobs = await response.json() as Array<{
      text?: string;
      hostedUrl?: string;
      descriptionPlain?: string;
      categories?: { location?: string; team?: string; commitment?: string };
      createdAt?: number;
    }>;

    return jobs.map((job) => enrichOpportunity({
      source: "Lever",
      source_type: "original",
      is_original_source: true,
      type: inferOpportunityType(job.text ?? "", "job"),
      organization,
      title: cleanText(job.text) || "Untitled role",
      country: inferCountry(job.categories?.location),
      city: cleanText(job.categories?.location),
      url: job.hostedUrl ?? "",
      posted_at: job.createdAt ? toIsoDateFromTimestamp(job.createdAt) : null,
      deadline: extractDeadline(job.descriptionPlain ?? ""),
      summary: summarize(job.descriptionPlain),
      text: [job.text, organization, job.categories?.team, job.categories?.commitment, job.categories?.location, job.descriptionPlain].join(" "),
    })).filter(shouldKeepOpportunity);
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

async function fetchSearchPages(
  queries: string[],
  makeUrl: (query: string) => string,
  source: string,
  defaultType: string,
  fallbackOrganization: string,
  sourceType: string,
  isOriginalSource = false,
) {
  const pages = await Promise.allSettled(queries.map(async (query) => {
    const url = makeUrl(query);
    return parseGenericOpportunityLinks({
      html: await fetchHtml(url),
      baseUrl: url,
      source,
      defaultType,
      fallbackOrganization,
      sourceType,
      isOriginalSource,
    });
  }));

  return pages.flatMap((page) => page.status === "fulfilled" ? page.value : []);
}

function parseEuraxessHtml(html: string, fallbackUrl: string): DiscoveredOpportunity[] {
  const matches = [...html.matchAll(/href="(\/jobs\/\d+[^"]*)">([^<]{12,})<\/a>/g)];

  return matches
    .map((match) => {
      const title = cleanText(match[2]);
      const href = match[1] ?? "";
      const text = cleanText(extractContextAround(html, match.index ?? 0));

      return enrichOpportunity({
        source: "EURAXESS",
        source_type: "aggregator",
        type: inferOpportunityType(title, "research"),
        organization: "EURAXESS research opportunity",
        title: title || "Research opportunity",
        country: inferCountry(text),
        city: null,
        url: href.startsWith("http") ? href : `https://euraxess.ec.europa.eu${href || fallbackUrl}`,
        posted_at: extractPostedDate(text),
        deadline: extractDeadline(text),
        summary: "Research opportunity discovered from EURAXESS search.",
        text: `${title} ${text}`,
      });
    })
    .filter(shouldKeepOpportunity);
}

function parseGenericOpportunityLinks({
  html,
  baseUrl,
  source,
  defaultType,
  fallbackOrganization,
  sourceType,
  isOriginalSource = false,
}: {
  html: string;
  baseUrl: string;
  source: string;
  defaultType: string;
  fallbackOrganization: string;
  sourceType: string;
  isOriginalSource?: boolean;
}) {
  const anchorMatches = [...html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)];

  return anchorMatches
    .map((match) => {
      const href = decodeHtml(match[2] ?? "");
      const title = cleanText(decodeHtml(match[3] ?? ""));
      const url = resolveOpportunityUrl(href, baseUrl);
      const context = cleanText(decodeHtml(extractContextAround(html, match.index ?? 0)));
      const text = `${title} ${context} ${url}`;

      return enrichOpportunity({
        source,
        source_type: sourceType,
        is_original_source: isOriginalSource,
        type: inferOpportunityType(title, defaultType),
        organization: inferOrganization(context) ?? fallbackOrganization,
        title,
        country: inferCountry(text),
        city: null,
        url,
        posted_at: extractPostedDate(context),
        deadline: extractDeadline(context),
        summary: summarize(context),
        text,
      });
    })
    .filter(shouldKeepOpportunity);
}

function enrichOpportunity(seed: OpportunitySeed): DiscoveredOpportunity {
  const evaluation = evaluateFit(seed);

  return {
    source: seed.source,
    type: seed.type,
    organization: seed.organization,
    title: seed.title,
    country: seed.country,
    city: seed.city,
    url: seed.url,
    deadline: seed.deadline,
    posted_at: seed.posted_at,
    summary: seed.summary,
    source_type: seed.source_type ?? "aggregator",
    is_original_source: seed.is_original_source ?? false,
    ...evaluation,
  };
}

function evaluateFit(seed: OpportunitySeed): FitEvaluation {
  const haystack = normalizeForMatching(`${seed.title} ${seed.organization} ${seed.country ?? ""} ${seed.city ?? ""} ${seed.text}`);
  const roleMatches = matchTerms(haystack, saadOpportunityProfile.targetRoles);
  const domainMatches = matchTerms(haystack, saadOpportunityProfile.domains);
  const skillMatches = matchTerms(haystack, saadOpportunityProfile.strongSkills);
  const supportingMatches = matchTerms(haystack, saadOpportunityProfile.supportingSkills);
  const locationMatches = matchTerms(haystack, saadOpportunityProfile.preferredLocations);
  const paidMatches = matchTerms(haystack, saadOpportunityProfile.paidSignals);
  const englishMatches = matchTerms(haystack, saadOpportunityProfile.englishSignals);
  const redFlags = matchTerms(haystack, saadOpportunityProfile.avoid);

  // Title is the strongest signal — score it independently and boost if it directly names the role/domain
  const titleHaystack = normalizeForMatching(seed.title);
  const titleRoleMatches = matchTerms(titleHaystack, saadOpportunityProfile.targetRoles);
  const titleDomainMatches = matchTerms(titleHaystack, saadOpportunityProfile.domains);
  const titleBoost = clamp(titleRoleMatches.length * 22 + titleDomainMatches.length * 10, 0, 40);

  const roleFit = clamp(roleMatches.length * 18, 0, 100);
  const technicalFit = clamp(skillMatches.length * 14 + supportingMatches.length * 5, 0, 100);
  const domainFit = clamp(domainMatches.length * 18, 0, 100);
  const locationFit = clamp(locationMatches.length * 9, 0, 100);
  const freshnessScore = scoreFreshness(seed.posted_at);
  const languageFit = classifyLanguage(haystack, englishMatches, redFlags);
  const paidFit = classifyPaid(seed.type, haystack, paidMatches, redFlags);
  const competitionLevel = classifyCompetition(seed.is_original_source, seed.source_type, freshnessScore);
  const sourceBoost = seed.is_original_source ? 10 : 0;
  const hasCoreRelevance = hasAnyTerm(haystack, coreRelevanceTerms);
  const weakAcademicOnly = !hasCoreRelevance && roleMatches.some((role) => ["phd", "doctoral researcher", "postdoc"].includes(role));
  // Extra penalty when title doesn't name the role or domain at all — catches "Software Engineer at AI Co" false positives
  const noTitleMatchPenalty = titleRoleMatches.length === 0 && titleDomainMatches.length === 0 ? 20 : 0;
  const penalty = redFlags.length * 18 + (languageFit === "reject" ? 40 : 0) + (paidFit === "reject" ? 40 : 0) + (weakAcademicOnly ? 35 : 0) + noTitleMatchPenalty;

  const matchScore = clamp(Math.round(roleFit * 0.25 + technicalFit * 0.28 + domainFit * 0.27 + locationFit * 0.1 + sourceBoost + titleBoost), 0, 100);
  const overallScore = clamp(Math.round(matchScore * 0.62 + freshnessScore * 0.18 + (seed.is_original_source ? 12 : 0) + (paidFit === "funded" || paidFit === "yes" ? 5 : 0) - penalty), 0, 100);
  const matchedKeywords = [...new Set([...roleMatches, ...domainMatches, ...skillMatches, ...locationMatches, ...paidMatches, ...englishMatches])].slice(0, 12);

  return {
    match_score: matchScore,
    matched_keywords: matchedKeywords,
    language_fit: languageFit,
    paid_fit: paidFit,
    competition_level: competitionLevel,
    technical_fit: technicalFit,
    domain_fit: domainFit,
    freshness_score: freshnessScore,
    overall_score: overallScore,
    match_reason: buildMatchReason(roleMatches, domainMatches, skillMatches, seed.is_original_source, freshnessScore),
    red_flags: redFlags,
  };
}

function shouldKeepOpportunity(opportunity: DiscoveredOpportunity) {
  return Boolean(
    opportunity.url &&
    isLikelyOpportunityTitle(opportunity.title) &&
    opportunity.language_fit !== "reject" &&
    opportunity.paid_fit !== "reject" &&
    // Require genuine domain match — no fallback bypass via coreRelevanceTerms
    (opportunity.domain_fit ?? 0) >= 18 &&
    // Need at least 2 strong skill matches, not just 1
    (opportunity.technical_fit ?? 0) >= 28 &&
    hasRoleSignal(normalizeForMatching(`${opportunity.title} ${opportunity.summary ?? ""}`)) &&
    hasAnyTerm(normalizeForMatching(`${opportunity.title} ${opportunity.summary ?? ""}`), coreRelevanceTerms) &&
    // Raised from 58 — loosely matching jobs no longer slip through
    (opportunity.overall_score ?? 0) >= 65 &&
    // Zero tolerance — even 1 red flag is disqualifying
    (opportunity.red_flags ?? []).length === 0,
  );
}

async function evaluateWithAi(opportunities: DiscoveredOpportunity[]) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !opportunities.length) {
    return opportunities;
  }

  const evaluated = await Promise.allSettled(
    opportunities.slice(0, 40).map((opportunity) => evaluateOneWithAi(opportunity, apiKey)),
  );

  return evaluated
    .flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : [])
    .filter((opportunity) =>
      (opportunity.overall_score ?? 0) >= 72 &&
      ["yes", "likely"].includes(opportunity.language_fit ?? "unknown") &&
      ["yes", "likely", "funded"].includes(opportunity.paid_fit ?? "unknown") &&
      !(opportunity.red_flags ?? []).length,
    );
}

async function evaluateOneWithAi(opportunity: DiscoveredOpportunity, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MATCHER_MODEL ?? "gpt-5.1-mini",
      instructions: "You are a strict opportunity screener for Saad Ahmad. Reject anything that is not clearly relevant to AI/ML, computer vision, medical imaging, biomedical AI, health AI, LLM/RAG in healthcare, or research engineering. Return only JSON.",
      input: JSON.stringify({
        profile: {
          target: "Paid/funded English-friendly jobs, PhDs, doctoral researcher, research assistant, or research engineer roles matching Saad's AI/ML, medical imaging, computer vision, biomedical AI, health AI, PyTorch, segmentation, LLM/RAG profile.",
          mustReject: [
            "not AI/ML related",
            "not computer vision, medical imaging, health AI, biomedical AI, or LLM/RAG related",
            "German required",
            "unpaid",
            "too senior",
            "construction, materials, environmental science, generic robotics, management, or biology without clear AI/ML fit",
          ],
        },
        opportunity: {
          title: opportunity.title,
          organization: opportunity.organization,
          type: opportunity.type,
          source: opportunity.source,
          country: opportunity.country,
          summary: opportunity.summary,
          matched_keywords: opportunity.matched_keywords,
        },
        requiredJson: {
          keep: "boolean",
          overall_score: "0-100 integer",
          technical_fit: "0-100 integer",
          domain_fit: "0-100 integer",
          language_fit: "yes | likely | unknown | reject",
          paid_fit: "yes | likely | funded | unknown | reject",
          competition_level: "low | medium | high | unknown",
          match_reason: "one concise sentence",
          red_flags: "array of strings",
        },
      }),
      max_output_tokens: 500,
    }),
  });

  if (!response.ok) {
    return opportunity;
  }

  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).map((content) => content.text ?? "").join("") ?? "";
  const parsed = parseJsonObject(text);

  if (!parsed?.keep) {
    return null;
  }

  return {
    ...opportunity,
    overall_score: clamp(Number(parsed.overall_score) || opportunity.overall_score || 0, 0, 100),
    technical_fit: clamp(Number(parsed.technical_fit) || opportunity.technical_fit || 0, 0, 100),
    domain_fit: clamp(Number(parsed.domain_fit) || opportunity.domain_fit || 0, 0, 100),
    language_fit: String(parsed.language_fit ?? opportunity.language_fit),
    paid_fit: String(parsed.paid_fit ?? opportunity.paid_fit),
    competition_level: String(parsed.competition_level ?? opportunity.competition_level),
    match_reason: String(parsed.match_reason ?? opportunity.match_reason ?? ""),
    red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map(String) : opportunity.red_flags ?? [],
  };
}

function classifyLanguage(text: string, englishMatches: string[], redFlags: string[]): FitEvaluation["language_fit"] {
  if (redFlags.some((flag) => flag.includes("german") || flag.includes("deutsch"))) return "reject";
  if (englishMatches.length) return "yes";
  if (mostlyEnglish(text)) return "likely";
  return "unknown";
}

function classifyPaid(type: string, text: string, paidMatches: string[], redFlags: string[]): FitEvaluation["paid_fit"] {
  if (redFlags.some((flag) => flag === "unpaid" || flag === "volunteer")) return "reject";
  if (type === "phd" && (text.includes("funded") || text.includes("doctoral researcher") || text.includes("stipend"))) return "funded";
  if (type === "job") return "likely";
  if (paidMatches.length) return "yes";
  return "unknown";
}

function classifyCompetition(isOriginal: boolean | undefined, sourceType: string | undefined, freshnessScore: number): FitEvaluation["competition_level"] {
  if (isOriginal && freshnessScore >= 85) return "low";
  if (sourceType === "original") return "medium";
  if (freshnessScore >= 85) return "medium";
  return "high";
}

function scoreFreshness(postedAt?: string | null) {
  if (!postedAt) return 60;

  const posted = new Date(postedAt);
  if (Number.isNaN(posted.getTime())) return 60;

  const ageHours = (Date.now() - posted.getTime()) / 36e5;
  if (ageHours <= 24) return 100;
  if (ageHours <= 72) return 85;
  if (ageHours <= 168) return 70;
  if (ageHours <= 720) return 45;
  return 20;
}

function buildMatchReason(roles: string[], domains: string[], skills: string[], isOriginal?: boolean, freshnessScore = 0) {
  const parts = [];

  if (roles.length) parts.push(`role fit: ${roles.slice(0, 3).join(", ")}`);
  if (domains.length) parts.push(`domain fit: ${domains.slice(0, 3).join(", ")}`);
  if (skills.length) parts.push(`skills: ${skills.slice(0, 4).join(", ")}`);
  if (isOriginal) parts.push("found on an original source");
  if (freshnessScore >= 85) parts.push("fresh posting signal");

  return parts.length ? parts.join(". ") : "Kept because it passed the profile, language, and paid/funded filters.";
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

    if (!response.ok) return "";
    return response.text();
  } catch {
    return "";
  }
}

function dedupeAndRank(opportunities: DiscoveredOpportunity[]) {
  const byUrl = new Map<string, DiscoveredOpportunity>();

  for (const opportunity of opportunities) {
    const existing = byUrl.get(opportunity.url);
    if (!existing || (opportunity.overall_score ?? 0) > (existing.overall_score ?? 0)) {
      byUrl.set(opportunity.url, opportunity);
    }
  }

  return [...byUrl.values()].sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0));
}

function matchTerms(text: string, terms: string[]) {
  return terms.filter((term) => hasTerm(text, term));
}

function hasAnyTerm(text: string, terms: string[]) {
  return terms.some((term) => hasTerm(text, term));
}

function hasRoleSignal(text: string) {
  return hasAnyTerm(text, [
    "ai engineer",
    "machine learning engineer",
    "ml engineer",
    "computer vision engineer",
    "research engineer",
    "data scientist",
    "phd",
    "doctoral researcher",
    "doctoral candidate",
    "research assistant",
    "postdoc",
  ]);
}

function hasTerm(text: string, term: string) {
  const normalizedTerm = normalizeForMatching(term);
  if (normalizedTerm.length <= 3) {
    return new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}(\\s|$)`).test(text);
  }

  return text.includes(normalizedTerm);
}

function normalizeForMatching(value: string) {
  return ` ${cleanText(value).toLowerCase().replace(/[^a-z0-9.+-]+/g, " ")} `;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function mostlyEnglish(text: string) {
  const commonEnglish = ["the", "and", "with", "for", "in", "of", "to", "you", "we", "our", "research", "team"];
  return commonEnglish.filter((word) => text.includes(` ${word} `)).length >= 3;
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
  if (["phd", "ph.d", "doctoral", "doctorate"].some((keyword) => text.includes(keyword))) return "phd";
  if (["postdoc", "postdoctoral", "research", "scientist"].some((keyword) => text.includes(keyword))) return "research";
  return fallback;
}

function inferOrganization(text: string) {
  const match = text.match(/(?:at|by|with)\s+([A-Z][A-Za-z0-9&.,\- ]{3,60})/);
  return match?.[1]?.trim() ?? null;
}

function extractContextAround(html: string, index: number) {
  const start = Math.max(0, index - 900);
  const end = Math.min(html.length, index + 1800);
  return html.slice(start, end);
}

function extractPostedDate(text: string) {
  const cleaned = cleanText(text);
  const labelledDate = cleaned.match(
    /(?:posted|published|date posted|publication date|created|updated)[:\s-]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,12}\s+\d{4}|[A-Za-z]{3,12}\s+\d{1,2},?\s+\d{4})/i,
  );

  if (/\b(today|new)\b/i.test(cleaned)) return toIsoDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  return normalizeDate(labelledDate?.[1] ?? null);
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
  if (!value) return null;

  const text = value.trim().replace(/,/g, "");
  const isoLike = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  const dayFirst = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

  if (isoLike) return toIsoDate(Number(isoLike[1]), Number(isoLike[2]), Number(isoLike[3]));
  if (dayFirst) {
    const year = Number(dayFirst[3].length === 2 ? `20${dayFirst[3]}` : dayFirst[3]);
    return toIsoDate(year, Number(dayFirst[2]), Number(dayFirst[1]));
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return toIsoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

function toIsoDateFromTimestamp(timestamp: number) {
  const normalized = timestamp > 9999999999 ? timestamp : timestamp * 1000;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function toIsoDate(year: number, month: number, day: number) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isLikelyOpportunityTitle(title: string) {
  const text = normalizeForMatching(title);

  if (title.length < 10 || title.length > 190) return false;
  if (["cookie", "privacy", "login", "sign in", "contact", "about", "newsletter", "terms", "share this"].some((word) => text.includes(word))) {
    return false;
  }

  return hasAnyTerm(text, coreRelevanceTerms);
}

function summarize(value?: string | null) {
  const text = cleanText(value);
  return text.length > 360 ? `${text.slice(0, 357)}...` : text || null;
}

function inferCountry(location?: string | null) {
  const text = (location ?? "").toLowerCase();
  const countries = [
    "Germany",
    "Netherlands",
    "Switzerland",
    "Austria",
    "Denmark",
    "Sweden",
    "Finland",
    "Norway",
    "France",
    "Belgium",
    "Luxembourg",
    "Italy",
    "Spain",
    "Portugal",
    "Ireland",
    "United Kingdom",
    "Poland",
    "Estonia",
    "United States",
    "Canada",
  ];

  if (text.includes("remote")) return "Remote";
  return countries.find((country) => text.includes(country.toLowerCase())) ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
