import { NextResponse } from "next/server";
import { resetCampusState, resetCampusTenant } from "@/lib/campusrag-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (tenantId) {
    const result = resetCampusTenant(tenantId);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(
    { tenants: resetCampusState() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
