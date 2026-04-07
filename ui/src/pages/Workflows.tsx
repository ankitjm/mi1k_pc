/**
 * @fileoverview User-facing Workflows / Plugin Marketplace page.
 *
 * Unlike the admin-only PluginManager (instance/settings/plugins), this page
 * lives inside the company-prefixed routes and presents plugins as
 * installable "workflows" that non-admin users can browse and enable.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PluginRecord } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import {
  Check,
  Download,
  ExternalLink,
  Filter,
  MessageCircle,
  Puzzle,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { pluginsApi } from "@/api/plugins";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Category metadata                                                  */
/* ------------------------------------------------------------------ */

const CATEGORY_META: Record<string, { label: string; icon: typeof Puzzle; color: string }> = {
  connector: { label: "Connectors", icon: MessageCircle, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  automation: { label: "Automation", icon: Zap, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  ui: { label: "UI", icon: Sparkles, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  workspace: { label: "Workspace", icon: Puzzle, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

const ALL_CATEGORIES = ["all", "connector", "automation", "ui", "workspace"] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pluginCategories(plugin: PluginRecord): string[] {
  const manifest = plugin.manifestJson as { categories?: string[] };
  return manifest?.categories ?? [];
}

function matchesCategory(plugin: PluginRecord, category: string): boolean {
  if (category === "all") return true;
  return pluginCategories(plugin).includes(category);
}

function matchesSearch(plugin: PluginRecord, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const name = (plugin.manifestJson.displayName ?? plugin.packageName).toLowerCase();
  const desc = (plugin.manifestJson.description ?? "").toLowerCase();
  return name.includes(q) || desc.includes(q);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Workflows() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Workflows" },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs]);

  /* ---- Queries ---- */

  const { data: plugins, isLoading } = useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: () => pluginsApi.list(),
  });

  const examplesQuery = useQuery({
    queryKey: queryKeys.plugins.examples,
    queryFn: () => pluginsApi.listExamples(),
  });

  /* ---- Mutations ---- */

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.plugins.examples });
    queryClient.invalidateQueries({ queryKey: queryKeys.plugins.uiContributions });
  };

  const installMutation = useMutation({
    mutationFn: (params: { packageName: string; version?: string; isLocalPath?: boolean }) =>
      pluginsApi.install(params),
    onSuccess: () => {
      invalidate();
      pushToast({ title: "Workflow installed", tone: "success" });
    },
    onError: (err: Error) => {
      pushToast({ title: "Install failed", body: err.message, tone: "error" });
    },
  });

  const enableMutation = useMutation({
    mutationFn: (pluginId: string) => pluginsApi.enable(pluginId),
    onSuccess: () => {
      invalidate();
      pushToast({ title: "Workflow enabled", tone: "success" });
    },
    onError: (err: Error) => {
      pushToast({ title: "Failed to enable", body: err.message, tone: "error" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (pluginId: string) => pluginsApi.disable(pluginId),
    onSuccess: () => {
      invalidate();
      pushToast({ title: "Workflow disabled", tone: "info" });
    },
    onError: (err: Error) => {
      pushToast({ title: "Failed to disable", body: err.message, tone: "error" });
    },
  });

  /* ---- Derived data ---- */

  const installedPlugins = plugins ?? [];
  const examples = examplesQuery.data ?? [];
  const installedByPackage = new Map(installedPlugins.map((p) => [p.packageName, p]));

  // Merge examples (not yet installed) with installed plugins into a unified list
  const allWorkflows = useMemo(() => {
    const items: Array<{
      key: string;
      displayName: string;
      description: string;
      categories: string[];
      installed: boolean;
      ready: boolean;
      plugin: PluginRecord | null;
      localPath: string | null;
      packageName: string;
    }> = [];

    // Installed plugins first
    for (const plugin of installedPlugins) {
      items.push({
        key: plugin.id,
        displayName: plugin.manifestJson.displayName ?? plugin.packageName,
        description: plugin.manifestJson.description ?? "",
        categories: pluginCategories(plugin),
        installed: true,
        ready: plugin.status === "ready",
        plugin,
        localPath: null,
        packageName: plugin.packageName,
      });
    }

    // Uninstalled examples
    for (const ex of examples) {
      if (installedByPackage.has(ex.packageName)) continue;
      items.push({
        key: ex.packageName,
        displayName: ex.displayName,
        description: ex.description,
        categories: [],
        installed: false,
        ready: false,
        plugin: null,
        localPath: ex.localPath,
        packageName: ex.packageName,
      });
    }

    return items;
  }, [installedPlugins, examples, installedByPackage]);

  const filtered = allWorkflows.filter(
    (w) =>
      matchesSearch(
        w.plugin ?? ({ manifestJson: { displayName: w.displayName, description: w.description }, packageName: w.packageName } as unknown as PluginRecord),
        search,
      ) &&
      (activeCategory === "all" || w.categories.includes(activeCategory) || (!w.installed && activeCategory === "all")),
  );

  /* ---- Render ---- */

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading workflows...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Workflows
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and install plugins to extend your workspace with new capabilities.
          </p>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground mr-1" />
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {cat === "all" ? "All" : CATEGORY_META[cat]?.label ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Puzzle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">No workflows found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Try a different search term." : "No plugins are available yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((workflow) => (
            <Card
              key={workflow.key}
              className={cn(
                "group relative overflow-hidden transition-shadow hover:shadow-md",
                workflow.ready && "border-green-500/30",
              )}
            >
              <CardContent className="p-5 flex flex-col h-full">
                {/* Top row */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    workflow.installed
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}>
                    <Puzzle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{workflow.displayName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {workflow.description || "No description."}
                    </p>
                  </div>
                </div>

                {/* Categories */}
                {workflow.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {workflow.categories.map((cat) => {
                      const meta = CATEGORY_META[cat];
                      return (
                        <span
                          key={cat}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            meta?.color ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {meta?.label ?? cat}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  {workflow.installed && workflow.plugin ? (
                    <>
                      <Badge
                        variant={workflow.ready ? "default" : "secondary"}
                        className={cn(
                          "text-[10px]",
                          workflow.ready && "bg-green-600 hover:bg-green-700",
                        )}
                      >
                        {workflow.ready ? "Active" : workflow.plugin.status}
                      </Badge>
                      <div className="flex-1" />
                      {workflow.ready ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => disableMutation.mutate(workflow.plugin!.id)}
                          disabled={disableMutation.isPending}
                        >
                          Disable
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => enableMutation.mutate(workflow.plugin!.id)}
                          disabled={enableMutation.isPending}
                        >
                          Enable
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                        <Link to={`/instance/settings/plugins/${workflow.plugin.id}`}>
                          Configure
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary" className="text-[10px]">
                        Available
                      </Badge>
                      <div className="flex-1" />
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() =>
                          installMutation.mutate({
                            packageName: workflow.localPath ?? workflow.packageName,
                            isLocalPath: !!workflow.localPath,
                          })
                        }
                        disabled={installMutation.isPending}
                      >
                        <Download className="h-3 w-3" />
                        {installMutation.isPending ? "Installing..." : "Install"}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
