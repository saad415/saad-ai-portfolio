import { NextResponse } from "next/server";
import { listCampusTenants } from "@/lib/campusrag-store";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(
    { tenants: listCampusTenants() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
