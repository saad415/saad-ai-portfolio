import { NextResponse } from "next/server";
import { retrievePortfolioSources } from "@/lib/portfolio-knowledge";

export const runtime = "nodejs";

type OpenAIChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: {
    message?: string;
  };
};

function sourceContext(
  sources: ReturnType<typeof retrievePortfolioSources>
) {
  return sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\nURL: ${source.url}\nContent: ${
          source.content
        }`
    )
    .join("\n\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: unknown };
    const question =
      typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json(
        { error: "Ask a question first." },
        { status: 400 }
      );
    }

    if (question.length > 1000) {
      return NextResponse.json(
        { error: "Please keep the question under 1000 characters." },
        { status: 400 }
      );
    }

    const sources = retrievePortfolioSources(question, 5);
    const publicSources = sources.map(({ id, title, url, content }) => ({
      id,
      title,
      url,
      excerpt: content,
    }));

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          answer:
            "Portfolio AI is not configured yet. Add OPENAI_API_KEY to .env.local locally and to the Vercel project environment variables in production.",
          sources: publicSources,
        },
        { status: 503 }
      );
    }

    const model = process.env.OPENAI_ASK_MODEL ?? "gpt-4o-mini";
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are Saad Ahmad's portfolio assistant. Answer only from the provided portfolio sources. Be concise, specific, and helpful. If the answer is not in the sources, say you do not know from the portfolio. Mention relevant source titles naturally when useful.",
            },
            {
              role: "user",
              content: `Portfolio sources:\n\n${sourceContext(
                sources
              )}\n\nQuestion: ${question}`,
            },
          ],
        }),
      }
    );

    const payload = (await openAIResponse.json()) as OpenAIChatResponse;

    if (!openAIResponse.ok) {
      return NextResponse.json(
        {
          error:
            payload.error?.message ??
            "The portfolio assistant could not generate an answer.",
          sources: publicSources,
        },
        { status: openAIResponse.status }
      );
    }

    const answer =
      payload.choices?.[0]?.message?.content?.trim() ??
      "I could not generate an answer from the portfolio sources.";

    return NextResponse.json(
      { answer, sources: publicSources },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while answering the question." },
      { status: 500 }
    );
  }
}
