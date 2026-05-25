"use client";

import { useRef } from "react";
import {
  updateApplicationDeadlineAction,
  updateApplicationPriorityAction,
  updateApplicationStatusAction,
  updateApplicationSubmitTodayAction,
} from "@/app/tracker/actions";

const statuses = [
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

export function ApplicationStatusSelect({
  id,
  status,
}: {
  id: number;
  status: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detailsRef} className="group w-44">
      <summary className={statusSummaryClass}>
        {status}
      </summary>
      <div className="mt-2 w-48 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#070a0d] p-1 shadow-2xl shadow-black/40">
        {statuses.map((option) => (
          <form key={option} action={updateApplicationStatusAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={option} />
            <button
              type="submit"
              onClick={() => {
                if (detailsRef.current) {
                  detailsRef.current.open = false;
                }
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-medium transition hover:bg-teal-300/10 hover:text-teal-100 ${
                option === status ? "text-teal-200" : "text-zinc-300"
              }`}
            >
              {option}
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}

export function ApplicationDeadlineInput({
  id,
  deadline,
}: {
  id: number;
  deadline: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateApplicationDeadlineAction}>
      <input type="hidden" name="id" value={id} />
      <input
        type="date"
        name="deadline"
        className={compactDateClass}
        defaultValue={deadline ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Application deadline"
      />
    </form>
  );
}

export function ApplicationPrioritySelect({
  id,
  priority,
}: {
  id: number;
  priority: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detailsRef} className="group w-32">
      <summary className={prioritySummaryClass}>
        {priority}
      </summary>
      <div className="mt-2 w-36 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#070a0d] p-1 shadow-2xl shadow-black/40">
        {priorities.map((option) => (
          <form key={option} action={updateApplicationPriorityAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="priority" value={option} />
            <button
              type="submit"
              onClick={() => {
                if (detailsRef.current) {
                  detailsRef.current.open = false;
                }
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-medium transition hover:bg-teal-300/10 hover:text-teal-100 ${
                option === priority ? "text-teal-200" : "text-zinc-300"
              }`}
            >
              {option}
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}

export function ApplicationSubmitTodayToggle({
  id,
  submitToday,
}: {
  id: number;
  submitToday: boolean;
}) {
  return (
    <form action={updateApplicationSubmitTodayAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="submit_today" value={submitToday ? "false" : "true"} />
      <button
        type="submit"
        className={submitToday ? submitTodayActiveClass : submitTodayIdleClass}
        aria-pressed={submitToday}
      >
        Urgent
      </button>
    </form>
  );
}

const statusSummaryClass =
  "block w-44 cursor-pointer list-none rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-xs font-medium text-teal-100 outline-none transition marker:hidden focus:border-teal-300/70 group-open:border-teal-300/70 [&::-webkit-details-marker]:hidden";

const compactDateClass =
  "w-44 rounded-full border border-white/[0.08] bg-[#0b1014] px-4 py-2 text-xs text-zinc-200 outline-none transition [color-scheme:dark] focus:border-teal-300/60";

const prioritySummaryClass =
  "block w-32 cursor-pointer list-none rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-medium text-zinc-200 outline-none transition marker:hidden focus:border-teal-300/70 group-open:border-teal-300/70 [&::-webkit-details-marker]:hidden";

const submitTodayIdleClass =
  "rounded-full border border-white/[0.1] bg-white/[0.02] px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-red-300/50 hover:bg-red-400/10 hover:text-red-100";

const submitTodayActiveClass =
  "rounded-full border border-red-300/50 bg-red-400/15 px-4 py-2 text-xs font-semibold text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.14)] transition hover:bg-red-400/20";
