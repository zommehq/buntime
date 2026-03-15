import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog.tsx";
import { Badge } from "~/components/ui/badge.tsx";
import { Button } from "~/components/ui/button.tsx";
import { useRevealParameter } from "~/routes/vault/-hooks/use-reveal-parameter.ts";
import {
  type ParameterVersionEntry,
  useRollbackVersion,
} from "~/routes/vault/-hooks/use-versions.ts";
import EyeIcon from "~icons/lucide/eye";
import EyeOffIcon from "~icons/lucide/eye-off";
import HistoryIcon from "~icons/lucide/history";
import Loader2Icon from "~icons/lucide/loader-2";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function VersionRow({
  entry,
  isCurrent,
  parameterId,
}: {
  entry: ParameterVersionEntry;
  isCurrent: boolean;
  parameterId: string;
}) {
  const rollback$ = useRollbackVersion();
  const reveal$ = useRevealParameter();
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);

  // Auto-hide after 10s
  useEffect(() => {
    if (isRevealed && revealedValue !== null) {
      const timer = setTimeout(() => {
        setIsRevealed(false);
        setRevealedValue(null);
      }, 10_000);
      return () => clearTimeout(timer);
    }
  }, [isRevealed, revealedValue]);

  const handleReveal = useCallback(() => {
    if (isRevealed) {
      setIsRevealed(false);
      setRevealedValue(null);
    } else {
      // Note: we reveal the current parameter value, not a specific version
      // For per-version reveal we'd need a different endpoint
      reveal$.mutate(parameterId, {
        onSuccess: (value) => {
          setRevealedValue(value);
          setIsRevealed(true);
        },
      });
    }
  }, [isRevealed, reveal$, parameterId]);

  const handleRollback = useCallback(() => {
    rollback$.mutate(
      {
        parameterId,
        versionId: String(entry.versionId),
      },
      {
        onSuccess: () => setRollbackDialogOpen(false),
      },
    );
  }, [rollback$, parameterId, entry.versionId]);

  return (
    <>
      <div
        className={`flex items-center gap-4 px-4 py-3 border-b border-border/50 ${
          isCurrent ? "bg-primary/5" : "hover:bg-muted/30"
        }`}
      >
        {/* Version */}
        <div className="w-20 shrink-0 flex items-center gap-2">
          <span className="font-mono text-sm">v{entry.version}</span>
          {isCurrent && (
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              Current
            </Badge>
          )}
        </div>

        {/* Date */}
        <div className="w-44 shrink-0 text-xs text-muted-foreground">
          {formatDate(entry.createdAt)}
        </div>

        {/* Created by */}
        <div className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
          {entry.createdBy ? (
            <span className="font-mono">{entry.createdBy}</span>
          ) : (
            <span className="italic">unknown</span>
          )}
        </div>

        {/* Value preview */}
        <div className="w-32 shrink-0 font-mono text-xs text-muted-foreground truncate">
          {isRevealed && revealedValue
            ? revealedValue
            : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isCurrent ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleReveal}
              disabled={reveal$.isPending}
              title={isRevealed ? "Hide" : "Reveal"}
            >
              {isRevealed ? (
                <EyeOffIcon className="h-3.5 w-3.5" />
              ) : (
                <EyeIcon className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20"
              onClick={() => setRollbackDialogOpen(true)}
              disabled={rollback$.isPending}
              title="Rollback to this version"
            >
              <HistoryIcon className="h-3 w-3 mr-1" />
              {rollback$.isPending ? "..." : "Rollback"}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback to version {entry.version}</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new version with the value from v{entry.version}. The current value
              will be preserved in version history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollback$.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback} disabled={rollback$.isPending}>
              {rollback$.isPending ? "Rolling back..." : "Confirm Rollback"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function VersionHistory({
  versions,
  isLoading,
  parameterId,
}: {
  versions: ParameterVersionEntry[];
  isLoading?: boolean;
  parameterId: string;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading versions...</span>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-sm text-muted-foreground">No version history</span>
      </div>
    );
  }

  const maxVersion = Math.max(...versions.map((v) => v.version));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30">
        <div className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">Version</div>
        <div className="w-44 shrink-0 text-xs font-semibold text-muted-foreground">Created At</div>
        <div className="flex-1 text-xs font-semibold text-muted-foreground">Created By</div>
        <div className="w-32 shrink-0 text-xs font-semibold text-muted-foreground">Value</div>
        <div className="w-24 shrink-0 text-xs font-semibold text-muted-foreground text-right">
          Actions
        </div>
      </div>

      {/* Rows */}
      {versions.map((entry) => (
        <VersionRow
          key={entry.versionId}
          entry={entry}
          isCurrent={entry.version === maxVersion}
          parameterId={parameterId}
        />
      ))}

      {/* Footer */}
      <div className="px-4 py-2 text-xs text-muted-foreground">
        Showing {versions.length} of {versions.length} versions
      </div>
    </div>
  );
}
