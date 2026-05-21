"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, isTrackerEmailAllowed } from "@/lib/auth";
import {
  discoverJobOpportunities,
  discoverResearchOpportunities,
} from "@/lib/opportunity-discovery";
import {
  approveOpportunity,
  createApplication,
  deleteApplication,
  rejectAllNewOpportunities,
  saveDiscoveredOpportunities,
  updateApplication,
  updateApplicationDeadline,
  updateApplicationPriority,
  updateApplicationStatus,
  updateOpportunityStatus,
  ApplicationStatus,
  OpportunityStatus,
} from "@/lib/tracker-db";

const applicationStatuses: ApplicationStatus[] = [
  "Not Applied",
  "Interested",
  "Preparing",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
  "Archived",
];

const priorities = ["Low", "Medium", "High"];

export type ApplicationAutofillData = {
  type?: string;
  organization?: string;
  title?: string;
  country?: string;
  city?: string;
  deadline?: string;
  priority?: string;
  notes?: string;
};

async function requireTrackerAccess() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("You must be signed in to manage applications.");
  }

  if (!isTrackerEmailAllowed(session.user.email)) {
    throw new Error("Your account is not allowed to manage applications.");
  }

  return session;
}

export async function createApplicationAction(formData: FormData) {
  await requireTrackerAccess();
  await createApplication(formData);
  revalidatePath("/tracker");
}

export async function autofillApplicationFromUrlAction(url: string): Promise<ApplicationAutofillData> {
  await requireTrackerAccess();

  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    throw new Error("Enter a valid application link.");
  }

  const response = await fetch(normalizedUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 application-tracker",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error("Could not fetch this page.");
  }

  const html = await response.text();
  const metadata = extractPageMetadata(html, normalizedUrl);

  return {
    type: inferApplicationType(`${metadata.title} ${metadata.description} ${normalizedUrl}`),
    organization: metadata.organization,
    title: metadata.title,
    country: inferCountry(`${metadata.description} ${metadata.title}`),
    city: inferCity(`${metadata.description} ${metadata.title}`),
    deadline: extractDeadline(`${metadata.description} ${metadata.bodyText}`) ?? undefined,
    priority: inferPriority(`${metadata.title} ${metadata.description}`),
    notes: metadata.description ? `Imported from ${normalizedUrl}\n\n${metadata.description}` : `Imported from ${normalizedUrl}`,
  };
}

export async function updateApplicationAction(formData: FormData) {
  await requireTrackerAccess();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  await updateApplication(id, formData);
  revalidatePath("/tracker");
}

export async function updateApplicationDeadlineAction(formData: FormData) {
  await requireTrackerAccess();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  const deadline = String(formData.get("deadline") || "").trim() || null;
  await updateApplicationDeadline(id, deadline);
  revalidatePath("/tracker");
}

export async function updateApplicationStatusAction(formData: FormData) {
  await requireTrackerAccess();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as ApplicationStatus;

  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  if (!applicationStatuses.includes(status)) {
    throw new Error("Invalid application status.");
  }

  await updateApplicationStatus(id, status);
  revalidatePath("/tracker");
}

export async function updateApplicationPriorityAction(formData: FormData) {
  await requireTrackerAccess();

  const id = Number(formData.get("id"));
  const priority = String(formData.get("priority"));

  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  if (!priorities.includes(priority)) {
    throw new Error("Invalid application priority.");
  }

  await updateApplicationPriority(id, priority);
  revalidatePath("/tracker");
}

export async function deleteApplicationAction(formData: FormData) {
  await requireTrackerAccess();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  await deleteApplication(id);
  revalidatePath("/tracker");
}

export async function refreshJobOpportunitiesAction() {
  await requireTrackerAccess();

  const opportunities = await discoverJobOpportunities();
  await saveDiscoveredOpportunities(opportunities);
  revalidatePath("/tracker");
}

export async function refreshResearchOpportunitiesAction() {
  await requireTrackerAccess();

  const opportunities = await discoverResearchOpportunities();
  await saveDiscoveredOpportunities(opportunities);
  revalidatePath("/tracker");
}

export async function approveOpportunityAction(formData: FormData) {
  await requireTrackerAccess();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Invalid opportunity id.");
  }

  await approveOpportunity(id);
  revalidatePath("/tracker");
}

export async function updateOpportunityStatusAction(formData: FormData) {
  await requireTrackerAccess();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as OpportunityStatus;

  if (!Number.isInteger(id)) {
    throw new Error("Invalid opportunity id.");
  }

  if (!["rejected", "archived"].includes(status)) {
    throw new Error("Invalid opportunity status.");
  }

  await updateOpportunityStatus(id, status);
  revalidatePath("/tracker");
}

export async function rejectAllOpportunitiesAction() {
  await requireTrackerAccess();
  await rejectAllNewOpportunities();
  revalidatePath("/tracker");
}

function normalizeUrl(value: string) {
  try {
    return new URL(value.trim()).toString();
  } catch {
    return null;
  }
}

function extractPageMetadata(html: string, url: string) {
  const title = cleanText(
    readMeta(html, "og:title") ??
      readMeta(html, "twitter:title") ??
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
      "",
  );
  const description = summarize(cleanText(
    readMeta(html, "og:description") ??
      readMeta(html, "description") ??
      readMeta(html, "twitter:description") ??
      "",
  ));
  const siteName = cleanText(readMeta(html, "og:site_name") ?? "");
  const host = new URL(url).hostname.replace(/^www\./, "");

  return {
    title: trimTitle(title),
    organization: siteName || prettifyHost(host),
    description,
    bodyText: cleanText(html).slice(0, 5000),
  };
}

function readMeta(html: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyFirst = new RegExp(`<meta[^>]+(?:property|name)=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i");
  const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapedName}["'][^>]*>`, "i");

  return decodeHtml(propertyFirst.exec(html)?.[1] ?? contentFirst.exec(html)?.[1] ?? "");
}

function trimTitle(value: string) {
  return value
    .replace(/\s+[|-]\s+(LinkedIn|Indeed|EURAXESS|AcademicTransfer|Academic Positions|FindAPhD).*$/i, "")
    .slice(0, 180)
    .trim();
}

function prettifyHost(host: string) {
  const [name] = host.split(".");
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferApplicationType(text: string) {
  const lower = text.toLowerCase();

  if (["phd", "ph.d", "doctoral", "doctorate", "university", "postdoc", "research assistant"].some((keyword) => lower.includes(keyword))) {
    return "university";
  }

  return "job";
}

function inferPriority(text: string) {
  const lower = text.toLowerCase();

  if (["medical imaging", "computer vision", "machine learning", "phd", "doctoral", "research engineer"].some((keyword) => lower.includes(keyword))) {
    return "High";
  }

  return "Medium";
}

function inferCountry(text: string) {
  const lower = text.toLowerCase();
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
  ];

  return countries.find((country) => lower.includes(country.toLowerCase()));
}

function inferCity(text: string) {
  const lower = text.toLowerCase();
  const cities = [
    "Berlin",
    "Munich",
    "Hamburg",
    "Erlangen",
    "Zurich",
    "Amsterdam",
    "Eindhoven",
    "Delft",
    "Leuven",
    "Paris",
    "Copenhagen",
    "Stockholm",
    "Helsinki",
    "Oslo",
    "Vienna",
    "London",
  ];

  return cities.find((city) => lower.includes(city.toLowerCase()));
}

function extractDeadline(text: string) {
  const labelledDate = text.match(
    /(?:deadline|closing date|apply by|application deadline|deadline for applications|expires|until)[:\s-]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,12}\s+\d{4}|[A-Za-z]{3,12}\s+\d{1,2},?\s+\d{4})/i,
  );
  const anyDate = text.match(
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

function summarize(value: string) {
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}

function cleanText(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
