import { NextResponse } from "next/server";
import { chatWithCampusTenant } from "@/lib/campusrag-store";

export const runtime = "nodejs";

type ChatRequest = {
  tenantId?: unknown;
  question?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";
  const question = typeof body.question === "string" ? body.question : "";
  const result = chatWithCampusTenant(tenantId, question);

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
