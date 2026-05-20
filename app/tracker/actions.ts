"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, isTrackerEmailAllowed } from "@/lib/auth";
import {
  createApplication,
  deleteApplication,
  updateApplication,
} from "@/lib/tracker-db";

async function requireTrackerAccess() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("You must be signed in to manage applications.");
  }

  if (!isTrackerEmailAllowed(session.user.email)) {
    throw new Error("Your account is not allowed to manage applications.");
  }

  return session;
}

export async function createApplicationAction(formData: FormData) {
  await requireTrackerAccess();
  await createApplication(formData);
  revalidatePath("/tracker");
}

export async function updateApplicationAction(formData: FormData) {
  await requireTrackerAccess();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  await updateApplication(id, formData);
  revalidatePath("/tracker");
}

export async function deleteApplicationAction(formData: FormData) {
  await requireTrackerAccess();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  await deleteApplication(id);
  revalidatePath("/tracker");
}
