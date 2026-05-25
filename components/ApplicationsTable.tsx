"use client";

import { useMemo, useState } from "react";
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ApplicationDeadlineInput, ApplicationPrioritySelect, ApplicationStatusSelect, ApplicationSubmitTodayToggle } from "@/components/ApplicationQuickFields";
import ApplicationEditModal from "@/components/ApplicationEditModal";
import { ApplicationRow } from "@/lib/tracker-db";

type SortField = "status" | "deadline" | "priority";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = {
  "Not Applied": 0,
  "Interested":  1,
  "Preparing":   2,
  "Applied":     3,
  "Assessment":  4,
  "Interview":   5,
  "Offer":       6,
  "Rejected":    7,
  "Archived":    8,
};

const PRIORITY_ORDER: Record<string, number> = {
  High:   0,
  Medium: 1,
  Low:    2,
};

const applicationsPerPage = 10;

function sortApplications(
  apps: ApplicationRow[],
  field: SortField | null,
  dir: SortDir,
): ApplicationRow[] {
  if (!field) return apps;

  return sortTodayFirst([...apps]).sort((a, b) => {
    let cmp = 0;

    if (field === "status") {
      cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    } else if (field === "priority") {
      cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
    } else if (field === "deadline") {
      if (!a.deadline && !b.deadline) cmp = 0;
      else if (!a.deadline) cmp = 1;
      else if (!b.deadline) cmp = -1;
      else cmp = a.deadline.localeCompare(b.deadline);
    }

    return dir === "asc" ? cmp : -cmp;
  });
}

function sortTodayFirst(apps: ApplicationRow[]) {
  return [...apps].sort((a, b) => Number(b.submit_today) - Number(a.submit_today));
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={13} className="ml-1 inline opacity-30" />;
  return dir === "asc"
    ? <ChevronUp size={13} className="ml-1 inline text-teal-300" />
    : <ChevronDown size={13} className="ml-1 inline text-teal-300" />;
}

export default function ApplicationsTable({ applications }: { applications: ApplicationRow[] }) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);

  function handleSort(field: SortField) {
    if (sortField === field) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortField(null);
        setSortDir("asc");
      }
    } else {
      setSortField(field);
      setSortDir("asc");
    }

    setCurrentPage(1);
  }

  const sorted = sortField
    ? sortApplications(applications, sortField, sortDir)
    : sortTodayFirst(applications);
  const totalPages = Math.max(1, Math.ceil(sorted.length / applicationsPerPage));
  const page = Math.min(currentPage, totalPages);
  const visibleApplications = useMemo(() => {
    const start = (page - 1) * applicationsPerPage;
    return sorted.slice(start, start + applicationsPerPage);
  }, [sorted, page]);

  if (!applications.length) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-8">
        <h2 className="text-xl font-semibold">No applications yet</h2>
        <p className="mt-3 leading-7 text-zinc-400">
          Add your first university or job application using the form.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b1014]/65">
      <div className="border-b border-white/[0.08] p-6">
        <h2 className="text-xl font-semibold">Tracked applications</h2>
        <p className="mt-2 text-sm text-zinc-500">{applications.length} total records</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-4">Organization</th>
              <th className="px-5 py-4">Title</th>
              <th className="px-5 py-4">Urgent</th>
              <th
                className="cursor-pointer select-none px-5 py-4 transition-colors hover:text-zinc-300"
                onClick={() => handleSort("status")}
              >
                Status
                <SortIcon active={sortField === "status"} dir={sortDir} />
              </th>
              <th
                className="cursor-pointer select-none px-5 py-4 transition-colors hover:text-zinc-300"
                onClick={() => handleSort("deadline")}
              >
                Deadline
                <SortIcon active={sortField === "deadline"} dir={sortDir} />
              </th>
              <th
                className="cursor-pointer select-none px-5 py-4 transition-colors hover:text-zinc-300"
                onClick={() => handleSort("priority")}
              >
                Priority
                <SortIcon active={sortField === "priority"} dir={sortDir} />
              </th>
              <th className="px-5 py-4">Link</th>
              <th className="px-5 py-4">Edit</th>
            </tr>
          </thead>
          <tbody>
            {visibleApplications.map((application) => (
              <ApplicationTableRow key={application.id} application={application} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/[0.08] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          Showing {(page - 1) * applicationsPerPage + 1}-{Math.min(page * applicationsPerPage, sorted.length)} of{" "}
          {sorted.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
            disabled={page === 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] text-zinc-300 transition hover:border-teal-300/60 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous applications page"
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
            aria-label="Next applications page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicationTableRow({ application }: { application: ApplicationRow }) {
  return (
    <tr className={`border-b align-top last:border-0 ${
      application.submit_today
        ? "border-red-300/20 bg-red-400/[0.06]"
        : "border-white/[0.06]"
    }`}>
      <td className="px-5 py-4 font-medium text-white">
        {application.organization}
        {application.submit_today && (
          <p className="mt-2 inline-flex rounded-full border border-red-300/40 bg-red-400/10 px-2 py-0.5 text-[11px] font-semibold text-red-100">
            Urgent
          </p>
        )}
        <p className="mt-1 text-xs font-normal capitalize text-zinc-500">{application.type}</p>
      </td>
      <td className="px-5 py-4 text-zinc-300">
        {application.title}
        {(application.city || application.country) && (
          <p className="mt-1 text-xs text-zinc-500">
            {[application.city, application.country].filter(Boolean).join(", ")}
          </p>
        )}
      </td>
      <td className="px-5 py-4">
        <ApplicationSubmitTodayToggle id={application.id} submitToday={application.submit_today} />
      </td>
      <td className="px-5 py-4">
        <ApplicationStatusSelect id={application.id} status={application.status} />
      </td>
      <td className="px-5 py-4">
        <ApplicationDeadlineInput id={application.id} deadline={application.deadline} />
      </td>
      <td className="px-5 py-4">
        <ApplicationPrioritySelect id={application.id} priority={application.priority} />
      </td>
      <td className="px-5 py-4">
        {application.application_url ? (
          <a
            href={application.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-teal-300 transition hover:text-teal-200"
          >
            Open <ExternalLink size={13} />
          </a>
        ) : "-"}
      </td>
      <td className="px-5 py-4">
        <ApplicationEditModal application={application} />
      </td>
    </tr>
  );
}
