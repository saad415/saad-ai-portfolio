"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  Circle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

type TaskStatus = "Todo" | "In Progress" | "Done";
type TaskPriority = "High" | "Medium" | "Low";
type StatusFilter = "All" | TaskStatus;

type DailyTask = {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  elapsedSeconds: number;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
};

const storageKey = "portfolio-daily-tasks-v1";
const statusOptions: StatusFilter[] = ["All", "Todo", "In Progress", "Done"];
const priorityOptions: TaskPriority[] = ["High", "Medium", "Low"];
const hourOptions = Array.from({ length: 25 }, (_, index) => index);
const minuteOptions = Array.from({ length: 60 }, (_, index) => index);

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function DailyTaskTracker() {
  const todayKey = getLocalDateKey(new Date());
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [priority, setPriority] = useState<TaskPriority>("High");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      const storedTasks = window.localStorage.getItem(storageKey);

      if (storedTasks) {
        try {
          setTasks(JSON.parse(storedTasks) as DailyTask[]);
        } catch {
          setTasks([]);
        }
      }

      setHasLoaded(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      window.localStorage.setItem(storageKey, JSON.stringify(tasks));
    }
  }, [hasLoaded, tasks]);

  useEffect(() => {
    if (!activeTaskId) return;

    const intervalId = window.setInterval(() => {
      let shouldStopTimer = false;

      setTasks((currentTasks) => currentTasks.map((task) => {
        if (task.id !== activeTaskId || task.status === "Done") {
          return task;
        }

        const plannedSeconds = task.durationMinutes * 60;
        const elapsedSeconds = Math.min(task.elapsedSeconds + 1, plannedSeconds);
        shouldStopTimer = elapsedSeconds >= plannedSeconds;

        return {
          ...task,
          elapsedSeconds,
          status: elapsedSeconds >= plannedSeconds ? "Done" : "In Progress",
        };
      }));

      if (shouldStopTimer) {
        setActiveTaskId(null);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeTaskId]);

  const visibleTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks
      .filter((task) => task.date === selectedDate)
      .filter((task) => statusFilter === "All" || task.status === statusFilter)
      .filter((task) => !query || task.title.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.status === "Done" && b.status !== "Done") return 1;
        if (a.status !== "Done" && b.status === "Done") return -1;

        const priorityScore = { High: 0, Medium: 1, Low: 2 };
        return priorityScore[a.priority] - priorityScore[b.priority];
      });
  }, [searchQuery, selectedDate, statusFilter, tasks]);

  const dayTasks = tasks.filter((task) => task.date === selectedDate);
  const completedTasks = dayTasks.filter((task) => task.status === "Done").length;
  const plannedMinutes = dayTasks.reduce((total, task) => total + task.durationMinutes, 0);
  const focusedSeconds = dayTasks.reduce((total, task) => total + task.elapsedSeconds, 0);
  const durationHours = Math.floor(durationMinutes / 60);
  const durationRemainderMinutes = durationMinutes % 60;

  function updateDuration(hours: number, minutes: number) {
    setDurationMinutes(Math.max(1, hours * 60 + minutes));
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setTasks((currentTasks) => [
      {
        id: createId(),
        title: cleanTitle,
        date: selectedDate,
        durationMinutes: Math.max(1, durationMinutes),
        elapsedSeconds: 0,
        status: "Todo",
        priority,
        createdAt: new Date().toISOString(),
      },
      ...currentTasks,
    ]);
    setTitle("");
  }

  function updateTask(taskId: string, update: Partial<DailyTask>) {
    setTasks((currentTasks) => currentTasks.map((task) => (
      task.id === taskId ? { ...task, ...update } : task
    )));
  }

  function deleteTask(taskId: string) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
  }

  function startTask(task: DailyTask) {
    if (task.status === "Done") return;

    setActiveTaskId(task.id);
    updateTask(task.id, { status: "In Progress" });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Tasks" value={`${completedTasks}/${dayTasks.length}`} />
        <Metric label="Planned" value={`${plannedMinutes} min`} />
        <Metric label="Focused" value={formatDuration(focusedSeconds)} />
        <Metric label="Remaining" value={`${Math.max(0, plannedMinutes * 60 - focusedSeconds) === 0 ? "0:00" : formatDuration(plannedMinutes * 60 - focusedSeconds)}`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <form onSubmit={handleAddTask} className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-300/10 text-teal-200">
              <Plus size={18} />
            </span>
            <h2 className="text-lg font-semibold">Add daily task</h2>
          </div>

          <label className="mt-6 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Task</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Prepare motivation letter"
              className="mt-2 h-12 w-full rounded-2xl border border-white/[0.1] bg-white/[0.025] px-4 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-teal-300/60"
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Duration</span>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <ScrollPicker
                  label="Hours"
                  value={durationHours}
                  options={hourOptions}
                  format={(value) => `${value} hr`}
                  onChange={(value) => updateDuration(value, durationRemainderMinutes)}
                />
                <ScrollPicker
                  label="Minutes"
                  value={durationRemainderMinutes}
                  options={minuteOptions}
                  format={(value) => `${value} min`}
                  onChange={(value) => updateDuration(durationHours, value)}
                />
              </div>
            </label>

            <label>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Priority</span>
              <div className="mt-2">
                <ScrollPicker
                  label="Priority"
                  value={priority}
                  options={priorityOptions}
                  format={(value) => value}
                  onChange={(value) => setPriority(value)}
                />
              </div>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-white/[0.1] bg-white/[0.025] px-4 text-sm font-semibold text-white outline-none transition [color-scheme:dark] focus:border-teal-300/60"
            />
          </label>

          <button
            type="submit"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-300 px-5 text-sm font-bold text-[#06100f] transition hover:bg-teal-200"
          >
            <Plus size={16} />
            Add task
          </button>
        </form>

        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b1014]/65">
          <div className="flex flex-col gap-4 border-b border-white/[0.08] p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Daily tasks</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {visibleTasks.length} shown of {dayTasks.length} tasks
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tasks"
                  className="h-11 w-full rounded-full border border-white/[0.1] bg-white/[0.025] pl-11 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-teal-300/60"
                />
              </label>

              <div className="inline-flex w-fit rounded-full border border-white/[0.1] bg-white/[0.025] p-1">
                {statusOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStatusFilter(option)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      statusFilter === option
                        ? "bg-teal-300 text-[#06100f]"
                        : "text-zinc-400 hover:text-zinc-100"
                    }`}
                    aria-pressed={statusFilter === option}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDate(todayKey)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.025] px-4 text-sm font-semibold text-zinc-300 transition hover:text-teal-200"
              >
                <CalendarDays size={15} />
                Today
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {visibleTasks.length ? (
              visibleTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isActive={activeTaskId === task.id}
                  onStart={() => startTask(task)}
                  onPause={() => setActiveTaskId(null)}
                  onDone={() => {
                    setActiveTaskId(null);
                    updateTask(task.id, {
                      elapsedSeconds: task.durationMinutes * 60,
                      status: "Done",
                    });
                  }}
                  onReset={() => {
                    setActiveTaskId(null);
                    updateTask(task.id, { elapsedSeconds: 0, status: "Todo" });
                  }}
                  onDelete={() => deleteTask(task.id)}
                />
              ))
            ) : (
              <div className="px-6 py-12 text-center text-sm text-zinc-500">
                No tasks found for this day.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b1014]/65 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ScrollPicker<T extends string | number>({
  label,
  value,
  options,
  format,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  format: (value: T) => string;
  onChange: (value: T) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="flex cursor-pointer list-none flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/[0.1] bg-white/[0.025] px-4 py-2.5 outline-none transition marker:hidden hover:border-white/20 focus:border-teal-300/60 group-open:border-teal-300/50 group-open:bg-teal-300/[0.04] [&::-webkit-details-marker]:hidden">
        <span className="text-xl font-bold leading-none text-white">{format(value)}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</span>
      </summary>
      <div className="absolute left-0 top-[calc(100%+6px)] z-20 max-h-52 w-full overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#070a0d] p-1 shadow-2xl shadow-black/60 [scrollbar-color:rgba(45,212,191,0.4)_transparent] [scrollbar-width:thin]">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              onChange(option);
              if (detailsRef.current) detailsRef.current.open = false;
            }}
            className={`block w-full rounded-xl px-3 py-2 text-center text-sm font-semibold transition hover:bg-teal-300/10 hover:text-teal-100 ${
              option === value ? "bg-teal-300/10 text-teal-300" : "text-zinc-400"
            }`}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </details>
  );
}

function TaskRow({
  task,
  isActive,
  onStart,
  onPause,
  onDone,
  onReset,
  onDelete,
}: {
  task: DailyTask;
  isActive: boolean;
  onStart: () => void;
  onPause: () => void;
  onDone: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const plannedSeconds = task.durationMinutes * 60;
  const remainingSeconds = Math.max(0, plannedSeconds - task.elapsedSeconds);
  const progress = plannedSeconds ? Math.min(100, (task.elapsedSeconds / plannedSeconds) * 100) : 0;

  return (
    <article className={`grid gap-4 px-6 py-5 lg:grid-cols-[1fr_auto] lg:items-center ${
      isActive ? "bg-teal-300/[0.05]" : ""
    }`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
            task.status === "Done"
              ? "border-teal-300/50 bg-teal-300/15 text-teal-100"
              : "border-white/[0.12] text-zinc-500"
          }`}>
            {task.status === "Done" ? <Check size={14} /> : <Circle size={12} />}
          </span>
          <h3 className={`max-w-full break-words text-base font-semibold ${
            task.status === "Done" ? "text-zinc-500 line-through" : "text-white"
          }`}>
            {task.title}
          </h3>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1 text-zinc-300">
            {task.priority}
          </span>
          <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-teal-100">
            {task.status}
          </span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1 text-zinc-300">
            {task.durationMinutes} min
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-teal-300 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <div className="min-w-24 text-right">
          <p className="font-mono text-xl font-semibold text-white">{formatDuration(remainingSeconds)}</p>
          <p className="text-xs text-zinc-500">{formatDuration(task.elapsedSeconds)} focused</p>
        </div>

        {isActive ? (
          <IconButton label="Pause task" onClick={onPause}>
            <Pause size={16} />
          </IconButton>
        ) : (
          <IconButton label="Start task" onClick={onStart} disabled={task.status === "Done"}>
            <Play size={16} />
          </IconButton>
        )}
        <IconButton label="Complete task" onClick={onDone} disabled={task.status === "Done"}>
          <Check size={16} />
        </IconButton>
        <IconButton label="Reset task" onClick={onReset}>
          <RotateCcw size={16} />
        </IconButton>
        <IconButton label="Delete task" onClick={onDelete} danger>
          <Trash2 size={16} />
        </IconButton>
      </div>
    </article>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35 ${
        danger
          ? "border-red-300/20 text-red-100 hover:bg-red-400/10"
          : "border-white/[0.12] text-zinc-300 hover:border-teal-300/60 hover:text-teal-200"
      }`}
    >
      {children}
    </button>
  );
}
