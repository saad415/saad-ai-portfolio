import { getServerSession } from "next-auth";
import { Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import DailyTaskTracker from "@/components/DailyTaskTracker";
import { SignInButton, SignOutButton } from "@/components/TrackerAuthButtons";
import {
  authOptions,
  isTrackerAllowlistConfigured,
  isTrackerEmailAllowed,
} from "@/lib/auth";
import { isTrackerDatabaseConfigured, listDailyTasks } from "@/lib/tracker-db";

export const metadata = {
  title: "Daily Task Tracker",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const isAllowed = isTrackerEmailAllowed(email);
  const isConfigured =
    isTrackerDatabaseConfigured &&
    isTrackerAllowlistConfigured &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.NEXTAUTH_SECRET;
  const tasks = isAllowed && isConfigured ? await listDailyTasks() : [];
  const taskStateKey = tasks.map((task) => `${task.id}:${task.updated_at}`).join("|");

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
              Daily Task Tracker
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
              Plan focused work for the day, assign each task a duration, and run a timer until it is done.
            </p>
          </div>

          {session && <SignOutButton />}
        </div>

        {!isConfigured && <SetupNotice />}
        {!session && isConfigured && <LockedPanel />}
        {session && !isAllowed && <AccessDenied email={email} />}
        {isAllowed && isConfigured && (
          <DailyTaskTracker key={taskStateKey} initialTasks={tasks} />
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
        Add these Vercel environment variables: <code>DATABASE_URL</code>,{" "}
        <code>GOOGLE_CLIENT_ID</code>,{" "}
        <code>GOOGLE_CLIENT_SECRET</code>, <code>NEXTAUTH_SECRET</code>, and{" "}
        <code>TRACKER_ALLOWED_EMAILS</code>.
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
        This task tracker is private. Sign in with your approved Google account to view and manage tasks.
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
