import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { portfolioKnowledge, type PortfolioSource } from "@/lib/portfolio-knowledge";

const CONTENT_DIR = path.join(process.cwd(), "content", "portfolio");

function parseFrontmatter(fileContent: string) {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return null;
  }

  const metadata = Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, ...valueParts] = line.split(":");
        return [key.trim(), valueParts.join(":").trim()];
      })
  );

  return {
    metadata,
    content: match[2].trim(),
  };
}

export function loadPortfolioDocuments(): PortfolioSource[] {
  if (!existsSync(CONTENT_DIR)) {
    return portfolioKnowledge;
  }

  const documents = readdirSync(CONTENT_DIR)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const filePath = path.join(CONTENT_DIR, fileName);
      const parsed = parseFrontmatter(readFileSync(filePath, "utf8"));

      if (!parsed) {
        return null;
      }

      return {
        id: parsed.metadata.id,
        title: parsed.metadata.title,
        url: parsed.metadata.url,
        content: parsed.content,
      };
    })
    .filter((document): document is PortfolioSource =>
      Boolean(document?.id && document.title && document.url && document.content)
    );

  return documents.length ? documents : portfolioKnowledge;
}
