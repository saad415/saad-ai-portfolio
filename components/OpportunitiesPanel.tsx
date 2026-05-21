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

export default function OpportunitiesPanel({ opportunities }: { opportunities: OpportunityRow[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(opportunities.length / opportunitiesPerPage));
  const page = Math.min(currentPage, totalPages);

  const visibleOpportunities = useMemo(() => {
    const start = (page - 1) * opportunitiesPerPage;
    return opportunities.slice(start, start + opportunitiesPerPage);
  }, [opportunities, page]);

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Discovered opportunities</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Manually refresh Europe-focused jobs, PhD, and research posts. Approve useful matches into your tracker.
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

      {!opportunities.length ? (
        <div className="p-6 text-sm leading-7 text-zinc-400">
          No new opportunities yet. Refresh jobs or PhD/research posts to search free sources.
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
              Showing {(page - 1) * opportunitiesPerPage + 1}-{Math.min(page * opportunitiesPerPage, opportunities.length)} of{" "}
              {opportunities.length}
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
          {opportunity.match_score}% match
        </span>
        <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs capitalize text-zinc-400">
          {opportunity.type}
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
        Last date: {formatDeadline(opportunity.deadline)}
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

function formatDeadline(deadline: string | null) {
  if (!deadline) {
    return "Not listed";
  }

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return deadline;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
