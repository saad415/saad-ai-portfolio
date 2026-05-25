"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowUpRight, Bot, Loader2, Send, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";

type AskSource = {
  id: string;
  title: string;
  url: string;
  excerpt: string;
};

type AskResponse = {
  answer?: string;
  error?: string;
  sources?: AskSource[];
};

const suggestions = [
  "What was Saad's master's thesis about?",
  "How does the medical annotation platform work?",
  "Which project best shows full-stack AI engineering?",
  "How can ML teams consume the annotated MRI datasets?",
];

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AskSource[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const ask = async (nextQuestion = question) => {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion || isLoading) return;

    setQuestion(cleanQuestion);
    setIsLoading(true);
    setAnswer("");
    setError("");
    setSources([]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion }),
      });
      const payload = (await response.json()) as AskResponse;

      if (!response.ok && !payload.answer) {
        throw new Error(payload.error ?? "Could not answer this question.");
      }

      setAnswer(payload.answer ?? "");
      setSources(payload.sources ?? []);
      if (payload.error) setError(payload.error);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not answer this question."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask();
  };

  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <aside className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/70 p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-300/25 bg-teal-300/10">
              <Bot className="text-teal-300" size={22} />
            </div>

            <p className="mt-6 text-xs uppercase tracking-[0.3em] text-teal-300">
              Portfolio AI
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Ask My Portfolio
            </h1>
            <p className="mt-4 leading-7 text-zinc-400">
              Ask about my thesis work, medical imaging projects, full-stack
              systems, publications, experience, and technical stack. Answers
              are grounded in portfolio pages and linked back to sources.
            </p>

            <div className="mt-8 space-y-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-teal-300/40 hover:bg-teal-300/5 hover:text-white"
                >
                  <span>{suggestion}</span>
                  <ArrowUpRight
                    size={15}
                    className="shrink-0 text-zinc-600 transition group-hover:text-teal-300"
                  />
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/70 p-5 sm:p-7">
            <form onSubmit={onSubmit} className="space-y-4">
              <label
                htmlFor="portfolio-question"
                className="text-sm font-medium text-zinc-300"
              >
                Question
              </label>
              <div className="rounded-3xl border border-white/[0.08] bg-black/30 p-3 focus-within:border-teal-300/50">
                <textarea
                  id="portfolio-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Example: What makes Saad a strong candidate for a medical imaging full-stack role?"
                  rows={5}
                  className="min-h-32 w-full resize-none bg-transparent px-3 py-2 leading-7 text-white outline-none placeholder:text-zinc-600"
                />
                <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3 pt-3">
                  <p className="hidden text-xs text-zinc-600 sm:block">
                    Uses curated retrieval first, then Groq for the answer.
                  </p>
                  <button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                    Ask
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6 min-h-80 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5">
              {!answer && !error && !isLoading && (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <Sparkles className="text-teal-300" size={24} />
                  <p className="mt-4 max-w-md text-sm leading-6 text-zinc-500">
                    Ask something specific, like how the MRI annotation system
                    exports data for ML teams or how the thesis models work.
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="flex h-64 items-center justify-center gap-3 text-sm text-teal-200">
                  <Loader2 className="animate-spin" size={18} />
                  Reading portfolio sources...
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {answer && (
                <div>
                  <p className="whitespace-pre-wrap leading-8 text-zinc-200">
                    {answer}
                  </p>

                  {sources.length > 0 && (
                    <div className="mt-8">
                      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-600">
                        Sources
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {sources.map((source) => (
                          <Link
                            key={source.id}
                            href={source.url}
                            className="group rounded-2xl border border-white/[0.08] bg-black/25 p-4 transition hover:border-teal-300/40 hover:bg-teal-300/5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-medium text-white">
                                {source.title}
                              </p>
                              <ArrowUpRight
                                size={15}
                                className="mt-1 shrink-0 text-zinc-600 transition group-hover:text-teal-300"
                              />
                            </div>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500">
                              {source.excerpt}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
