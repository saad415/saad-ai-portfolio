import { createLocalEmbedding } from "@/lib/rag-embeddings";

const EMBEDDING_DIMENSIONS = 384;

type JinaEmbeddingResponse = {
  data?: {
    embedding?: number[];
  }[];
};

export type EmbeddingProvider = "jina" | "local";

function normalizeVector(vector: number[]) {
  const sizedVector = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) =>
    Number(vector[index] ?? 0)
  );
  const magnitude =
    Math.sqrt(sizedVector.reduce((sum, value) => sum + value * value, 0)) || 1;

  return sizedVector.map((value) => value / magnitude);
}

async function createJinaEmbedding(text: string) {
  const response = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.JINA_EMBEDDING_MODEL ?? "jina-embeddings-v3",
      task: "retrieval.passage",
      dimensions: EMBEDDING_DIMENSIONS,
      input: [text],
    }),
  });

  if (!response.ok) {
    throw new Error("Jina embedding request failed.");
  }

  const payload = (await response.json()) as JinaEmbeddingResponse;
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding?.length) {
    throw new Error("Jina embedding response did not include a vector.");
  }

  return normalizeVector(embedding);
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (process.env.RAG_EMBEDDING_PROVIDER === "jina" && process.env.JINA_API_KEY) {
    return "jina";
  }

  return "local";
}

export async function createEmbedding(text: string) {
  if (getEmbeddingProvider() === "jina") {
    return createJinaEmbedding(text);
  }

  return createLocalEmbedding(text);
}

export { EMBEDDING_DIMENSIONS };
