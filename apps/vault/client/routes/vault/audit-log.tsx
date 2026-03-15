import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "~/components/ui/badge.tsx";
import { Button } from "~/components/ui/button.tsx";
import { Input } from "~/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select.tsx";
import ChevronLeftIcon from "~icons/lucide/chevron-left";
import ChevronRightIcon from "~icons/lucide/chevron-right";
import Loader2Icon from "~icons/lucide/loader-2";
import RefreshCwIcon from "~icons/lucide/refresh-cw";
import SearchIcon from "~icons/lucide/search";
import type { AuditLogEntry } from "./-hooks/use-audit-log.ts";
import { useGlobalAuditLog } from "./-hooks/use-global-audit-log.ts";

const PAGE_SIZE = 25;

const actionBadgeStyles: Record<string, string> = {
  created:
    "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  deleted:
    "border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400",
  revealed:
    "border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  rotated:
    "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  updated:
    "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function ActionBadge({ action }: { action: string }) {
  const style = actionBadgeStyles[action] ?? actionBadgeStyles.updated;
  return (
    <Badge variant="outline" className={`text-xs capitalize ${style}`}>
      {action}
    </Badge>
  );
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors text-sm">
      <div className="col-span-3 font-mono text-xs text-muted-foreground">
        {formatTimestamp(entry.createdAt)}
      </div>
      <div className="col-span-2">
        <ActionBadge action={entry.action} />
      </div>
      <div className="col-span-3 font-mono text-xs truncate" title={entry.parameterKey}>
        {entry.parameterKey}
      </div>
      <div className="col-span-3 text-xs text-muted-foreground truncate">
        {entry.actorEmail ? (
          <span className="font-mono">{entry.actorEmail}</span>
        ) : (
          <span className="italic">system</span>
        )}
      </div>
      <div className="col-span-1 text-xs text-muted-foreground font-mono truncate">
        {entry.ipAddress ?? "--"}
      </div>
    </div>
  );
}

function AuditLogPage() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [actorSearch, setActorSearch] = useState("");
  const [keySearch, setKeySearch] = useState("");

  const auditLog$ = useGlobalAuditLog({
    action: actionFilter || undefined,
    actorEmail: actorSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    parameterKey: keySearch || undefined,
  });

  const totalPages = Math.ceil((auditLog$.data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audit Log</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track all secret operations across your vault
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => auditLog$.refetch()}
            disabled={auditLog$.isFetching}
          >
            <RefreshCwIcon
              className={`h-4 w-4 mr-1.5 ${auditLog$.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b px-6 py-3">
        <div className="grid grid-cols-4 gap-3">
          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v === "all" ? "" : v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="revealed">Revealed</SelectItem>
              <SelectItem value="rotated">Rotated</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Search by actor..."
              value={actorSearch}
              onChange={(e) => {
                setActorSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Search by key..."
              value={keySearch}
              onChange={(e) => {
                setKeySearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div />
        </div>
      </div>

      {/* Table header */}
      <div className="px-4 py-2 bg-muted/30 border-b">
        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-3">Timestamp</div>
          <div className="col-span-2">Action</div>
          <div className="col-span-3">Secret Key</div>
          <div className="col-span-3">Actor</div>
          <div className="col-span-1">IP</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {auditLog$.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading audit log...</span>
          </div>
        ) : auditLog$.error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center text-destructive">
              <p>Error loading audit log</p>
              <p className="text-sm text-muted-foreground">{auditLog$.error.message}</p>
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                onClick={() => auditLog$.refetch()}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : (auditLog$.data?.entries.length ?? 0) === 0 ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-sm text-muted-foreground">No audit log entries found</span>
          </div>
        ) : (
          auditLog$.data?.entries.map((entry) => (
            <AuditLogRow key={entry.auditLogId} entry={entry} />
          ))
        )}
      </div>

      {/* Pagination footer */}
      {(auditLog$.data?.total ?? 0) > 0 && (
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}-
            {Math.min((page + 1) * PAGE_SIZE, auditLog$.data?.total ?? 0)} of{" "}
            {auditLog$.data?.total ?? 0} entries
          </span>
          <div className="flex items-center gap-1">
            <Button
              disabled={page === 0}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum =
                totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={pageNum === page ? "default" : "ghost"}
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              disabled={page >= totalPages - 1}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/vault/audit-log")({
  component: AuditLogPage,
});
