"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarClock, Check, ChevronLeft, ChevronRight, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import {
  approveOpportunityAction,
  rejectAllOpportunitiesAction,
  refreshJobOpportunitiesAction,
  refreshResearchOpportunitiesAction,
  updateOpportunityStatusAction,
} from "@/app/tracker/actions";
import { OpportunityRow } from "@/lib/tracker-db";

const opportunitiesPerPage = 10;
const filters = [
  { key: "fresh24h", label: "Last 24h" },
  { key: "english", label: "English" },
  { key: "paid", label: "Paid/Funded" },
  { key: "sourceOnly", label: "Source-only" },
  { key: "highMatch", label: "High match" },
] as const;

type FilterKey = typeof filters[number]["key"];

export default function OpportunitiesPanel({ opportunities }: { opportunities: OpportunityRow[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(["english", "paid"]));
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opportunity) => {
      if (activeFilters.has("fresh24h") && !isWithinLast24Hours(opportunity.first_seen_at, opportunity.posted_at)) return false;
      if (activeFilters.has("english") && !["yes", "likely"].includes(opportunity.language_fit)) return false;
      if (activeFilters.has("paid") && !["yes", "likely", "funded"].includes(opportunity.paid_fit)) return false;
      if (activeFilters.has("sourceOnly") && !opportunity.is_original_source) return false;
      if (activeFilters.has("highMatch") && opportunity.overall_score < 75) return false;
      return true;
    });
  }, [activeFilters, opportunities]);
  const totalPages = Math.max(1, Math.ceil(filteredOpportunities.length / opportunitiesPerPage));
  const page = Math.min(currentPage, totalPages);

  const visibleOpportunities = useMemo(() => {
    const start = (page - 1) * opportunitiesPerPage;
    return filteredOpportunities.slice(start, start + opportunitiesPerPage);
  }, [filteredOpportunities, page]);

  function toggleFilter(filter: FilterKey) {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
    setCurrentPage(1);
  }

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Discovered opportunities</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Profile-matched English jobs, funded PhDs, and research roles, with source-only and freshness signals.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <form action={refreshJobOpportunitiesAction}>
            <RefreshButton variant="primary" label="Refresh Jobs" />
          </form>
          <form action={refreshResearchOpportunitiesAction}>
            <RefreshButton label="Refresh PhD / Research" />
          </form>
          <form action={rejectAllOpportunitiesAction}>
            <RejectAllButton disabled={!opportunities.length} />
          </form>
        </div>
      </div>

      {!!opportunities.length && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-6 py-4">
          {filters.map((filter) => {
            const active = activeFilters.has(filter.key);

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => toggleFilter(filter.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-teal-300/40 bg-teal-300/12 text-teal-100"
                    : "border-white/[0.1] bg-white/[0.02] text-zinc-400 hover:border-teal-300/40 hover:text-teal-100"
                }`}
                aria-pressed={active}
              >
                {filter.label}
              </button>
            );
          })}
          <span className="ml-1 text-xs text-zinc-500">
            {filteredOpportunities.length} shown from {opportunities.length}
          </span>
        </div>
      )}

      {!opportunities.length ? (
        <div className="p-6 text-sm leading-7 text-zinc-400">
          No new opportunities yet. Refresh jobs or PhD/research posts to search free sources.
        </div>
      ) : !filteredOpportunities.length ? (
        <div className="p-6 text-sm leading-7 text-zinc-400">
          No opportunities match the active filters. Try turning off Last 24h or High match.
        </div>
      ) : (
        <>
          <div className="grid gap-4 p-6 lg:grid-cols-2">
            {visibleOpportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-white/[0.08] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Showing {(page - 1) * opportunitiesPerPage + 1}-{Math.min(page * opportunitiesPerPage, filteredOpportunities.length)} of{" "}
              {filteredOpportunities.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] text-zinc-300 transition hover:border-teal-300/60 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous opportunities page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-24 text-center text-sm text-zinc-400">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                disabled={page === totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] text-zinc-300 transition hover:border-teal-300/60 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next opportunities page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function RefreshButton({ label, variant = "secondary" }: { label: string; variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  const Icon = pending ? Loader2 : RefreshCw;
  const className = variant === "primary"
    ? "inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-80"
    : "inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-teal-300/60 hover:bg-teal-300/10 hover:text-teal-200 disabled:cursor-wait disabled:opacity-70";

  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      <Icon size={15} className={pending ? "animate-spin" : undefined} />
      {pending ? "Refreshing..." : label}
    </button>
  );
}

function RejectAllButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const Icon = pending ? Loader2 : X;

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-300/5 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-300/10 disabled:cursor-not-allowed disabled:opacity-45"
      aria-busy={pending}
    >
      <Icon size={15} className={pending ? "animate-spin" : undefined} />
      {pending ? "Rejecting..." : "Reject All"}
    </button>
  );
}

function OpportunityCard({ opportunity }: { opportunity: OpportunityRow }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2.5 py-1 text-xs font-medium text-teal-200">
          {opportunity.overall_score || opportunity.match_score}% overall
        </span>
        <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-xs font-medium text-sky-100">
          {opportunity.match_score}% fit
        </span>
        <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs capitalize text-zinc-400">
          {opportunity.type}
        </span>
        {opportunity.is_original_source && (
          <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-xs text-violet-100">
            Source-only
          </span>
        )}
        <span className={`rounded-full border px-2.5 py-1 text-xs ${competitionClass(opportunity.competition_level)}`}>
          {opportunity.competition_level} competition
        </span>
        <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-zinc-400">
          {opportunity.source}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-white">
        {opportunity.title}
      </h3>
      <p className="mt-2 text-sm text-zinc-500">
        {opportunity.organization}
        {(opportunity.city || opportunity.country) && (
          <> - {[opportunity.city, opportunity.country].filter(Boolean).join(", ")}</>
        )}
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-xs font-medium text-zinc-400">
        <CalendarClock size={14} className="text-teal-300" />
        Posted: {formatDate(opportunity.posted_at) || formatFreshness(opportunity.first_seen_at)} · Deadline: {formatDate(opportunity.deadline) || "Not listed"}
      </div>

      <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
        <ScoreMetric label="Technical" value={opportunity.technical_fit} />
        <ScoreMetric label="Domain" value={opportunity.domain_fit} />
        <ScoreMetric label="Freshness" value={opportunity.freshness_score} />
      </div>

      {opportunity.summary && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-400">
          {opportunity.summary}
        </p>
      )}

      {!!opportunity.matched_keywords.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {opportunity.matched_keywords.map((keyword) => (
            <span key={keyword} className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400">
              {keyword}
            </span>
          ))}
        </div>
      )}

      {opportunity.match_reason && (
        <p className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 text-sm leading-6 text-zinc-300">
          {opportunity.match_reason}
        </p>
      )}

      {!!opportunity.red_flags.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {opportunity.red_flags.map((flag) => (
            <span key={flag} className="rounded-full border border-red-300/20 bg-red-300/5 px-2.5 py-1 text-xs text-red-200">
              {flag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={opportunity.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.02] px-4 py-2 text-sm font-semibold text-white transition hover:border-teal-300/60 hover:bg-teal-300/10 hover:text-teal-200"
        >
          Open <ExternalLink size={14} />
        </a>
        <form action={approveOpportunityAction}>
          <input type="hidden" name="id" value={opportunity.id} />
          <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-teal-300 px-4 py-2 text-sm font-semibold text-[#04100f]">
            <Check size={14} /> Add to Tracker
          </button>
        </form>
        <form action={updateOpportunityStatusAction}>
          <input type="hidden" name="id" value={opportunity.id} />
          <input type="hidden" name="status" value="rejected" />
          <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-red-300/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-300/10">
            <X size={14} /> Reject
          </button>
        </form>
        <form action={updateOpportunityStatusAction}>
          <input type="hidden" name="id" value={opportunity.id} />
          <input type="hidden" name="status" value="archived" />
          <button type="submit" className="rounded-full border border-white/[0.12] px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:text-white">
            Archive
          </button>
        </form>
      </div>
    </article>
  );
}

function ScoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-200">{value}%</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isWithinLast24Hours(firstSeenAt: string | null, postedAt: string | null) {
  return [firstSeenAt, postedAt].some((value) => {
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() <= 24 * 60 * 60 * 1000;
  });
}

function formatFreshness(firstSeenAt: string | null) {
  if (!firstSeenAt) return "Newly discovered";
  const date = new Date(firstSeenAt);
  if (Number.isNaN(date.getTime())) return "Newly discovered";
  return `First seen ${new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(date)}`;
}

function competitionClass(level: string) {
  if (level === "low") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  if (level === "medium") return "border-yellow-300/20 bg-yellow-300/10 text-yellow-100";
  if (level === "high") return "border-red-300/20 bg-red-300/10 text-red-100";
  return "border-white/[0.08] text-zinc-400";
}
