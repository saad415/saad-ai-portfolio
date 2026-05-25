const EMBEDDING_DIMENSIONS = 384;

const STOP_WORDS = new Set([
  "a",
  "about",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "saad",
  "that",
  "the",
  "this",
  "to",
  "what",
  "which",
  "with",
  "you",
]);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function hashToken(token: string) {
  let hash = 2166136261;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createLocalEmbedding(text: string) {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  tokens.forEach((token) => {
    const hash = hashToken(token);
    const dimension = hash % EMBEDDING_DIMENSIONS;
    const sign = hash % 2 === 0 ? 1 : -1;
    vector[dimension] += sign;
  });

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const bigram = `${tokens[index]} ${tokens[index + 1]}`;
    const hash = hashToken(bigram);
    const dimension = hash % EMBEDDING_DIMENSIONS;
    const sign = hash % 2 === 0 ? 1 : -1;
    vector[dimension] += sign * 1.5;
  }

  const magnitude =
    Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;

  return vector.map((value) => value / magnitude);
}

export function toPgVector(vector: number[]) {
  return `[${vector.map((value) => value.toFixed(6)).join(",")}]`;
}

export function cosineSimilarity(left: number[], right: number[]) {
  let score = 0;

  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    score += left[index] * right[index];
  }

  return score;
}
