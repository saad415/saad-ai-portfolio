import { neon } from "@neondatabase/serverless";

export type ApplicationStatus =
  | "Interested"
  | "Preparing"
  | "Applied"
  | "Assessment"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Archived";

export type ApplicationRow = {
  id: number;
  type: string;
  organization: string;
  title: string;
  country: string | null;
  city: string | null;
  application_url: string | null;
  deadline: string | null;
  date_applied: string | null;
  status: ApplicationStatus;
  priority: string;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const connectionString = process.env.DATABASE_URL;

export const isTrackerDatabaseConfigured = Boolean(connectionString);

const sql = connectionString ? neon(connectionString) : null;

export async function ensureApplicationsTable() {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await sql`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'university',
      organization TEXT NOT NULL,
      title TEXT NOT NULL,
      country TEXT,
      city TEXT,
      application_url TEXT,
      deadline DATE,
      date_applied DATE,
      status TEXT NOT NULL DEFAULT 'Interested',
      priority TEXT NOT NULL DEFAULT 'Medium',
      contact_name TEXT,
      contact_email TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

export async function listApplications(): Promise<ApplicationRow[]> {
  if (!sql) {
    return [];
  }

  await ensureApplicationsTable();

  const rows = await sql`
    SELECT
      id,
      type,
      organization,
      title,
      country,
      city,
      application_url,
      deadline::text,
      date_applied::text,
      status,
      priority,
      contact_name,
      contact_email,
      notes,
      created_at::text,
      updated_at::text
    FROM applications
    ORDER BY
      CASE WHEN deadline IS NULL THEN 1 ELSE 0 END,
      deadline ASC,
      updated_at DESC;
  `;

  return rows as ApplicationRow[];
}

export async function createApplication(formData: FormData) {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureApplicationsTable();

  await sql`
    INSERT INTO applications (
      type,
      organization,
      title,
      country,
      city,
      application_url,
      deadline,
      date_applied,
      status,
      priority,
      contact_name,
      contact_email,
      notes
    ) VALUES (
      ${String(formData.get("type") || "university")},
      ${String(formData.get("organization") || "")},
      ${String(formData.get("title") || "")},
      ${nullableString(formData.get("country"))},
      ${nullableString(formData.get("city"))},
      ${nullableString(formData.get("application_url"))},
      ${nullableString(formData.get("deadline"))},
      ${nullableString(formData.get("date_applied"))},
      ${String(formData.get("status") || "Interested")},
      ${String(formData.get("priority") || "Medium")},
      ${nullableString(formData.get("contact_name"))},
      ${nullableString(formData.get("contact_email"))},
      ${nullableString(formData.get("notes"))}
    );
  `;
}

export async function updateApplication(id: number, formData: FormData) {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureApplicationsTable();

  await sql`
    UPDATE applications
    SET
      type = ${String(formData.get("type") || "university")},
      organization = ${String(formData.get("organization") || "")},
      title = ${String(formData.get("title") || "")},
      country = ${nullableString(formData.get("country"))},
      city = ${nullableString(formData.get("city"))},
      application_url = ${nullableString(formData.get("application_url"))},
      deadline = ${nullableString(formData.get("deadline"))},
      date_applied = ${nullableString(formData.get("date_applied"))},
      status = ${String(formData.get("status") || "Interested")},
      priority = ${String(formData.get("priority") || "Medium")},
      contact_name = ${nullableString(formData.get("contact_name"))},
      contact_email = ${nullableString(formData.get("contact_email"))},
      notes = ${nullableString(formData.get("notes"))},
      updated_at = NOW()
    WHERE id = ${id};
  `;
}

export async function deleteApplication(id: number) {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureApplicationsTable();
  await sql`DELETE FROM applications WHERE id = ${id};`;
}

function nullableString(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text.length ? text : null;
}
