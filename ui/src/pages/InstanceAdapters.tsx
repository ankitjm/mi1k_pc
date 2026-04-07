import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cable, RefreshCw, ExternalLink, CheckCircle2, AlertTriangle, XCircle, Loader2, ClipboardPaste } from "lucide-react";
import { claudeAuthApi, type ClaudeAuthStatus } from "@/api/claudeAuth";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";

function statusIcon(status: ClaudeAuthStatus["status"]) {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "expiring_soon":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "expired":
    case "not_logged_in":
      return <XCircle className="h-5 w-5 text-destructive" />;
  }
}

function statusLabel(status: ClaudeAuthStatus["status"]) {
  switch (status) {
    case "ok":
      return "Connected";
    case "expiring_soon":
      return "Expiring Soon";
    case "expired":
      return "Expired";
    case "not_logged_in":
      return "Not Connected";
  }
}

function statusColor(status: ClaudeAuthStatus["status"]) {
  switch (status) {
    case "ok":
      return "bg-green-500/10 text-green-700 border-green-500/30";
    case "expiring_soon":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
    case "expired":
    case "not_logged_in":
      return "bg-destructive/10 text-destructive border-destructive/30";
  }
}

export function InstanceAdapters() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Instance Settings" },
      { label: "Adapters" },
    ]);
  }, [setBreadcrumbs]);

  const statusQuery = useQuery({
    queryKey: queryKeys.instance.claudeAuthStatus,
    queryFn: () => claudeAuthApi.getStatus(),
    refetchInterval: loginUrl ? 5_000 : 30_000, // Poll faster during login flow
  });

  // When status becomes "ok" while login URL is showing, clear it
  useEffect(() => {
    if (statusQuery.data?.status === "ok" && loginUrl) {
      setLoginUrl(null);
      setActionMessage({ type: "success", text: "Claude reconnected successfully!" });
    }
  }, [statusQuery.data?.status, loginUrl]);

  const refreshMutation = useMutation({
    mutationFn: () => claudeAuthApi.refresh(),
    onSuccess: async (data) => {
      setActionMessage({ type: "success", text: data.message });
      setLoginUrl(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.claudeAuthStatus });
    },
    onError: (error) => {
      setActionMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Refresh failed.",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: () => claudeAuthApi.login(),
    onSuccess: (data) => {
      setLoginUrl(data.url);
      setAuthCode("");
      setActionMessage(null);
    },
    onError: (error) => {
      setActionMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to start login flow.",
      });
    },
  });

  const submitCodeMutation = useMutation({
    mutationFn: (code: string) => claudeAuthApi.submitCode(code),
    onSuccess: async (data) => {
      setLoginUrl(null);
      setAuthCode("");
      setActionMessage({ type: "success", text: data.message });
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.claudeAuthStatus });
    },
    onError: (error) => {
      setActionMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to submit code.",
      });
    },
  });

  const status = statusQuery.data;
  const needsLogin = status?.status === "expired" || status?.status === "not_logged_in";
  const canRefresh = status?.hasRefreshToken && !needsLogin;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Cable className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Adapters</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage connections to coding agent backends. Keep adapters connected so agents can run tasks.
        </p>
      </div>

      {actionMessage && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            actionMessage.type === "success"
              ? "border-green-500/40 bg-green-500/5 text-green-700"
              : "border-destructive/40 bg-destructive/5 text-destructive",
          )}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Claude Connection Card */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">Claude Code</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Connection to Claude via the local Claude Code CLI. Used by agents that run with the <code className="text-xs bg-muted px-1 py-0.5 rounded">claude_local</code> adapter.
            </p>
          </div>
          {status && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                statusColor(status.status),
              )}
            >
              {statusIcon(status.status)}
              {statusLabel(status.status)}
            </span>
          )}
        </div>

        {statusQuery.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking connection...
          </div>
        )}

        {status && (
          <div className="text-sm text-muted-foreground">
            {status.message}
            {status.expiresAt && status.status === "ok" && (
              <span className="ml-1 text-xs">
                (expires {new Date(status.expiresAt).toLocaleString()})
              </span>
            )}
          </div>
        )}

        {/* Login flow panel */}
        {loginUrl && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
            {/* Step 1: Open sign-in */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Step 1: Open Claude sign-in
              </p>
              <a
                href={loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Sign in with Claude
              </a>
            </div>

            {/* Step 2: Paste code */}
            <div className="space-y-2 border-t border-blue-500/20 pt-4">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Step 2: Paste the code you received
              </p>
              <p className="text-xs text-muted-foreground">
                After authorizing in your browser, you'll see a code. Copy and paste it here.
              </p>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  // Strip URL fragment (#state) if user pasted full callback value
                  const cleaned = authCode.trim().split("#")[0].trim();
                  if (cleaned) submitCodeMutation.mutate(cleaned);
                }}
              >
                <input
                  ref={codeInputRef}
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste authorization code here..."
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!authCode.trim() || submitCodeMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardPaste className="h-4 w-4" />
                  )}
                  Submit
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          {canRefresh && (
            <button
              type="button"
              disabled={refreshMutation.isPending}
              onClick={() => {
                setActionMessage(null);
                refreshMutation.mutate();
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", refreshMutation.isPending && "animate-spin")} />
              Refresh Token
            </button>
          )}
          <button
            type="button"
            disabled={loginMutation.isPending}
            onClick={() => {
              setActionMessage(null);
              loginMutation.mutate();
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
              needsLogin
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border border-border bg-background hover:bg-accent",
            )}
          >
            {loginMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {needsLogin ? "Reconnect Claude" : "Re-authenticate"}
          </button>
        </div>
      </section>
    </div>
  );
}
