"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarDays, ExternalLink, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import {
  createProfessorContactAction,
  deleteProfessorContactAction,
  updateProfessorContactAction,
  updateProfessorContactStatusAction,
} from "@/app/tracker/actions";
import { ProfessorContactRow, ProfessorContactStatus } from "@/lib/tracker-db";

const statuses: ProfessorContactStatus[] = [
  "Not Emailed",
  "Emailed",
  "In Conversation",
];

const filters = ["All", ...statuses] as const;
type ProfessorFilter = typeof filters[number];

type ProfessorFormState = {
  professor_name: string;
  university: string;
  scholar_url: string;
  contact_date: string;
  status: ProfessorContactStatus;
};

const initialFormState: ProfessorFormState = {
  professor_name: "",
  university: "",
  scholar_url: "",
  contact_date: "",
  status: "Not Emailed",
};

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProfessorContactsSection({
  professors,
}: {
  professors: ProfessorContactRow[];
}) {
  const [form, setForm] = useState(initialFormState);
  const [activeFilter, setActiveFilter] = useState<ProfessorFilter>("All");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const todayKey = getLocalDateKey(new Date());
  const filteredProfessors = professors.filter((professor) => {
    if (activeFilter !== "All" && professor.status !== activeFilter) {
      return false;
    }

    if (showTodayOnly && professor.contact_date !== todayKey) {
      return false;
    }

    return true;
  });
  const activeCountLabel = activeFilter === "All" && !showTodayOnly
    ? `${professors.length} total professors`
    : `${filteredProfessors.length} shown of ${professors.length} total professors`;

  function updateField<FieldName extends keyof ProfessorFormState>(
    name: FieldName,
    value: ProfessorFormState[FieldName],
  ) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65">
      <div className="flex flex-col gap-5 border-b border-white/[0.08] p-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Professor contacts</h2>
          <p className="mt-2 text-sm text-zinc-500">
            {activeCountLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex w-fit flex-wrap rounded-full border border-white/[0.1] bg-white/[0.025] p-1">
            {filters.map((filter) => {
              const active = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-teal-300 text-[#06100f]"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                  aria-pressed={active}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowTodayOnly((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              showTodayOnly
                ? "border-teal-300 bg-teal-300 text-[#06100f]"
                : "border-white/[0.1] bg-white/[0.025] text-zinc-400 hover:text-zinc-100"
            }`}
            aria-pressed={showTodayOnly}
          >
            <CalendarDays size={15} />
            Today
          </button>
        </div>
      </div>

      <form
        action={async (formData) => {
          await createProfessorContactAction(formData);
          setForm(initialFormState);
        }}
        className="border-b border-white/[0.08] p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
            <UserRound size={18} className="text-teal-300" />
          </span>
          <h3 className="text-lg font-semibold">Add professor</h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1.2fr_0.8fr_0.9fr_auto]">
          <Field label="Professor Name">
            <input
              name="professor_name"
              required
              className={inputClass}
              placeholder="Prof. Jane Smith"
              value={form.professor_name}
              onChange={(event) => updateField("professor_name", event.target.value)}
            />
          </Field>
          <Field label="University">
            <input
              name="university"
              required
              className={inputClass}
              placeholder="University name"
              value={form.university}
              onChange={(event) => updateField("university", event.target.value)}
            />
          </Field>
          <Field label="Google Scholar Link">
            <input
              name="scholar_url"
              className={inputClass}
              placeholder="https://scholar.google.com/..."
              value={form.scholar_url}
              onChange={(event) => updateField("scholar_url", event.target.value)}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              name="contact_date"
              className={inputClass}
              value={form.contact_date}
              onChange={(event) => updateField("contact_date", event.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              name="status"
              className={inputClass}
              value={form.status}
              onChange={(event) => updateField("status", event.target.value as ProfessorContactStatus)}
            >
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <SaveProfessorButton />
          </div>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-4">Professor</th>
              <th className="px-5 py-4">University</th>
              <th className="px-5 py-4">Google Scholar</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Edit</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfessors.length ? (
              filteredProfessors.map((professor) => (
                <ProfessorContactRowView key={professor.id} professor={professor} />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                  {activeFilter === "All"
                    ? showTodayOnly ? "No professor contacts scheduled for today." : "No professor contacts yet."
                    : `No ${activeFilter.toLowerCase()} professors found.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProfessorContactRowView({ professor }: { professor: ProfessorContactRow }) {
  return (
    <tr className="border-b border-white/[0.06] align-top last:border-0">
      <td className="px-5 py-4 font-medium text-white">{professor.professor_name}</td>
      <td className="px-5 py-4 text-zinc-300">{professor.university}</td>
      <td className="px-5 py-4">
        {professor.scholar_url ? (
          <a
            href={professor.scholar_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-teal-300 transition hover:text-teal-200"
          >
            Open <ExternalLink size={13} />
          </a>
        ) : (
          <span className="text-zinc-600">-</span>
        )}
      </td>
      <td className="px-5 py-4 text-zinc-300">
        {formatDate(professor.contact_date)}
      </td>
      <td className="px-5 py-4">
        <ProfessorStatusSelect id={professor.id} status={professor.status} />
      </td>
      <td className="px-5 py-4">
        <ProfessorEditModal professor={professor} />
      </td>
    </tr>
  );
}

function ProfessorEditModal({ professor }: { professor: ProfessorContactRow }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-teal-300 transition hover:text-teal-100"
      >
        <Pencil size={14} /> Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#070a0d] p-6 shadow-2xl shadow-black/60">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Edit professor</h3>
                <p className="mt-1 text-sm text-zinc-500">{professor.university}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] text-zinc-300 transition hover:border-teal-300/60 hover:text-teal-100"
                aria-label="Close edit modal"
              >
                <X size={18} />
              </button>
            </div>

            <form
              action={async (formData) => {
                await updateProfessorContactAction(formData);
                setOpen(false);
              }}
              className="grid gap-4"
            >
              <input type="hidden" name="id" value={professor.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Professor Name">
                  <input
                    name="professor_name"
                    required
                    className={inputClass}
                    defaultValue={professor.professor_name}
                  />
                </Field>
                <Field label="University">
                  <input
                    name="university"
                    required
                    className={inputClass}
                    defaultValue={professor.university}
                  />
                </Field>
                <Field label="Google Scholar Link">
                  <input
                    name="scholar_url"
                    className={inputClass}
                    defaultValue={professor.scholar_url ?? ""}
                  />
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    name="contact_date"
                    className={inputClass}
                    defaultValue={professor.contact_date ?? ""}
                  />
                </Field>
                <Field label="Status">
                  <select name="status" className={inputClass} defaultValue={professor.status}>
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
                <UpdateProfessorButton />
              </div>
            </form>

            <form
              action={async (formData) => {
                await deleteProfessorContactAction(formData);
                setOpen(false);
              }}
              className="mt-4"
            >
              <input type="hidden" name="id" value={professor.id} />
              <DeleteProfessorButton />
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function ProfessorStatusSelect({
  id,
  status,
}: {
  id: number;
  status: ProfessorContactStatus;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detailsRef} className="group w-44">
      <summary className={statusSummaryClass}>
        {status}
      </summary>
      <div className="mt-2 w-48 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#070a0d] p-1 shadow-2xl shadow-black/40">
        {statuses.map((option) => (
          <form key={option} action={updateProfessorContactStatusAction}>
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

function SaveProfessorButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[46px] items-center justify-center gap-2 rounded-full bg-teal-300 px-5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-70"
    >
      <Plus size={16} />
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function UpdateProfessorButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Updating..." : "Update professor"}
    </button>
  );
}

function DeleteProfessorButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 text-sm font-medium text-red-300 transition hover:text-red-200 disabled:cursor-wait disabled:opacity-70"
    >
      <Trash2 size={14} /> {pending ? "Deleting..." : "Delete professor"}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/[0.08] bg-[#0b1014] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 [color-scheme:dark] focus:border-teal-300/60 [&>option]:bg-[#0b1014] [&>option]:text-white";

const statusSummaryClass =
  "block w-44 cursor-pointer list-none rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-xs font-medium text-teal-100 outline-none transition marker:hidden focus:border-teal-300/70 group-open:border-teal-300/70 [&::-webkit-details-marker]:hidden";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
