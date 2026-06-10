import Navbar from "@/components/Navbar";
import DailyTaskTracker from "@/components/DailyTaskTracker";

export const metadata = {
  title: "Daily Task Tracker",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TasksPage() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      <section className="relative w-full px-[5vw] pb-20 pt-32">
        <div className="pointer-events-none absolute right-0 top-24 h-80 w-80 translate-x-1/3 rounded-full bg-teal-300/6 blur-[90px]" />

        <div className="mb-10">
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

        <DailyTaskTracker />
      </section>
    </main>
  );
}
