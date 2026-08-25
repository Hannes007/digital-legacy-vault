"use client";

import { FileSearch, ListChecks, Search, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  DocumentStatus,
  type AiInsightDto,
  type AiSearchResultDto,
  type CompletenessReportDto,
  type DocumentDto,
} from "@dlv/shared-types";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Spinner } from "@/components/ui";
import { aiApi } from "@/lib/ai-api";
import { vaultApi } from "@/lib/vault-api";

function typeLabel(type: string): string {
  return type.toLowerCase().replaceAll("_", " ");
}

export default function AssistantPage() {
  const [error, setError] = useState<string | null>(null);
  const [aiOff, setAiOff] = useState(false);

  // NL search
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<AiSearchResultDto | null>(null);

  // Completeness
  const [report, setReport] = useState<CompletenessReportDto | null>(null);

  // Document insight
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [insight, setInsight] = useState<AiInsightDto | null>(null);
  const [generating, setGenerating] = useState(false);

  const reload = useCallback(async () => {
    try {
      const prefs = await aiApi.getPreferences();
      if (!prefs.aiEnabled) {
        setAiOff(true);
        return;
      }
      const [r, docs] = await Promise.all([aiApi.recommendations(), vaultApi.listDocuments()]);
      setReport(r);
      setDocuments(docs.filter((d) => d.status === DocumentStatus.READY));
    } catch {
      setError("We couldn’t load the assistant right now.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setResult(await aiApi.search({ query }));
    } catch {
      setError("Search didn’t work — please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function generate(apply: boolean) {
    if (!selectedDoc) return;
    setGenerating(true);
    setError(null);
    try {
      setInsight(await aiApi.generateInsight(selectedDoc, { apply }));
      if (apply) void reload();
    } catch {
      setError("We couldn’t generate an insight for that document (it may be client-encrypted, still processing, or over your plan’s AI limit).");
    } finally {
      setGenerating(false);
    }
  }

  if (aiOff) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-h1 text-fg">Assistant</h1>
        <EmptyState
          icon={Sparkles}
          title="AI features are switched off"
          description="You’ve opted out of AI features. You can re-enable them at any time — nothing is processed without your say-so."
          action={<Link href="/settings/ai"><Button>AI settings</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-fg">Assistant</h1>
          <p className="text-body-sm text-fg-secondary">
            Ask questions in plain language, get summaries, and see what your estate plan is missing.
            Client-encrypted items are never read by AI.
          </p>
        </div>
        <Link href="/settings/ai" className="text-body-sm text-accent underline-offset-2 hover:underline">
          How AI is used
        </Link>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Card>
        <CardHeader title="Search your vault" description="e.g. “do I have life insurance?” or “find my tax returns”" />
        <CardBody className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              label="Ask about your documents"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void runSearch(); }}
              placeholder="e.g. do I have life insurance?"
            />
            <Button onClick={() => void runSearch()} disabled={searching || !query.trim()}>
              {searching ? <Spinner size={16} /> : <Search className="size-4" />}
              Search
            </Button>
          </div>
          {result ? (
            result.hits.length === 0 ? (
              <EmptyState icon={FileSearch} title="No matches" description="Nothing in your searchable documents matched that. Client-encrypted items are excluded by design." />
            ) : (
              <ul className="flex flex-col gap-2">
                {result.hits.map((hit) => (
                  <li key={hit.documentId} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-body text-fg">{hit.title}</span>
                      <span className="text-body-sm text-fg-secondary capitalize">{typeLabel(hit.type)}</span>
                    </div>
                    <Link href="/vault" className="text-body-sm text-accent underline-offset-2 hover:underline">Open vault</Link>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Document insight"
          description="Classify and summarise a document; optionally apply the suggested category."
        />
        <CardBody className="flex flex-col gap-4">
          {documents.length === 0 ? (
            <p className="text-body-sm text-fg-secondary">Upload a document to your vault first — insights work on processed (READY) documents.</p>
          ) : (
            <>
              <select
                value={selectedDoc}
                onChange={(e) => { setSelectedDoc(e.target.value); setInsight(null); }}
                aria-label="Choose a document"
                className="h-10 rounded-lg border border-border bg-bg px-3 text-body text-fg"
              >
                <option value="">Choose a document…</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button onClick={() => void generate(false)} disabled={!selectedDoc || generating}>
                  {generating ? <Spinner size={16} /> : <Wand2 className="size-4" />}
                  Generate insight
                </Button>
                <Button variant="secondary" onClick={() => void generate(true)} disabled={!selectedDoc || generating}>
                  Generate &amp; apply category
                </Button>
              </div>
              {insight ? (
                <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="accent" className="capitalize">{typeLabel(insight.suggestedType)}</Badge>
                    <span className="text-body-sm text-fg-secondary">
                      {Math.round(insight.confidence * 100)}% confidence · {insight.model}
                      {insight.applied ? " · category applied" : ""}
                    </span>
                  </div>
                  <p className="text-body text-fg">{insight.summary}</p>
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Estate completeness"
          description={report ? `Your estate plan covers ${String(report.score)}% of the essentials.` : "Checking your essentials…"}
        />
        <CardBody className="flex flex-col gap-3">
          {report === null ? (
            <Spinner />
          ) : report.recommendations.length === 0 ? (
            <EmptyState icon={ListChecks} title="Everything essential is in place" description="All the core estate documents are present in your vault. Well done." />
          ) : (
            <ul className="flex flex-col gap-2">
              {report.recommendations.map((rec) => (
                <li key={rec.type} className="flex flex-col gap-1 rounded-lg border border-border px-4 py-3">
                  <span className="text-body font-medium text-fg">{rec.title}</span>
                  <span className="text-body-sm text-fg-secondary">{rec.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
