import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, RefreshCw, ChevronDown, ChevronRight, Sparkles, Upload, Trash2, BookOpen } from "lucide-react";
import { wikiApi, type WikiEntry } from "../api/wiki";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { api } from "../api/client";
import { Button } from "@/components/ui/button";

// ── helpers ──────────────────────────────────────────────────────────────────
const PALETTE = ["#f97316","#06b6d4","#8b5cf6","#10b981","#f59e0b","#3b82f6","#ec4899","#14b8a6"];
function agentColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[h];
}
function initials(name: string) {
  return name.split(/[-\s]/).map(w => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

// ── expandable entry ─────────────────────────────────────────────────────────
function EntryRow({
  entry, onDelete,
}: {
  entry: WikiEntry;
  onDelete?: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const body = entry.body.replace(/^---[\s\S]*?---\n?/, "").trim();
  const preview = body.slice(0, 200).replace(/\n+/g, " ");
  return (
    <div className="border-b border-border last:border-0 py-3">
      <button className="flex items-start gap-2 w-full text-left group" onClick={() => setOpen(v => !v)}>
        <span className="mt-0.5 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">{entry.title}</p>
          {!open && preview && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{preview}…</p>
          )}
        </div>
        {onDelete && (
          <span
            role="button"
            className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 p-1"
            onClick={(e) => { e.stopPropagation(); onDelete(entry.filePath); }}
          >
            <Trash2 className="h-3 w-3" />
          </span>
        )}
      </button>
      {open && (
        <div className="ml-5 mt-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto pr-2">
          {body}
        </div>
      )}
    </div>
  );
}

// ── section ─────────────────────────────────────────────────────────────────
function Section({
  icon, title, count, children, defaultOpen = true, actions,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
        >
          <span className="shrink-0 text-muted-foreground">{icon}</span>
          <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
          <span className="text-[11px] text-muted-foreground">{count}</span>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
        {actions}
      </div>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

// ── agent group ──────────────────────────────────────────────────────────────
function AgentGroup({ agent, entries }: { agent: string; entries: WikiEntry[] }) {
  const [open, setOpen] = useState(false);
  const color = agentColor(agent);
  return (
    <div className="border-b border-border last:border-0 py-2">
      <button className="flex items-center gap-2 w-full text-left" onClick={() => setOpen(v => !v)}>
        <span style={{ background: color }} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0">
          {initials(agent)}
        </span>
        <span className="text-xs font-medium text-foreground/80 flex-1">{agent}</span>
        <span className="text-[10px] text-muted-foreground">{entries.length}</span>
        {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
      </button>
      {open && (
        <div className="ml-7 mt-1">
          {entries.map((e, i) => <EntryRow key={i} entry={e} />)}
        </div>
      )}
    </div>
  );
}

// ── upload area ──────────────────────────────────────────────────────────────
function UploadArea({ onUploaded }: { onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("");

  const doUpload = useCallback(async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    setStatus("");
    const form = new FormData();
    for (const f of Array.from(files)) form.append("files", f);
    try {
      const res = await api.postForm<{ uploaded: Array<{ name: string; chars: number }>; errors: Array<{ name: string; error: string }> }>(
        "/wiki/upload", form,
      );
      const ok = res.uploaded.length;
      const err = res.errors.length;
      setStatus(`${ok} file${ok === 1 ? "" : "s"} added to brand brain${err ? `, ${err} failed` : ""}`);
      onUploaded();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setStatus(""), 4000);
    }
  }, [onUploaded]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files); }}
      className={`border-2 border-dashed rounded-lg px-4 py-5 text-center transition-colors ${
        dragOver ? "border-primary/60 bg-primary/10" : "border-border bg-muted/30"
      }`}
    >
      <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
      <p className="text-xs text-muted-foreground">
        Drag files here or{" "}
        <label className="text-primary cursor-pointer hover:underline">
          browse
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json"
            className="hidden"
            onChange={(e) => e.target.files && doUpload(e.target.files)}
          />
        </label>
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">PDF, DOCX, XLSX, CSV, TXT, MD — up to 20 MB each</p>
      {uploading && <p className="text-xs text-primary mt-2">Uploading...</p>}
      {status && <p className="text-xs text-foreground mt-2">{status}</p>}
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────
export function BrandBrain() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Brand Brain" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.wiki.list("global"),
    queryFn: () => wikiApi.listEntries(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const all: WikiEntry[] = data?.entries ?? [];
  const coreBrand = all.filter(e => e.type === "core_brand");
  const agentKnowledge = all.filter(e => e.type !== "core_brand");

  const agentMap = new Map<string, WikiEntry[]>();
  for (const e of agentKnowledge) {
    const key = e.agent || "other";
    if (!agentMap.has(key)) agentMap.set(key, []);
    agentMap.get(key)!.push(e);
  }
  const agentList = Array.from(agentMap.entries()).sort((a, b) => b[1].length - a[1].length);

  const handleDelete = useCallback(async (filePath: string) => {
    const name = filePath.split("/").pop() ?? "this file";
    if (!window.confirm(`Delete "${name}" from the brand brain? This cannot be undone.`)) return;
    try {
      await api.delete(`/wiki/entry?path=${encodeURIComponent(filePath)}`);
      refetch();
    } catch { /* silent */ }
  }, [refetch]);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="flex flex-col gap-5">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 flex-1">
          <Brain className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Brand Brain</p>
            <p className="text-[11px] text-muted-foreground">
              {coreBrand.length} brand {coreBrand.length === 1 ? "file" : "files"} · {agentKnowledge.length} learned
              {lastUpdated && ` · synced ${lastUpdated}`}
            </p>
          </div>
        </div>
        <Button
          variant={showUpload ? "default" : "outline"}
          size="icon-sm"
          onClick={() => setShowUpload(v => !v)}
          className="h-9 w-9"
        >
          <Upload className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => refetch()} className="h-9 w-9">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {showUpload && <UploadArea onUploaded={() => refetch()} />}

      {isLoading && <p className="text-sm text-muted-foreground">Loading brain...</p>}

      {!isLoading && all.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Brain className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Brand brain is empty. Upload brand materials above — or the onboarding knowledge base will populate this automatically.
          </p>
        </div>
      )}

      {!isLoading && all.length > 0 && (
        <div className="flex flex-col gap-4">
          {coreBrand.length > 0 && (
            <Section
              icon={<BookOpen className="h-5 w-5" />}
              title="Brand Brain"
              count={coreBrand.length}
              actions={
                <button
                  onClick={() => setShowUpload(v => !v)}
                  className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors px-2"
                >
                  + Add
                </button>
              }
            >
              <p className="text-[11px] text-muted-foreground mb-2">
                Core knowledge uploaded during onboarding — every agent reads from this.
              </p>
              {coreBrand.map((e, i) => (
                <EntryRow key={i} entry={e} onDelete={handleDelete} />
              ))}
            </Section>
          )}

          {agentKnowledge.length > 0 && (
            <Section
              icon={<Sparkles className="h-5 w-5" />}
              title="Agent Learnings"
              count={agentKnowledge.length}
              defaultOpen={false}
            >
              <p className="text-[11px] text-muted-foreground mb-2">
                Knowledge extracted from agent sessions — grows automatically as agents work.
              </p>
              {agentList.map(([agent, entries]) => (
                <AgentGroup key={agent} agent={agent} entries={entries} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
