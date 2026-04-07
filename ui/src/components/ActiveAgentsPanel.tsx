import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import type { Agent, Issue } from "@paperclipai/shared";
import { heartbeatsApi, type LiveRunForIssue } from "../api/heartbeats";
import { agentsApi } from "../api/agents";
import { issuesApi } from "../api/issues";
import type { TranscriptEntry } from "../adapters";
import { queryKeys } from "../lib/queryKeys";
import { cn, relativeTime } from "../lib/utils";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Identity } from "./Identity";
import { RunTranscriptView } from "./transcript/RunTranscriptView";
import { useLiveRunTranscripts } from "./transcript/useLiveRunTranscripts";

const MIN_DASHBOARD_RUNS = 4;
const HEARTBEAT_INTERVAL_SEC = 30;

function isRunActive(run: LiveRunForIssue): boolean {
  return run.status === "queued" || run.status === "running";
}

/** Thin progress bar counting down to next data refresh. */
function HeartbeatCountdown() {
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const pct = (elapsed % HEARTBEAT_INTERVAL_SEC) / HEARTBEAT_INTERVAL_SEC;
      setProgress(pct);
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.ceil(HEARTBEAT_INTERVAL_SEC - (progress * HEARTBEAT_INTERVAL_SEC)));

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="hidden sm:inline text-[9px] text-muted-foreground/60 uppercase tracking-wider">refresh</span>
      <div className="w-12 sm:w-20 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-red/50 transition-[width] duration-200"
          style={{ width: `${(1 - progress) * 100}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground font-mono w-4 text-right">
        {remaining}s
      </span>
    </div>
  );
}

interface ActiveAgentsPanelProps {
  companyId: string;
}

export function ActiveAgentsPanel({ companyId }: ActiveAgentsPanelProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("paperclip.activeAgentsCollapsed") === "true";
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("paperclip.activeAgentsCollapsed", String(next)); } catch {}
  }

  const { data: liveRuns } = useQuery({
    queryKey: [...queryKeys.liveRuns(companyId), "dashboard"],
    queryFn: () => heartbeatsApi.liveRunsForCompany(companyId, MIN_DASHBOARD_RUNS),
  });

  const runs = liveRuns ?? [];
  const activeCount = runs.filter(isRunActive).length;

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(companyId),
    queryFn: () => issuesApi.list(companyId),
    enabled: runs.length > 0,
  });
  const { data: agentsList } = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: runs.length > 0,
  });

  const issueById = useMemo(() => {
    const map = new Map<string, Issue>();
    for (const issue of issues ?? []) {
      map.set(issue.id, issue);
    }
    return map;
  }, [issues]);

  const agentAvatarUrl = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const a of agentsList ?? []) {
      map.set(a.id, a.avatarUrl ?? null);
    }
    return (id: string) => map.get(id) ?? null;
  }, [agentsList]);

  const { transcriptByRun, hasOutputForRun } = useLiveRunTranscripts({
    runs,
    companyId,
    maxChunksPerRun: 120,
  });

  return (
    <div>
      {/* Header — clickable to collapse on desktop */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="mb-3 flex w-full items-center gap-2 text-left"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Active Agents
        </h3>
        {activeCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-red/10 px-2 py-0.5 text-[10px] font-medium text-brand-red dark:text-red-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-red" />
            </span>
            {activeCount} live
          </span>
        )}
        {/* Heartbeat countdown + collapse chevron */}
        <span className="ml-auto flex items-center gap-2">
          <HeartbeatCountdown />
          <ChevronDown
            className={cn(
              "hidden sm:block h-4 w-4 text-muted-foreground transition-transform",
              collapsed && "-rotate-90",
            )}
          />
        </span>
      </button>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">No recent agent runs.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile: compact 2-col mini cards (always visible) ── */}
          <div className="grid grid-cols-2 gap-1.5 sm:hidden">
            {runs.map((run) => {
              const active = isRunActive(run);
              const issue = run.issueId ? issueById.get(run.issueId) : undefined;
              return (
                <Link
                  key={run.id}
                  to={`/agents/${run.agentId}/runs/${run.id}`}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2 py-2 no-underline transition-colors",
                    active
                      ? "border-brand-red/25 bg-brand-red/[0.04]"
                      : "border-border bg-background/70",
                  )}
                >
                  {/* Status dot */}
                  {active ? (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red" />
                    </span>
                  ) : (
                    <span className="inline-flex h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
                  )}
                  {/* Agent name + status */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium leading-tight text-foreground">
                      {run.agentName}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-muted-foreground">
                      {active
                        ? "Live now"
                        : run.finishedAt
                          ? relativeTime(run.finishedAt)
                          : relativeTime(run.createdAt)}
                      {issue?.identifier ? ` · ${issue.identifier}` : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Desktop: full cards (collapsible) ── */}
          {!collapsed && (
            <div className="hidden sm:grid sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {runs.map((run) => (
                <AgentRunCard
                  key={run.id}
                  run={run}
                  issue={run.issueId ? issueById.get(run.issueId) : undefined}
                  transcript={transcriptByRun.get(run.id) ?? []}
                  hasOutput={hasOutputForRun(run.id)}
                  isActive={isRunActive(run)}
                  avatarUrl={agentAvatarUrl(run.agentId)}
                />
              ))}
            </div>
          )}

          {/* Desktop collapsed summary row */}
          {collapsed && (
            <div className="hidden sm:flex flex-wrap gap-2">
              {runs.map((run) => {
                const active = isRunActive(run);
                const issue = run.issueId ? issueById.get(run.issueId) : undefined;
                return (
                  <Link
                    key={run.id}
                    to={`/agents/${run.agentId}/runs/${run.id}`}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs no-underline transition-colors hover:bg-accent/50",
                      active
                        ? "border-brand-red/25 bg-brand-red/[0.04]"
                        : "border-border bg-background/70",
                    )}
                  >
                    {active ? (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red" />
                      </span>
                    ) : (
                      <span className="inline-flex h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
                    )}
                    <span className="font-medium">{run.agentName}</span>
                    {active && <span className="text-brand-red dark:text-red-400">Live</span>}
                    {!active && run.finishedAt && (
                      <span className="text-muted-foreground">{relativeTime(run.finishedAt)}</span>
                    )}
                    {issue?.identifier && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {issue.identifier}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AgentRunCard({
  run,
  issue,
  transcript,
  hasOutput,
  isActive,
  avatarUrl,
}: {
  run: LiveRunForIssue;
  issue?: Issue;
  transcript: TranscriptEntry[];
  hasOutput: boolean;
  isActive: boolean;
  avatarUrl?: string | null;
}) {
  return (
    <div className={cn(
      "flex h-[320px] flex-col overflow-hidden rounded-xl border shadow-sm",
      isActive
        ? "border-brand-red/20 bg-brand-red/[0.03] shadow-[0_16px_40px_rgba(217,48,37,0.07)]"
        : "border-border bg-background/70",
    )}>
      <div className={cn(
        "border-b border-border/40 px-3 py-3",
        isActive ? "bg-brand-red/[0.05]" : "bg-muted/30",
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isActive ? (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-red" />
                </span>
              ) : (
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-muted-foreground/35" />
              )}
              <Identity name={run.agentName} avatarUrl={avatarUrl} size="sm" className="[&>span:last-child]:!text-[11px]" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{isActive ? "Live now" : run.finishedAt ? `Finished ${relativeTime(run.finishedAt)}` : `Started ${relativeTime(run.createdAt)}`}</span>
            </div>
          </div>

          <Link
            to={`/agents/${run.agentId}/runs/${run.id}`}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>

        {run.issueId && (
          <div className="mt-3 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2 text-xs">
            <Link
              to={`/issues/${issue?.identifier ?? run.issueId}`}
              className={cn(
                "line-clamp-2 hover:underline",
                isActive ? "text-brand-red dark:text-red-300" : "text-muted-foreground hover:text-foreground",
              )}
              title={issue?.title ? `${issue?.identifier ?? run.issueId.slice(0, 8)} - ${issue.title}` : issue?.identifier ?? run.issueId.slice(0, 8)}
            >
              {issue?.identifier ?? run.issueId.slice(0, 8)}
              {issue?.title ? ` - ${issue.title}` : ""}
            </Link>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <RunTranscriptView
          entries={transcript}
          density="compact"
          limit={5}
          streaming={isActive}
          collapseStdout
          emptyMessage={hasOutput ? "Processing..." : isActive ? "Working..." : "No output yet."}
        />
      </div>
    </div>
  );
}
