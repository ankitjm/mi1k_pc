import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { documentsApi, type CompanyDocument, type CompanyDocumentDetail } from "../api/documents";
import { assetsApi, type CompanyAsset, type WorkspaceFile } from "../api/assets";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import {
  FileText,
  ChevronRight,
  X,
  Search,
  Download,
  LayoutGrid,
  List,
  Image,
  FileSpreadsheet,
  File,
  FileType,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "../lib/utils";
import { MarkdownBody } from "../components/MarkdownBody";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FilterType = "all" | "documents" | "images" | "spreadsheets" | "pdf" | "other";

function getAssetCategory(contentType: string): FilterType {
  if (contentType.startsWith("image/")) return "images";
  if (contentType === "application/pdf") return "pdf";
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType === "text/csv" ||
    contentType.includes("ms-excel")
  )
    return "spreadsheets";
  return "other";
}

function getAssetIcon(contentType: string) {
  const cat = getAssetCategory(contentType);
  switch (cat) {
    case "images":
      return Image;
    case "spreadsheets":
      return FileSpreadsheet;
    case "pdf":
      return FileType;
    default:
      return File;
  }
}

function getAssetIconColor(contentType: string) {
  const cat = getAssetCategory(contentType);
  switch (cat) {
    case "images":
      return "text-blue-500";
    case "spreadsheets":
      return "text-green-500";
    case "pdf":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

// Unified item type for the combined list
type UnifiedItem =
  | { kind: "document"; data: CompanyDocument }
  | { kind: "asset"; data: CompanyAsset }
  | { kind: "workspace-file"; data: WorkspaceFile };

function downloadDocument(title: string, key: string | null, body: string) {
  const filename = `${title || key || "document"}.md`;
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DocumentViewer({
  doc,
  companyId,
  onClose,
}: {
  doc: CompanyDocument;
  companyId: string;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.documents.detail(companyId, doc.id),
    queryFn: () => documentsApi.get(companyId, doc.id),
  });
  const navigate = useNavigate();
  const [showRaw, setShowRaw] = useState(false);
  const isMarkdown = doc.format === "markdown" || doc.format === "md";

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">
              {doc.title || doc.key || "Untitled"}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {doc.issueIdentifier && (
                <button
                  className="hover:text-foreground rounded-full bg-muted px-2 py-0.5 font-mono text-[11px]"
                  onClick={() => {
                    onClose();
                    navigate(`/issues/${doc.issueId}`);
                  }}
                >
                  {doc.issueIdentifier}
                </button>
              )}
              {doc.key && <span className="font-mono">{doc.key}</span>}
              <span>·</span>
              <span>Rev {doc.latestRevisionNumber}</span>
              <span>·</span>
              <span>{timeAgo(doc.updatedAt)}</span>
              {doc.agentName && (
                <>
                  <span>·</span>
                  <span>{doc.agentName}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isMarkdown && detail?.latestBody && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowRaw(!showRaw)}
                title={showRaw ? "Rendered view" : "Raw source"}
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
            {doc.issueId && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  onClose();
                  navigate(`/issues/${doc.issueId}`);
                }}
                title="Go to issue"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            {detail?.latestBody && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => downloadDocument(doc.title ?? "", doc.key, detail.latestBody!)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : detail?.latestBody ? (
            isMarkdown && !showRaw ? (
              <MarkdownBody>{detail.latestBody}</MarkdownBody>
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed text-foreground">
                {detail.latestBody}
              </pre>
            )
          ) : (
            <div className="text-sm text-muted-foreground">No content.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetViewer({ asset, onClose }: { asset: CompanyAsset; onClose: () => void }) {
  const isImage = asset.contentType.startsWith("image/");
  const isPdf = asset.contentType === "application/pdf";

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">
              {asset.originalFilename || asset.objectKey}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{asset.contentType}</span>
              <span>·</span>
              <span>{formatBytes(asset.byteSize)}</span>
              {asset.agentName && (
                <>
                  <span>·</span>
                  <span>{asset.agentName}</span>
                </>
              )}
              <span>·</span>
              <span>{timeAgo(asset.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a href={asset.contentPath} download={asset.originalFilename || undefined}>
              <Button variant="ghost" size="icon-sm" title="Download">
                <Download className="h-4 w-4" />
              </Button>
            </a>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
          {isImage ? (
            <img
              src={asset.contentPath}
              alt={asset.originalFilename || "Asset"}
              className="max-w-full max-h-[60vh] object-contain rounded-lg"
            />
          ) : isPdf ? (
            <iframe
              src={asset.contentPath}
              className="w-full h-[60vh] rounded-lg border border-border"
              title={asset.originalFilename || "PDF"}
            />
          ) : (
            <div className="text-center space-y-3">
              <File className="h-16 w-16 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type.
              </p>
              <a href={asset.contentPath} download={asset.originalFilename || undefined}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ViewMode = "list" | "grid";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "All",
  documents: "Documents",
  images: "Images",
  spreadsheets: "Spreadsheets",
  pdf: "PDFs",
  other: "Other Files",
};

export function Documents() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<CompanyDocument | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CompanyAsset | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem("paperclip.documentsView") as ViewMode) || "grid";
    } catch {
      return "grid";
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Documents" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    try {
      localStorage.setItem("paperclip.documentsView", viewMode);
    } catch {}
  }, [viewMode]);

  const { data: docs, isLoading: docsLoading, error: docsError } = useQuery({
    queryKey: queryKeys.documents.list(selectedCompanyId!),
    queryFn: () => documentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: assets } = useQuery({
    queryKey: queryKeys.assets.list(selectedCompanyId!),
    queryFn: () => assetsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    retry: false,
  });

  const { data: wsFiles } = useQuery({
    queryKey: queryKeys.assets.workspaceFiles(selectedCompanyId!),
    queryFn: () => assetsApi.listWorkspaceFiles(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    retry: false,
  });

  const isLoading = docsLoading;
  const error = docsError;

  // Build unified list sorted by date, newest first
  const unified = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];
    if (docs) {
      for (const d of docs) {
        items.push({ kind: "document", data: d });
      }
    }
    if (assets) {
      for (const a of assets) {
        items.push({ kind: "asset", data: a });
      }
    }
    if (wsFiles) {
      for (const wf of wsFiles) {
        items.push({ kind: "workspace-file", data: wf });
      }
    }
    items.sort((a, b) => {
      const dateA = a.kind === "document" ? a.data.updatedAt : a.kind === "asset" ? a.data.createdAt : a.data.modifiedAt;
      const dateB = b.kind === "document" ? b.data.updatedAt : b.kind === "asset" ? b.data.createdAt : b.data.modifiedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    return items;
  }, [docs, assets, wsFiles]);

  // Compute category counts for filter pills
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: unified.length,
      documents: 0,
      images: 0,
      spreadsheets: 0,
      pdf: 0,
      other: 0,
    };
    for (const item of unified) {
      if (item.kind === "document") {
        counts.documents++;
      } else if (item.kind === "asset") {
        const cat = getAssetCategory(item.data.contentType);
        counts[cat]++;
      } else {
        const cat = getAssetCategory(item.data.contentType);
        counts[cat]++;
      }
    }
    return counts;
  }, [unified]);

  // Available filter types (only show filters that have items)
  const availableFilters = useMemo(() => {
    const filters: FilterType[] = ["all"];
    if (categoryCounts.documents > 0) filters.push("documents");
    if (categoryCounts.images > 0) filters.push("images");
    if (categoryCounts.spreadsheets > 0) filters.push("spreadsheets");
    if (categoryCounts.pdf > 0) filters.push("pdf");
    if (categoryCounts.other > 0) filters.push("other");
    return filters;
  }, [categoryCounts]);

  const filtered = useMemo(() => {
    let items = unified;

    // Apply type filter
    if (filterType !== "all") {
      items = items.filter((item) => {
        if (filterType === "documents") return item.kind === "document";
        if (item.kind === "asset") return getAssetCategory(item.data.contentType) === filterType;
        if (item.kind === "workspace-file") return getAssetCategory(item.data.contentType) === filterType;
        return false;
      });
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((item) => {
        if (item.kind === "document") {
          const d = item.data;
          return (
            (d.title && d.title.toLowerCase().includes(q)) ||
            (d.key && d.key.toLowerCase().includes(q)) ||
            (d.issueIdentifier && d.issueIdentifier.toLowerCase().includes(q)) ||
            (d.issueTitle && d.issueTitle.toLowerCase().includes(q)) ||
            (d.agentName && d.agentName.toLowerCase().includes(q))
          );
        } else if (item.kind === "asset") {
          const a = item.data;
          return (
            (a.originalFilename && a.originalFilename.toLowerCase().includes(q)) ||
            (a.agentName && a.agentName.toLowerCase().includes(q)) ||
            a.contentType.toLowerCase().includes(q)
          );
        } else {
          const wf = item.data;
          return (
            wf.filename.toLowerCase().includes(q) ||
            wf.relativePath.toLowerCase().includes(q) ||
            wf.agentName.toLowerCase().includes(q) ||
            wf.contentType.toLowerCase().includes(q)
          );
        }
      });
    }

    return items;
  }, [unified, filterType, search]);

  if (!selectedCompanyId) {
    return <EmptyState icon={FileText} message="Select a company to view documents." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  function renderItemName(item: UnifiedItem) {
    if (item.kind === "document") {
      return item.data.title || item.data.key || "Untitled";
    }
    if (item.kind === "asset") {
      return item.data.originalFilename || item.data.objectKey;
    }
    return item.data.filename;
  }

  function renderItemIcon(item: UnifiedItem) {
    if (item.kind === "document") {
      return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
    }
    const ct = item.kind === "asset" ? item.data.contentType : item.data.contentType;
    const Icon = getAssetIcon(ct);
    const colorClass = getAssetIconColor(ct);
    return <Icon className={cn("h-4 w-4 shrink-0", colorClass)} />;
  }

  function renderItemGridIcon(item: UnifiedItem) {
    if (item.kind === "document") {
      return <FileText className="h-7 w-7 text-muted-foreground" />;
    }
    const ct = item.kind === "asset" ? item.data.contentType : item.data.contentType;
    const contentPath = item.kind === "asset" ? item.data.contentPath : item.data.contentPath;
    const filename = item.kind === "asset" ? (item.data.originalFilename || "") : item.data.filename;
    // Show thumbnail for images
    if (ct.startsWith("image/")) {
      return (
        <img
          src={contentPath}
          alt={filename}
          className="h-14 w-14 object-cover rounded-lg"
        />
      );
    }
    const Icon = getAssetIcon(ct);
    const colorClass = getAssetIconColor(ct);
    return <Icon className={cn("h-7 w-7", colorClass)} />;
  }

  function renderItemSubtext(item: UnifiedItem) {
    if (item.kind === "document") {
      const d = item.data;
      return (
        <>
          {d.agentName && <span>{d.agentName}</span>}
          {d.agentName && <span>·</span>}
          <span>{timeAgo(d.updatedAt)}</span>
        </>
      );
    }
    if (item.kind === "asset") {
      const a = item.data;
      return (
        <>
          <span>{formatBytes(a.byteSize)}</span>
          <span>·</span>
          {a.agentName && <span>{a.agentName}</span>}
          {a.agentName && <span>·</span>}
          <span>{timeAgo(a.createdAt)}</span>
        </>
      );
    }
    const wf = item.data;
    return (
      <>
        <span>{formatBytes(wf.byteSize)}</span>
        <span>·</span>
        <span>{wf.agentName}</span>
        <span>·</span>
        <span>{timeAgo(wf.modifiedAt)}</span>
      </>
    );
  }

  function handleItemClick(item: UnifiedItem) {
    if (item.kind === "document") {
      setSelectedDoc(item.data);
    } else if (item.kind === "asset") {
      setSelectedAsset(item.data);
    } else {
      // Convert workspace file to CompanyAsset shape for the viewer
      const wf = item.data;
      setSelectedAsset({
        id: wf.id,
        companyId: wf.companyId,
        provider: "workspace",
        objectKey: wf.relativePath,
        contentType: wf.contentType,
        byteSize: wf.byteSize,
        sha256: "",
        originalFilename: wf.filename,
        createdByAgentId: wf.agentId,
        createdByUserId: null,
        createdAt: wf.createdAt,
        updatedAt: wf.modifiedAt,
        agentName: wf.agentName,
        contentPath: wf.contentPath,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search documents & files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center justify-center h-8 w-8 transition-colors",
              viewMode === "grid" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center justify-center h-8 w-8 transition-colors",
              viewMode === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      {availableFilters.length > 2 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {availableFilters.map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                filterType === ft
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {FILTER_LABELS[ft]}
              <span className="ml-1 opacity-60">{categoryCounts[ft]}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {filtered.length === 0 && !error && (
        <EmptyState
          icon={FileText}
          message={search || filterType !== "all" ? "No items match your filters." : "No documents or files yet."}
        />
      )}

      {filtered.length > 0 && viewMode === "list" && (
        <div className="rounded-xl border border-border divide-y divide-border/60 overflow-hidden">
          {filtered.map((item) => {
            const id = item.kind === "document" ? item.data.id : item.data.id;
            return (
              <button
                key={`${item.kind}-${id}`}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/50 transition-colors"
              >
                {renderItemIcon(item)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {renderItemName(item)}
                    </span>
                    {item.kind === "document" && item.data.issueIdentifier && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {item.data.issueIdentifier}
                      </span>
                    )}
                    {item.kind === "asset" && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {item.data.contentType.split("/").pop()}
                      </span>
                    )}
                    {item.kind === "workspace-file" && (
                      <>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {item.data.contentType.split("/").pop()}
                        </span>
                        <span className="shrink-0 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-600 dark:text-cyan-400">
                          {item.data.agentName}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {renderItemSubtext(item)}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((item) => {
            const id = item.kind === "document" ? item.data.id : item.data.id;
            return (
              <button
                key={`${item.kind}-${id}`}
                onClick={() => handleItemClick(item)}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-4 text-center hover:bg-accent/50 hover:border-border transition-colors"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted group-hover:bg-muted/80 transition-colors overflow-hidden">
                  {renderItemGridIcon(item)}
                </div>
                <div className="w-full min-w-0">
                  <p className="text-xs font-medium truncate">
                    {renderItemName(item)}
                  </p>
                  {item.kind === "document" && item.data.issueIdentifier && (
                    <p className="mt-1">
                      <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {item.data.issueIdentifier}
                      </span>
                    </p>
                  )}
                  {item.kind === "asset" && (
                    <p className="mt-1">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {formatBytes(item.data.byteSize)}
                      </span>
                    </p>
                  )}
                  {item.kind === "workspace-file" && (
                    <p className="mt-1">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {formatBytes(item.data.byteSize)}
                      </span>
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {item.kind === "document"
                      ? timeAgo(item.data.updatedAt)
                      : item.kind === "asset"
                        ? timeAgo(item.data.createdAt)
                        : timeAgo(item.data.modifiedAt)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedDoc && (
        <DocumentViewer
          doc={selectedDoc}
          companyId={selectedCompanyId}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {selectedAsset && (
        <AssetViewer
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  );
}
