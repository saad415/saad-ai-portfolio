import { getServerSession } from "next-auth";
import { ExternalLink, Lock, Plus, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { SignInButton, SignOutButton } from "@/components/TrackerAuthButtons";
import {
  createApplicationAction,
  deleteApplicationAction,
  updateApplicationAction,
} from "./actions";
import {
  ApplicationRow,
  isTrackerDatabaseConfigured,
  listApplications,
} from "@/lib/tracker-db";
import {
  authOptions,
  isTrackerAllowlistConfigured,
  isTrackerEmailAllowed,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Application Tracker",
  robots: {
    index: false,
    follow: false,
  },
};

const statuses = [
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

export default async function TrackerPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const isAllowed = isTrackerEmailAllowed(email);
  const isConfigured =
    isTrackerDatabaseConfigured &&
    isTrackerAllowlistConfigured &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.NEXTAUTH_SECRET;

  const applications = isAllowed && isTrackerDatabaseConfigured
    ? await listApplications()
    : [];

  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      <section className="relative w-full px-[5vw] pb-20 pt-32">
        <div className="pointer-events-none absolute right-0 top-24 h-80 w-80 translate-x-1/3 rounded-full bg-teal-300/6 blur-[90px]" />

        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-teal-300">
              Private dashboard
            </p>
            <h1
              className="font-semibold tracking-tight"
              style={{ fontSize: "clamp(1.8rem, 4vw, 4.5rem)" }}
            >
              Application Tracker
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
              Track university and job applications, deadlines, statuses, links, and follow-ups in one private place.
            </p>
          </div>

          {session && <SignOutButton />}
        </div>

        {!isConfigured && (
          <SetupNotice />
        )}

        {!session && isConfigured && (
          <LockedPanel />
        )}

        {session && !isAllowed && (
          <AccessDenied email={email} />
        )}

        {isAllowed && isConfigured && (
          <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
            <AddApplicationForm />
            <ApplicationsTable applications={applications} />
          </div>
        )}
      </section>
    </main>
  );
}

function SetupNotice() {
  return (
    <div className="mb-8 rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-6 text-sm leading-7 text-yellow-100">
      <p className="font-semibold text-yellow-50">Setup required before this works in production.</p>
      <p className="mt-2 text-yellow-100/80">
        Add these Vercel environment variables: <code>DATABASE_URL</code>, <code>GOOGLE_CLIENT_ID</code>,{" "}
        <code>GOOGLE_CLIENT_SECRET</code>, <code>NEXTAUTH_SECRET</code>, and <code>TRACKER_ALLOWED_EMAILS</code>.
      </p>
    </div>
  );
}

function LockedPanel() {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
        <Lock size={20} className="text-teal-300" />
      </span>
      <h2 className="mt-6 text-2xl font-semibold">Google sign-in required</h2>
      <p className="mt-3 max-w-xl leading-7 text-zinc-400">
        This tracker is private. Sign in with your approved Google account to view and manage applications.
      </p>
      <div className="mt-6">
        <SignInButton />
      </div>
    </div>
  );
}

function AccessDenied({ email }: { email?: string | null }) {
  return (
    <div className="rounded-3xl border border-red-300/20 bg-red-300/10 p-8">
      <h2 className="text-2xl font-semibold text-red-100">Access denied</h2>
      <p className="mt-3 leading-7 text-red-100/80">
        {email ?? "This account"} is not included in <code>TRACKER_ALLOWED_EMAILS</code>.
      </p>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}

function AddApplicationForm() {
  return (
    <form
      action={createApplicationAction}
      className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-7"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
          <Plus size={18} className="text-teal-300" />
        </span>
        <h2 className="text-xl font-semibold">Add application</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <select name="type" className={inputClass} defaultValue="university">
            {types.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" className={inputClass} defaultValue="Interested">
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Organization">
          <input name="organization" required className={inputClass} placeholder="University or company" />
        </Field>
        <Field label="Position / Program">
          <input name="title" required className={inputClass} placeholder="Program or job title" />
        </Field>
        <Field label="Country">
          <input name="country" className={inputClass} placeholder="Germany" />
        </Field>
        <Field label="City">
          <input name="city" className={inputClass} placeholder="Erlangen" />
        </Field>
        <Field label="Deadline">
          <input type="date" name="deadline" className={inputClass} />
        </Field>
        <Field label="Date Applied">
          <input type="date" name="date_applied" className={inputClass} />
        </Field>
        <Field label="Priority">
          <select name="priority" className={inputClass} defaultValue="Medium">
            {priorities.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </Field>
        <Field label="Application Link">
          <input name="application_url" className={inputClass} placeholder="https://..." />
        </Field>
        <Field label="Contact Name">
          <input name="contact_name" className={inputClass} placeholder="Recruiter or professor" />
        </Field>
        <Field label="Contact Email">
          <input type="email" name="contact_email" className={inputClass} placeholder="contact@example.com" />
        </Field>
      </div>

      <Field label="Notes" className="mt-4">
        <textarea name="notes" rows={4} className={`${inputClass} resize-none`} placeholder="Requirements, follow-up notes, documents sent..." />
      </Field>

      <button
        type="submit"
        className="mt-6 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
      >
        Save application
      </button>
    </form>
  );
}

function ApplicationsTable({ applications }: { applications: ApplicationRow[] }) {
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
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Deadline</th>
              <th className="px-5 py-4">Applied</th>
              <th className="px-5 py-4">Priority</th>
              <th className="px-5 py-4">Link</th>
              <th className="px-5 py-4">Edit</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <ApplicationTableRow key={application.id} application={application} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApplicationTableRow({ application }: { application: ApplicationRow }) {
  return (
    <tr className="border-b border-white/[0.06] align-top last:border-0">
      <td className="px-5 py-4 font-medium text-white">
        {application.organization}
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
        <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-medium text-teal-200">
          {application.status}
        </span>
      </td>
      <td className="px-5 py-4 text-zinc-400">{application.deadline ?? "-"}</td>
      <td className="px-5 py-4 text-zinc-400">{application.date_applied ?? "-"}</td>
      <td className="px-5 py-4 text-zinc-400">{application.priority}</td>
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
        <details>
          <summary className="cursor-pointer text-teal-300">Edit</summary>
          <div className="mt-4 w-[32rem] max-w-[80vw] rounded-2xl border border-white/[0.08] bg-[#070a0d] p-5">
            <form action={updateApplicationAction} className="grid gap-3">
              <input type="hidden" name="id" value={application.id} />
              <div className="grid gap-3 sm:grid-cols-2">
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
                <Field label="Applied">
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
                <textarea name="notes" rows={3} className={`${inputClass} resize-none`} defaultValue={application.notes ?? ""} />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="rounded-full bg-teal-300 px-4 py-2 text-sm font-semibold text-[#04100f]">
                  Update
                </button>
              </div>
            </form>
            <form action={deleteApplicationAction} className="mt-3">
              <input type="hidden" name="id" value={application.id} />
              <button type="submit" className="inline-flex items-center gap-2 text-sm font-medium text-red-300 transition hover:text-red-200">
                <Trash2 size={14} /> Delete
              </button>
            </form>
          </div>
        </details>
      </td>
    </tr>
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
  "rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-teal-300/60";
