"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Trash2, X } from "lucide-react";
import {
  deleteApplicationAction,
  updateApplicationAction,
} from "@/app/tracker/actions";
import { ApplicationRow } from "@/lib/tracker-db";

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
const types = ["university", "job"];

export default function ApplicationEditModal({ application }: { application: ApplicationRow }) {
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
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#070a0d] p-6 shadow-2xl shadow-black/60">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Edit application</h3>
                <p className="mt-1 text-sm text-zinc-500">{application.organization}</p>
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
                await updateApplicationAction(formData);
                setOpen(false);
              }}
              className="grid gap-4"
            >
              <input type="hidden" name="id" value={application.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Type">
                  <select name="type" className={inputClass} defaultValue={application.type}>
                    {types.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select name="status" className={inputClass} defaultValue={application.status}>
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </Field>
                <Field label="Organization">
                  <input name="organization" required className={inputClass} defaultValue={application.organization} />
                </Field>
                <Field label="Title">
                  <input name="title" required className={inputClass} defaultValue={application.title} />
                </Field>
                <Field label="Country">
                  <input name="country" className={inputClass} defaultValue={application.country ?? ""} />
                </Field>
                <Field label="City">
                  <input name="city" className={inputClass} defaultValue={application.city ?? ""} />
                </Field>
                <Field label="Deadline">
                  <input type="date" name="deadline" className={inputClass} defaultValue={application.deadline ?? ""} />
                </Field>
                <Field label="Applied Date">
                  <input type="date" name="date_applied" className={inputClass} defaultValue={application.date_applied ?? ""} />
                </Field>
                <Field label="Priority">
                  <select name="priority" className={inputClass} defaultValue={application.priority}>
                    {priorities.map((priority) => <option key={priority}>{priority}</option>)}
                  </select>
                </Field>
                <Field label="Application Link">
                  <input name="application_url" className={inputClass} defaultValue={application.application_url ?? ""} />
                </Field>
                <Field label="Contact Name">
                  <input name="contact_name" className={inputClass} defaultValue={application.contact_name ?? ""} />
                </Field>
                <Field label="Contact Email">
                  <input type="email" name="contact_email" className={inputClass} defaultValue={application.contact_email ?? ""} />
                </Field>
              </div>

              <Field label="Notes">
                <textarea name="notes" rows={4} className={`${inputClass} resize-none`} defaultValue={application.notes ?? ""} />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
                <UpdateButton />
              </div>
            </form>

            <form
              action={async (formData) => {
                await deleteApplicationAction(formData);
                setOpen(false);
              }}
              className="mt-4"
            >
              <input type="hidden" name="id" value={application.id} />
              <DeleteButton />
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function UpdateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Updating..." : "Update application"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 text-sm font-medium text-red-300 transition hover:text-red-200 disabled:cursor-wait disabled:opacity-70"
    >
      <Trash2 size={14} /> {pending ? "Deleting..." : "Delete application"}
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
  "rounded-2xl border border-white/[0.08] bg-[#0b1014] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 [color-scheme:dark] focus:border-teal-300/60 [&>option]:bg-[#0b1014] [&>option]:text-white";
