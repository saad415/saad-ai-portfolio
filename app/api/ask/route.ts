import { NextResponse } from "next/server";
import {
  retrievePortfolioRagSources,
  type PortfolioRagSource,
} from "@/lib/portfolio-rag";

export const runtime = "nodejs";

type GroqChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: {
    message?: string;
  };
};

type ChatTurn = {
  question: string;
  answer: string;
};

type AskRequestBody = {
  question?: unknown;
  history?: unknown;
};

function sourceContext(sources: PortfolioRagSource[]) {
  return sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\nURL: ${source.url}\nContent: ${
          source.content
        }`
    )
    .join("\n\n");
}

function normalizeQuestion(question: string) {
  return question
    .replace(/\bgoogf\b/gi, "good")
    .replace(/\bintergrate\b/gi, "integrate")
    .replace(/\bhealpfull\b/gi, "helpful")
    .replace(/\bimpliment\b/gi, "implement")
    .replace(/\bimplmenet\b/gi, "implement")
    .replace(/\bannote\b/gi, "annotate")
    .replace(/\bsnnotation\b/gi, "annotation")
    .replace(/\bportdolio\b/gi, "portfolio")
    .trim();
}

function parseHistory(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((turn) => {
      if (
        typeof turn === "object" &&
        turn !== null &&
        "question" in turn &&
        "answer" in turn &&
        typeof turn.question === "string" &&
        typeof turn.answer === "string"
      ) {
        return {
          question: turn.question.slice(0, 500),
          answer: turn.answer.slice(0, 900),
        };
      }

      return null;
    })
    .filter((turn): turn is ChatTurn => Boolean(turn))
    .slice(-4);
}

function historyContext(history: ChatTurn[]) {
  if (!history.length) {
    return "No prior conversation in this session.";
  }

  return history
    .map(
      (turn, index) =>
        `Turn ${index + 1}\nUser: ${turn.question}\nAssistant: ${turn.answer}`
    )
    .join("\n\n");
}

function isAmbiguousFollowUp(question: string) {
  return /\b(this|that|it|he said|based on|good|better|why|how about)\b/i.test(
    question
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AskRequestBody;
    const question =
      typeof body.question === "string" ? body.question.trim() : "";
    const history = parseHistory(body.history);

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

    const normalizedQuestion = normalizeQuestion(question);
    const retrievalQuestion =
      history.length && isAmbiguousFollowUp(normalizedQuestion)
        ? `${historyContext(history)}\n\nFollow-up question: ${normalizedQuestion}`
        : normalizedQuestion;
    const sources = await retrievePortfolioRagSources(retrievalQuestion, 5);
    const publicSources = sources.map(({ id, title, url, content }) => ({
      id,
      title,
      url,
      excerpt: content,
    }));

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          answer:
            "Portfolio AI is not configured yet. Add GROQ_API_KEY to .env.local locally and to the Vercel project environment variables in production.",
          sources: publicSources,
        },
        { status: 503 }
      );
    }

    const model = process.env.GROQ_ASK_MODEL ?? "llama-3.1-8b-instant";
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are Saad Ahmad's portfolio assistant. Answer only from the provided portfolio sources and the prior conversation context. Be concise, specific, and helpful. Interpret obvious typos, shorthand, and informal wording. Resolve follow-up phrases like 'this', 'that', 'based on what he said', or 'is it good' from the recent conversation. If at least part of the question matches the sources, answer that part using the sources. Only say you do not know from the portfolio when none of the sources or prior conversation are relevant. Include source-title citations in brackets for key claims, for example [Thesis I: Lumbosacral Vertebra Localization].",
            },
            {
              role: "user",
              content: `Prior conversation:\n\n${historyContext(
                history
              )}\n\nPortfolio sources:\n\n${sourceContext(
                sources
              )}\n\nOriginal question: ${question}\nNormalized question: ${normalizedQuestion}`,
            },
          ],
        }),
      }
    );

    const payload = (await groqResponse.json()) as GroqChatResponse;

    if (!groqResponse.ok) {
      return NextResponse.json(
        {
          error:
            payload.error?.message ??
            "The portfolio assistant could not generate an answer.",
          sources: publicSources,
        },
        { status: groqResponse.status }
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
