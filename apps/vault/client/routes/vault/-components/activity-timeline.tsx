import type { SVGProps } from "react";
import type { AuditLogEntry } from "~/routes/vault/-hooks/use-audit-log.ts";
import EyeIcon from "~icons/lucide/eye";
import Loader2Icon from "~icons/lucide/loader-2";
import PencilIcon from "~icons/lucide/pencil";
import PlusIcon from "~icons/lucide/plus";
import RefreshCwIcon from "~icons/lucide/refresh-cw";
import Trash2Icon from "~icons/lucide/trash-2";

type IconComponent = React.ForwardRefExoticComponent<SVGProps<SVGSVGElement> & { title?: string }>;

const actionConfig: Record<
  string,
  { icon: IconComponent; color: string; bg: string; label: string }
> = {
  created: {
    icon: PlusIcon,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Created",
  },
  updated: {
    icon: PencilIcon,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Updated",
  },
  revealed: {
    icon: EyeIcon,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Revealed",
  },
  rotated: {
    icon: RefreshCwIcon,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Rotated",
  },
  deleted: {
    icon: Trash2Icon,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Deleted",
  },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}

export function ActivityTimeline({
  entries,
  isLoading,
}: {
  entries: AuditLogEntry[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading activity...</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-sm text-muted-foreground">No activity recorded yet</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {entries.map((entry, index) => {
        const config = actionConfig[entry.action] ?? actionConfig.updated;
        const Icon = config.icon;
        const isLast = index === entries.length - 1;

        return (
          <div key={entry.auditLogId} className="relative flex gap-3 pb-4">
            {/* Vertical line */}
            {!isLast && (
              <span
                className="absolute left-[15px] top-8 bottom-0 w-px bg-border"
                aria-hidden="true"
              />
            )}

            {/* Icon circle */}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${config.bg}`}
            >
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm">
                <span className="font-medium">{config.label}</span>
                {entry.actorEmail && (
                  <>
                    {" "}
                    <span className="text-muted-foreground">by</span>{" "}
                    <span className="text-muted-foreground font-mono text-xs">
                      {entry.actorEmail}
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatRelativeTime(entry.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
