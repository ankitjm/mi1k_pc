/**
 * AI Rewrite Button
 *
 * Reusable component that rewrites text using AI.
 * Place next to any text input/textarea. Pass the current text and
 * an onAccept callback to replace it with the rewritten version.
 */
import { useState } from "react";
import { Sparkles, Check, X, Loader2, RotateCcw } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { aiRewriteApi } from "../api/aiRewrite";
import { cn } from "../lib/utils";

interface AiRewriteButtonProps {
  text: string;
  onAccept: (rewritten: string) => void;
  context?: string;
  className?: string;
  size?: "sm" | "md";
}

export function AiRewriteButton({ text, onAccept, context, className, size = "sm" }: AiRewriteButtonProps) {
  const { selectedCompanyId } = useCompany();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRewrite() {
    if (!selectedCompanyId || !text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await aiRewriteApi.rewrite(selectedCompanyId, text, context);
      setResult(data.rewritten);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setLoading(false);
    }
  }

  function handleAccept() {
    if (result) {
      onAccept(result);
      setResult(null);
    }
  }

  function handleDismiss() {
    setResult(null);
    setError(null);
  }

  const isSmall = size === "sm";

  // Show the rewrite trigger button
  if (!result && !error) {
    return (
      <button
        type="button"
        onClick={handleRewrite}
        disabled={loading || !text.trim()}
        className={cn(
          "inline-flex items-center gap-1 rounded-md transition-colors",
          isSmall
            ? "px-1.5 py-0.5 text-[10px] text-muted-foreground/60 hover:text-foreground hover:bg-accent/50"
            : "px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border",
          loading && "opacity-50 cursor-wait",
          !text.trim() && "opacity-30 cursor-not-allowed",
          className,
        )}
        title="Rewrite with AI"
      >
        {loading ? (
          <Loader2 className={cn("animate-spin", isSmall ? "h-2.5 w-2.5" : "h-3 w-3")} />
        ) : (
          <Sparkles className={cn(isSmall ? "h-2.5 w-2.5" : "h-3 w-3")} />
        )}
        {loading ? "Rewriting..." : "Rewrite"}
      </button>
    );
  }

  // Show the result with accept/reject
  if (result) {
    return (
      <div className="rounded-md border border-border bg-accent/20 p-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">AI Suggestion</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleAccept}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <Check className="h-2.5 w-2.5" /> Accept
            </button>
            <button
              type="button"
              onClick={handleRewrite}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Retry
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-2.5 w-2.5" /> Dismiss
            </button>
          </div>
        </div>
        <p className="text-xs leading-relaxed whitespace-pre-wrap">{result}</p>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive">
        <span>{error}</span>
        <button type="button" onClick={handleDismiss} className="underline text-muted-foreground">
          dismiss
        </button>
      </div>
    );
  }

  return null;
}
