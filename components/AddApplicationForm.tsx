"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, WandSparkles } from "lucide-react";
import {
  ApplicationAutofillData,
  autofillApplicationFromUrlAction,
  createApplicationAction,
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
const types = ["university", "job"];

type ApplicationFormState = {
  type: string;
  status: string;
  organization: string;
  title: string;
  country: string;
  city: string;
  deadline: string;
  date_applied: string;
  priority: string;
  application_url: string;
  contact_name: string;
  contact_email: string;
  notes: string;
  submit_today: boolean;
};

type TextApplicationField = Exclude<keyof ApplicationFormState, "submit_today">;

const initialFormState: ApplicationFormState = {
  type: "university",
  status: "Not Applied",
  organization: "",
  title: "",
  country: "",
  city: "",
  deadline: "",
  date_applied: "",
  priority: "Medium",
  application_url: "",
  contact_name: "",
  contact_email: "",
  notes: "",
  submit_today: false,
};

export default function AddApplicationForm() {
  const [form, setForm] = useState(initialFormState);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(name: TextApplicationField, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateUrgent(value: boolean) {
    setForm((current) => ({ ...current, submit_today: value }));
  }

  function applyAutofill(data: ApplicationAutofillData) {
    setForm((current) => ({
      ...current,
      type: data.type ?? current.type,
      organization: data.organization ?? current.organization,
      title: data.title ?? current.title,
      country: data.country ?? current.country,
      city: data.city ?? current.city,
      deadline: data.deadline ?? current.deadline,
      priority: data.priority ?? current.priority,
      notes: data.notes ?? current.notes,
    }));
  }

  function autofillFromLink() {
    setMessage(null);

    startTransition(async () => {
      try {
        const data = await autofillApplicationFromUrlAction(form.application_url);
        applyAutofill(data);
        setMessage("Fields filled from the link. Review before saving.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not fetch details from this link.");
      }
    });
  }

  return (
    <form
      action={async (formData) => {
        await createApplicationAction(formData);
        setForm(initialFormState);
        setMessage("Application saved.");
      }}
      className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-7"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
          <Plus size={18} className="text-teal-300" />
        </span>
        <h2 className="text-xl font-semibold">Add application</h2>
      </div>

      <Field label="Application Link">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            name="application_url"
            className={inputClass}
            placeholder="https://..."
            value={form.application_url}
            onChange={(event) => updateField("application_url", event.target.value)}
          />
          <button
            type="button"
            onClick={autofillFromLink}
            disabled={isPending || !form.application_url.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-300/30 px-5 py-3 text-sm font-semibold text-teal-200 transition hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <WandSparkles size={16} />}
            {isPending ? "Fetching..." : "Fill from link"}
          </button>
        </div>
      </Field>

      {message && (
        <p className="mt-3 text-sm text-zinc-400">{message}</p>
      )}

      <input type="hidden" name="submit_today" value={form.submit_today ? "true" : "false"} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <select name="type" className={inputClass} value={form.type} onChange={(event) => updateField("type", event.target.value)}>
            {types.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" className={inputClass} value={form.status} onChange={(event) => updateField("status", event.target.value)}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Organization">
          <input name="organization" required className={inputClass} placeholder="University or company" value={form.organization} onChange={(event) => updateField("organization", event.target.value)} />
        </Field>
        <Field label="Position / Program">
          <input name="title" required className={inputClass} placeholder="Program or job title" value={form.title} onChange={(event) => updateField("title", event.target.value)} />
        </Field>
        <Field label="Country">
          <input name="country" className={inputClass} placeholder="Germany" value={form.country} onChange={(event) => updateField("country", event.target.value)} />
        </Field>
        <Field label="City">
          <input name="city" className={inputClass} placeholder="Erlangen" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
        </Field>
        <Field label="Deadline">
          <input type="date" name="deadline" className={inputClass} value={form.deadline} onChange={(event) => updateField("deadline", event.target.value)} />
        </Field>
        <Field label="Date Applied">
          <input type="date" name="date_applied" className={inputClass} value={form.date_applied} onChange={(event) => updateField("date_applied", event.target.value)} />
        </Field>
        <Field label="Priority">
          <select name="priority" className={inputClass} value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
            {priorities.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </Field>
        <Field label="Urgent">
          <button
            type="button"
            onClick={() => updateUrgent(!form.submit_today)}
            className={`inline-flex h-[46px] w-fit items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
              form.submit_today
                ? "border-red-300/50 bg-red-400/15 text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.14)]"
                : "border-white/[0.1] bg-white/[0.02] text-zinc-300 hover:border-red-300/50 hover:bg-red-400/10 hover:text-red-100"
            }`}
            aria-pressed={form.submit_today}
          >
            <AlertCircle size={16} />
            Urgent
          </button>
        </Field>
        <Field label="Contact Name">
          <input name="contact_name" className={inputClass} placeholder="Recruiter or professor" value={form.contact_name} onChange={(event) => updateField("contact_name", event.target.value)} />
        </Field>
        <Field label="Contact Email">
          <input type="email" name="contact_email" className={inputClass} placeholder="contact@example.com" value={form.contact_email} onChange={(event) => updateField("contact_email", event.target.value)} />
        </Field>
      </div>

      <Field label="Notes" className="mt-4">
        <textarea name="notes" rows={4} className={`${inputClass} resize-none`} placeholder="Requirements, follow-up notes, documents sent..." value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
      </Field>

      <SaveButton />
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Saving..." : "Save application"}
    </button>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 text-sm font-medium text-zinc-300 ${className}`}>
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/[0.08] bg-[#0b1014] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 [color-scheme:dark] focus:border-teal-300/60 [&>option]:bg-[#0b1014] [&>option]:text-white";
