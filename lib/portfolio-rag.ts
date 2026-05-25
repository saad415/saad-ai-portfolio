import { neon } from "@neondatabase/serverless";
import { loadPortfolioDocuments } from "@/lib/portfolio-content";
import {
  cosineSimilarity,
  createLocalEmbedding,
  toPgVector,
} from "@/lib/rag-embeddings";
import {
  createEmbedding,
  getEmbeddingProvider,
} from "@/lib/rag-embedding-provider";
import {
  retrievePortfolioSources,
  type RetrievedPortfolioSource,
} from "@/lib/portfolio-knowledge";

type RagChunk = {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  content: string;
  contentHash: string;
};

type RagRow = {
  id: string;
  source_id: string;
  title: string;
  url: string;
  content: string;
  vector_score: number;
  keyword_score: number;
  score: number;
};

export type PortfolioRagSource = RetrievedPortfolioSource;

const SOURCE_PRIORITY: Record<string, number> = {
  "spine-thesis": 0.08,
  "uterus-thesis": 0.08,
  "medical-annotation-platform": 0.07,
  experience: 0.04,
  skills: 0.03,
};

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;
let setupPromise: Promise<void> | null = null;

function hashContent(content: string) {
  let hash = 0;

  for (let index = 0; index < content.length; index += 1) {
    hash = Math.imul(31, hash) + content.charCodeAt(index);
    hash |= 0;
  }

  return String(hash >>> 0);
}

function chunkContent(content: string, maxWords = 150, overlapWords = 30) {
  const words = content.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  const step = Math.max(1, maxWords - overlapWords);

  for (let index = 0; index < words.length; index += step) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }

  return chunks.length ? chunks : [content];
}

function getPortfolioChunks(): RagChunk[] {
  return loadPortfolioDocuments().flatMap((source) =>
    chunkContent(source.content).map((content, index) => {
      const enrichedContent = `${source.title}. ${content}`;

      return {
        id: `${source.id}-${index}`,
        sourceId: source.id,
        title: source.title,
        url: source.url,
        content,
        contentHash: hashContent(enrichedContent),
      };
    })
  );
}

async function ensureRagIndex() {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const embeddingProvider = getEmbeddingProvider();
  const embeddingModel =
    embeddingProvider === "jina"
      ? process.env.JINA_EMBEDDING_MODEL ?? "jina-embeddings-v3"
      : "local-hashing-384";

  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;

  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_rag_chunks (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      embedding vector(384) NOT NULL,
      embedding_provider TEXT NOT NULL DEFAULT 'local',
      embedding_model TEXT NOT NULL DEFAULT 'local-hashing-384',
      search_text TSVECTOR,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE portfolio_rag_chunks
    ADD COLUMN IF NOT EXISTS embedding_provider TEXT NOT NULL DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS embedding_model TEXT NOT NULL DEFAULT 'local-hashing-384',
    ADD COLUMN IF NOT EXISTS search_text TSVECTOR;
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS portfolio_rag_chunks_embedding_idx
    ON portfolio_rag_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 8);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS portfolio_rag_chunks_search_idx
    ON portfolio_rag_chunks
    USING GIN (search_text);
  `;

  for (const chunk of getPortfolioChunks()) {
    const embedding = await createEmbedding(`${chunk.title}. ${chunk.content}`);

    await sql`
      INSERT INTO portfolio_rag_chunks (
        id,
        source_id,
        title,
        url,
        content,
        content_hash,
        embedding,
        embedding_provider,
        embedding_model,
        search_text,
        updated_at
      ) VALUES (
        ${chunk.id},
        ${chunk.sourceId},
        ${chunk.title},
        ${chunk.url},
        ${chunk.content},
        ${chunk.contentHash},
        ${toPgVector(embedding)}::vector,
        ${embeddingProvider},
        ${embeddingModel},
        to_tsvector('english', ${`${chunk.title} ${chunk.content}`}),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        title = EXCLUDED.title,
        url = EXCLUDED.url,
        content = EXCLUDED.content,
        content_hash = EXCLUDED.content_hash,
        embedding = EXCLUDED.embedding,
        embedding_provider = EXCLUDED.embedding_provider,
        embedding_model = EXCLUDED.embedding_model,
        search_text = EXCLUDED.search_text,
        updated_at = NOW()
      WHERE portfolio_rag_chunks.content_hash <> EXCLUDED.content_hash
        OR portfolio_rag_chunks.embedding_provider <> EXCLUDED.embedding_provider
        OR portfolio_rag_chunks.embedding_model <> EXCLUDED.embedding_model;
    `;
  }
}

function ensureRagIndexOnce() {
  setupPromise ??= ensureRagIndex().catch((error: unknown) => {
    setupPromise = null;
    throw error;
  });
  return setupPromise;
}

function keywordScore(question: string, text: string) {
  const queryTokens = question
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
  const haystack = text.toLowerCase();

  return queryTokens.reduce(
    (score, token) => score + (haystack.includes(token) ? 1 : 0),
    0
  );
}

function sourcePriority(sourceId: string) {
  return SOURCE_PRIORITY[sourceId] ?? 0;
}

function fallbackHybridSearch(question: string, limit: number) {
  const queryEmbedding = createLocalEmbedding(question);

  return getPortfolioChunks()
    .map((chunk) => {
      const localEmbedding = createLocalEmbedding(
        `${chunk.title}. ${chunk.content}`
      );
      const vectorScore = cosineSimilarity(queryEmbedding, localEmbedding);
      const lexicalScore = keywordScore(
        question,
        `${chunk.title} ${chunk.content}`
      );

      return {
        id: chunk.sourceId,
        title: chunk.title,
        url: chunk.url,
        content: chunk.content,
        score:
          vectorScore * 0.7 +
          Math.min(lexicalScore / 6, 1) * 0.25 +
          sourcePriority(chunk.sourceId),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export async function retrievePortfolioRagSources(
  question: string,
  limit = 5
): Promise<RetrievedPortfolioSource[]> {
  if (!sql) {
    return fallbackHybridSearch(question, limit);
  }

  try {
    await ensureRagIndexOnce();

    const queryVector = toPgVector(await createEmbedding(question));
    const rows = (await sql`
      WITH ranked AS (
        SELECT
          source_id,
          title,
          url,
          content,
          1 - (embedding <=> ${queryVector}::vector) AS vector_score,
          ts_rank_cd(search_text, plainto_tsquery('english', ${question})) AS keyword_score
        FROM portfolio_rag_chunks
      )
      SELECT
        source_id,
        title,
        url,
        content,
        vector_score,
        keyword_score,
        (vector_score * 0.70)
          + (LEAST(keyword_score, 1) * 0.25)
          + CASE source_id
              WHEN 'spine-thesis' THEN 0.08
              WHEN 'uterus-thesis' THEN 0.08
              WHEN 'medical-annotation-platform' THEN 0.07
              WHEN 'experience' THEN 0.04
              WHEN 'skills' THEN 0.03
              ELSE 0
            END AS score
      FROM ranked
      ORDER BY score DESC
      LIMIT ${limit};
    `) as RagRow[];

    return rows.map((row) => ({
      id: row.source_id,
      title: row.title,
      url: row.url,
      content: row.content,
      score: Number(row.score),
    }));
  } catch {
    const fallback = fallbackHybridSearch(question, limit);

    if (fallback.length) {
      return fallback;
    }

    return retrievePortfolioSources(question, limit);
  }
}

export async function refreshPortfolioRagIndex() {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  setupPromise = ensureRagIndex();
  await setupPromise;

  return {
    embeddingProvider: getEmbeddingProvider(),
    indexedChunks: getPortfolioChunks().length,
  };
}
