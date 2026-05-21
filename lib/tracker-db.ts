import { neon } from "@neondatabase/serverless";

export type ApplicationStatus =
  | "Not Applied"
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

export type OpportunityStatus = "new" | "approved" | "rejected" | "archived";

export type OpportunityRow = {
  id: number;
  source: string;
  type: string;
  organization: string;
  title: string;
  country: string | null;
  city: string | null;
  url: string;
  deadline: string | null;
  summary: string | null;
  match_score: number;
  matched_keywords: string[];
  status: OpportunityStatus;
  discovered_at: string;
  updated_at: string;
};

export type DiscoveredOpportunity = {
  source: string;
  type: string;
  organization: string;
  title: string;
  country?: string | null;
  city?: string | null;
  url: string;
  deadline?: string | null;
  summary?: string | null;
  match_score: number;
  matched_keywords: string[];
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
      status TEXT NOT NULL DEFAULT 'Not Applied',
      priority TEXT NOT NULL DEFAULT 'Medium',
      contact_name TEXT,
      contact_email TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

export async function ensureOpportunitiesTable() {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await sql`
    CREATE TABLE IF NOT EXISTS opportunities (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'job',
      organization TEXT NOT NULL,
      title TEXT NOT NULL,
      country TEXT,
      city TEXT,
      url TEXT NOT NULL UNIQUE,
      deadline DATE,
      summary TEXT,
      match_score INTEGER NOT NULL DEFAULT 0,
      matched_keywords TEXT[] NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'new',
      discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

export async function listOpportunities(): Promise<OpportunityRow[]> {
  if (!sql) {
    return [];
  }

  await ensureApplicationsTable();
  await ensureOpportunitiesTable();

  const rows = await sql`
    SELECT
      id,
      source,
      type,
      organization,
      title,
      country,
      city,
      url,
      deadline::text,
      summary,
      match_score,
      matched_keywords,
      status,
      discovered_at::text,
      updated_at::text
    FROM opportunities
    WHERE status = 'new'
      AND NOT EXISTS (
        SELECT 1
        FROM opportunities hidden
        WHERE hidden.status IN ('approved', 'rejected')
          AND (
            hidden.url = opportunities.url
            OR (
              LOWER(TRIM(hidden.source)) = LOWER(TRIM(opportunities.source))
              AND LOWER(TRIM(hidden.organization)) = LOWER(TRIM(opportunities.organization))
              AND LOWER(TRIM(hidden.title)) = LOWER(TRIM(opportunities.title))
            )
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM applications
        WHERE applications.application_url = opportunities.url
          OR (
            LOWER(TRIM(applications.organization)) = LOWER(TRIM(opportunities.organization))
            AND LOWER(TRIM(applications.title)) = LOWER(TRIM(opportunities.title))
          )
      )
    ORDER BY match_score DESC, discovered_at DESC;
  `;

  return rows as OpportunityRow[];
}

export async function saveDiscoveredOpportunities(opportunities: DiscoveredOpportunity[]) {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureApplicationsTable();
  await ensureOpportunitiesTable();

  let inserted = 0;

  for (const opportunity of opportunities) {
    const trackedRows = await sql`
      SELECT 1
      FROM applications
      WHERE application_url = ${opportunity.url}
        OR (
          LOWER(TRIM(organization)) = LOWER(TRIM(${opportunity.organization}))
          AND LOWER(TRIM(title)) = LOWER(TRIM(${opportunity.title}))
        )
      LIMIT 1;
    `;

    if (trackedRows.length) {
      continue;
    }

    const blockedRows = await sql`
      SELECT 1
      FROM opportunities
      WHERE status IN ('approved', 'rejected')
        AND (
          url = ${opportunity.url}
          OR (
            LOWER(TRIM(source)) = LOWER(TRIM(${opportunity.source}))
            AND LOWER(TRIM(organization)) = LOWER(TRIM(${opportunity.organization}))
            AND LOWER(TRIM(title)) = LOWER(TRIM(${opportunity.title}))
          )
        )
      LIMIT 1;
    `;

    if (blockedRows.length) {
      continue;
    }

    const rows = await sql`
      INSERT INTO opportunities (
        source,
        type,
        organization,
        title,
        country,
        city,
        url,
        deadline,
        summary,
        match_score,
        matched_keywords
      ) VALUES (
        ${opportunity.source},
        ${opportunity.type},
        ${opportunity.organization},
        ${opportunity.title},
        ${opportunity.country ?? null},
        ${opportunity.city ?? null},
        ${opportunity.url},
        ${opportunity.deadline ?? null},
        ${opportunity.summary ?? null},
        ${opportunity.match_score},
        ${opportunity.matched_keywords}
      )
      ON CONFLICT (url) DO NOTHING
      RETURNING id;
    `;

    if (rows.length) {
      inserted += 1;
    }
  }

  return inserted;
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
      ${String(formData.get("status") || "Not Applied")},
      ${String(formData.get("priority") || "Medium")},
      ${nullableString(formData.get("contact_name"))},
      ${nullableString(formData.get("contact_email"))},
      ${nullableString(formData.get("notes"))}
    );
  `;
}

export async function approveOpportunity(id: number) {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureApplicationsTable();
  await ensureOpportunitiesTable();

  await sql`
    INSERT INTO applications (
      type,
      organization,
      title,
      country,
      city,
      application_url,
      deadline,
      status,
      priority,
      notes
    )
    SELECT
      CASE WHEN type = 'phd' THEN 'university' ELSE type END,
      organization,
      title,
      country,
      city,
      url,
      deadline,
      'Not Applied',
      CASE WHEN match_score >= 80 THEN 'High' WHEN match_score >= 50 THEN 'Medium' ELSE 'Low' END,
      CONCAT(
        'Imported from ', source,
        '. Match score: ', match_score,
        '. Keywords: ', array_to_string(matched_keywords, ', '),
        CASE WHEN summary IS NULL THEN '' ELSE CONCAT(E'\n\n', summary) END
      )
    FROM opportunities
    WHERE id = ${id};
  `;

  await updateOpportunityStatus(id, "approved");
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
      status = ${String(formData.get("status") || "Not Applied")},
      priority = ${String(formData.get("priority") || "Medium")},
      contact_name = ${nullableString(formData.get("contact_name"))},
      contact_email = ${nullableString(formData.get("contact_email"))},
      notes = ${nullableString(formData.get("notes"))},
      updated_at = NOW()
    WHERE id = ${id};
  `;
}

export async function updateApplicationDeadline(id: number, deadline: string | null) {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureApplicationsTable();

  await sql`
    UPDATE applications
    SET deadline = ${deadline}, updated_at = NOW()
    WHERE id = ${id};
  `;
}

export async function updateApplicationStatus(id: number, status: ApplicationStatus) {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureApplicationsTable();

  await sql`
    UPDATE applications
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id};
  `;
}

export async function updateApplicationPriority(id: number, priority: string) {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureApplicationsTable();

  await sql`
    UPDATE applications
    SET priority = ${priority}, updated_at = NOW()
    WHERE id = ${id};
  `;
}

export async function updateOpportunityStatus(id: number, status: OpportunityStatus) {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureOpportunitiesTable();

  await sql`
    UPDATE opportunities
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id};
  `;
}

export async function rejectAllNewOpportunities() {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureOpportunitiesTable();

  await sql`
    UPDATE opportunities
    SET status = 'rejected', updated_at = NOW()
    WHERE status = 'new';
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
