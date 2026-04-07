import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Agent } from "@paperclipai/shared";
import { heartbeatsApi, type LiveRunForIssue } from "../api/heartbeats";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import { formatDateTime } from "../lib/utils";
import { ExternalLink, Square } from "lucide-react";
import { Identity } from "./Identity";
import { StatusBadge } from "./StatusBadge";
import { RunTranscriptView } from "./transcript/RunTranscriptView";
import { useLiveRunTranscripts } from "./transcript/useLiveRunTranscripts";

interface LiveRunWidgetProps {
  issueId: string;
  companyId?: string | null;
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function isRunActive(status: string): boolean {
  return status === "queued" || status === "running";
}

export function LiveRunWidget({ issueId, companyId }: LiveRunWidgetProps) {
  const queryClient = useQueryClient();
  const [cancellingRunIds, setCancellingRunIds] = useState(new Set<string>());

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.issues.liveRuns(issueId),
    queryFn: () => heartbeatsApi.liveRunsForIssue(issueId),
    enabled: !!issueId,
    refetchInterval: 3000,
  });

  const { data: activeRun } = useQuery({
    queryKey: queryKeys.issues.activeRun(issueId),
    queryFn: () => heartbeatsApi.activeRunForIssue(issueId),
    enabled: !!issueId,
    refetchInterval: 3000,
  });

  const runs = useMemo(() => {
    const deduped = new Map<string, LiveRunForIssue>();
    for (const run of liveRuns ?? []) {
      deduped.set(run.id, run);
    }
    if (activeRun) {
      deduped.set(activeRun.id, {
        id: activeRun.id,
        status: activeRun.status,
        invocationSource: activeRun.invocationSource,
        triggerDetail: activeRun.triggerDetail,
        startedAt: toIsoString(activeRun.startedAt),
        finishedAt: toIsoString(activeRun.finishedAt),
        createdAt: toIsoString(activeRun.createdAt) ?? new Date().toISOString(),
        agentId: activeRun.agentId,
        agentName: activeRun.agentName,
        adapterType: activeRun.adapterType,
        issueId,
      });
    }
    return [...deduped.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [activeRun, issueId, liveRuns]);

  const { transcriptByRun, hasOutputForRun } = useLiveRunTranscripts({ runs, companyId });

  const { data: agentsList } = useQuery({
    queryKey: queryKeys.agents.list(companyId ?? ""),
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId && runs.length > 0,
  });
  const agentAvatarUrl = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const a of agentsList ?? []) {
      map.set(a.id, a.avatarUrl ?? null);
    }
    return (id: string) => map.get(id) ?? null;
  }, [agentsList]);

  const handleCancelRun = async (runId: string) => {
    setCancellingRunIds((prev) => new Set(prev).add(runId));
    try {
      await heartbeatsApi.cancel(runId);
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.liveRuns(issueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.activeRun(issueId) });
    } finally {
      setCancellingRunIds((prev) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  };

  if (runs.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-brand-red/20 bg-background/80 shadow-[0_18px_50px_rgba(217,48,37,0.06)]">
      <div className="border-b border-border/60 bg-brand-red/[0.04] px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red dark:text-red-300">
          Live Progress
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          What your agents are working on right now
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {runs.map((run) => {
          const isActive = isRunActive(run.status);
          const transcript = transcriptByRun.get(run.id) ?? [];
          return (
            <section key={run.id} className="px-4 py-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link to={`/agents/${run.agentId}`} className="inline-flex hover:underline">
                    <Identity name={run.agentName} avatarUrl={agentAvatarUrl(run.agentId)} size="sm" />
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Link
                      to={`/agents/${run.agentId}/runs/${run.id}`}
                      className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-2 py-1 text-xs hover:border-brand-red/30 hover:text-foreground"
                    >
                      View details
                    </Link>
                    <StatusBadge status={run.status} />
                    <span>{formatDateTime(run.startedAt ?? run.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isActive && (
                    <button
                      onClick={() => handleCancelRun(run.id)}
                      disabled={cancellingRunIds.has(run.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/[0.06] px-2.5 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-500/[0.12] dark:text-red-300 disabled:opacity-50"
                    >
                      <Square className="h-2.5 w-2.5" fill="currentColor" />
                      {cancellingRunIds.has(run.id) ? "Stopping…" : "Stop"}
                    </button>
                  )}
                  <Link
                    to={`/agents/${run.agentId}/runs/${run.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-brand-red transition-colors hover:border-brand-red/30 hover:text-brand-red-hover dark:text-red-300"
                  >
                    Open run
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="max-h-[320px] overflow-y-auto pr-1">
                <RunTranscriptView
                  entries={transcript}
                  density="compact"
                  limit={8}
                  streaming={isActive}
                  collapseStdout
                  emptyMessage={hasOutputForRun(run.id) ? "Waiting for transcript parsing..." : "Waiting for run output..."}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
