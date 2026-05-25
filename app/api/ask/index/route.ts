import { NextResponse } from "next/server";
import { refreshPortfolioRagIndex } from "@/lib/portfolio-rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminToken = process.env.RAG_ADMIN_TOKEN;
  const requestToken = request.headers.get("x-rag-admin-token");

  if (adminToken && requestToken !== adminToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await refreshPortfolioRagIndex();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not refresh portfolio RAG index.",
      },
      { status: 500 }
    );
  }
}
