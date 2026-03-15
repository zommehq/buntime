import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge.tsx";
import { Button } from "~/components/ui/button.tsx";
import { ScrollArea } from "~/components/ui/scroll-area.tsx";
import { Separator } from "~/components/ui/separator.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs.tsx";
import { useParameterAuditLog } from "~/routes/vault/-hooks/use-audit-log.ts";
import { useRevealParameter } from "~/routes/vault/-hooks/use-reveal-parameter.ts";
import { useParameterVersions } from "~/routes/vault/-hooks/use-versions.ts";
import type { Parameter } from "~/routes/vault/-types.ts";
import { ParamType } from "~/routes/vault/-types.ts";
import CalendarIcon from "~icons/lucide/calendar";
import CopyIcon from "~icons/lucide/copy";
import EyeIcon from "~icons/lucide/eye";
import EyeOffIcon from "~icons/lucide/eye-off";
import HistoryIcon from "~icons/lucide/history";
import KeyRoundIcon from "~icons/lucide/key-round";
import RefreshCwIcon from "~icons/lucide/refresh-cw";
import Trash2Icon from "~icons/lucide/trash-2";
import XIcon from "~icons/lucide/x";
import { ActivityTimeline } from "./activity-timeline.tsx";
import { VersionHistory } from "./version-history.tsx";

export function ParamDetailSheet({
  parameter,
  open,
  onOpenChange,
  onDelete,
  onEdit,
  onRotate,
}: {
  parameter: Parameter | null;
  open: boolean;
  onDelete?: (param: Parameter) => void;
  onEdit?: (param: Parameter) => void;
  onOpenChange: (open: boolean) => void;
  onRotate?: (param: Parameter) => void;
}) {
  const navigate = useNavigate();
  const isSecret = parameter?.type === ParamType.SECRET;
  const auditLog$ = useParameterAuditLog(isSecret ? parameter?.id : undefined);
  const versions$ = useParameterVersions(isSecret ? parameter?.id : undefined);
  const reveal$ = useRevealParameter();

  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);

  // Auto-hide revealed value after 10 seconds
  useEffect(() => {
    if (isRevealed && revealedValue !== null) {
      const timer = setTimeout(() => {
        setIsRevealed(false);
        setRevealedValue(null);
      }, 10_000);
      return () => clearTimeout(timer);
    }
  }, [isRevealed, revealedValue]);

  // Reset reveal state when switching parameters
  useEffect(() => {
    setIsRevealed(false);
    setRevealedValue(null);
  }, [parameter?.id]);

  const handleReveal = useCallback(() => {
    if (!parameter) return;
    if (isRevealed) {
      setIsRevealed(false);
      setRevealedValue(null);
    } else {
      reveal$.mutate(parameter.id, {
        onSuccess: (value) => {
          setRevealedValue(value);
          setIsRevealed(true);
        },
      });
    }
  }, [parameter, isRevealed, reveal$]);

  const handleCopy = useCallback(async () => {
    if (!parameter) return;
    if (revealedValue) {
      await navigator.clipboard.writeText(revealedValue);
      toast.success("Value copied to clipboard");
    }
  }, [parameter, revealedValue]);

  if (!parameter) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[540px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="font-mono text-lg">{parameter.key}</SheetTitle>
              <Badge
                variant="outline"
                className={
                  isSecret
                    ? "border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                    : ""
                }
              >
                {parameter.type}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onOpenChange(false)}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Separator />

        {/* Metadata */}
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider">
                Description
              </span>
              <p className="mt-0.5">{parameter.description}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Type</span>
              <p className="mt-0.5">{parameter.type}</p>
            </div>
          </div>

          {isSecret && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  Status
                </span>
                <p className="mt-0.5 flex items-center gap-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      parameter.status === "expired"
                        ? "bg-red-500"
                        : parameter.status === "expiring_soon"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                  />
                  {parameter.status === "expired"
                    ? "Expired"
                    : parameter.status === "expiring_soon"
                      ? "Expiring Soon"
                      : "Active"}
                </p>
              </div>
              {parameter.expiresAt && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Expires
                  </span>
                  <p className="mt-0.5 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                    {new Date(parameter.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {parameter.rotationIntervalDays && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Rotation
                  </span>
                  <p className="mt-0.5 flex items-center gap-1">
                    <RefreshCwIcon className="h-3 w-3 text-muted-foreground" />
                    Every {parameter.rotationIntervalDays} days
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Value area */}
          {parameter.type !== ParamType.GROUP && (
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider">
                {isSecret ? "Current Value" : "Value"}
              </span>
              <div className="mt-1 flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                {isSecret && <KeyRoundIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className="flex-1 font-mono text-sm truncate">
                  {isSecret
                    ? isRevealed && revealedValue
                      ? revealedValue
                      : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                    : String(parameter.value ?? "")}
                </span>
                {isSecret && (
                  <>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleCopy}
                      disabled={!revealedValue}
                      title="Copy"
                    >
                      <CopyIcon className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="px-6 py-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onEdit?.(parameter);
              onOpenChange(false);
            }}
          >
            Edit
          </Button>
          {isSecret && (
            <Button
              variant="outline"
              size="sm"
              className="text-purple-600 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:hover:bg-purple-900/40"
              onClick={() => {
                onRotate?.(parameter);
              }}
            >
              <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />
              Rotate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 ml-auto"
            onClick={() => {
              onDelete?.(parameter);
              onOpenChange(false);
            }}
          >
            <Trash2Icon className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        </div>

        <Separator />

        {/* Tabs area — only for SECRET */}
        {isSecret && (
          <Tabs defaultValue="activity" className="flex-1 flex flex-col min-h-0">
            <div className="px-6">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="versions">Versions</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="activity" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full px-6 py-4">
                <ActivityTimeline
                  entries={auditLog$.data?.entries ?? []}
                  isLoading={auditLog$.isLoading}
                />
                {(auditLog$.data?.total ?? 0) > (auditLog$.data?.entries.length ?? 0) && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => {
                        onOpenChange(false);
                        navigate({ to: "/vault/audit-log" });
                      }}
                    >
                      <HistoryIcon className="h-3 w-3 mr-1" />
                      View Full Audit History
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="versions" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <VersionHistory
                  versions={versions$.data?.versions ?? []}
                  isLoading={versions$.isLoading}
                  parameterId={parameter.id}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
