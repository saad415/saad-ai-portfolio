"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, isTrackerEmailAllowed } from "@/lib/auth";
import {
  createDailyTask,
  deleteDailyTask,
  updateDailyTaskProgress,
} from "@/lib/tracker-db";
import type { DailyTaskPriority, DailyTaskStatus } from "@/lib/tracker-db";

const taskStatuses: DailyTaskStatus[] = ["Todo", "In Progress", "Done"];
const taskPriorities: DailyTaskPriority[] = ["High", "Medium", "Low"];

async function requireTaskAccess() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("You must be signed in to manage tasks.");
  }

  if (!isTrackerEmailAllowed(session.user.email)) {
    throw new Error("Your account is not allowed to manage tasks.");
  }

  return session;
}

export async function createDailyTaskAction(formData: FormData) {
  await requireTaskAccess();

  const title = String(formData.get("title") || "").trim();
  const taskDate = String(formData.get("task_date") || "").trim();
  const durationMinutes = Number(formData.get("duration_minutes") || 25);
  const priority = String(formData.get("priority") || "High") as DailyTaskPriority;

  if (!title) {
    throw new Error("Task title is required.");
  }

  if (!taskDate) {
    throw new Error("Task date is required.");
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
    throw new Error("Duration must be at least 1 minute.");
  }

  if (!taskPriorities.includes(priority)) {
    throw new Error("Invalid task priority.");
  }

  formData.set("title", title);
  formData.set("duration_minutes", String(Math.floor(durationMinutes)));
  const task = await createDailyTask(formData);
  revalidatePath("/tasks");

  return task;
}

export async function updateDailyTaskProgressAction(formData: FormData) {
  await requireTaskAccess();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as DailyTaskStatus;
  const elapsedSeconds = Number(formData.get("elapsed_seconds") || 0);

  if (!Number.isInteger(id)) {
    throw new Error("Invalid task id.");
  }

  if (!taskStatuses.includes(status)) {
    throw new Error("Invalid task status.");
  }

  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error("Invalid elapsed time.");
  }

  await updateDailyTaskProgress(id, status, elapsedSeconds);
}

export async function deleteDailyTaskAction(formData: FormData) {
  await requireTaskAccess();

  const id = Number(formData.get("id"));

  if (!Number.isInteger(id)) {
    throw new Error("Invalid task id.");
  }

  await deleteDailyTask(id);
  revalidatePath("/tasks");
}
