import { NextResponse } from "next/server";
import { uploadCampusDocument } from "@/lib/campusrag-store";

export const runtime = "nodejs";

type UploadRequest = {
  tenantId?: unknown;
  title?: unknown;
  content?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json()) as UploadRequest;
  const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";
  const title = typeof body.title === "string" ? body.title : "";
  const content = typeof body.content === "string" ? body.content : "";
  const result = uploadCampusDocument(tenantId, title, content);

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
