import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button.tsx";
import { Input } from "~/components/ui/input.tsx";
import { useRevealParameter } from "~/routes/vault/-hooks/use-reveal-parameter.ts";
import type { Parameter } from "~/routes/vault/-types.ts";
import { ParamType } from "~/routes/vault/-types.ts";
import ChevronRightIcon from "~icons/lucide/chevron-right";
import Edit2Icon from "~icons/lucide/edit-2";
import EyeIcon from "~icons/lucide/eye";
import EyeOffIcon from "~icons/lucide/eye-off";
import FolderTreeIcon from "~icons/lucide/folder-tree";
import KeyRoundIcon from "~icons/lucide/key-round";
import ListPlusIcon from "~icons/lucide/list-plus";
import Loader2Icon from "~icons/lucide/loader-2";
import PlusIcon from "~icons/lucide/plus";
import SearchIcon from "~icons/lucide/search";
import Trash2Icon from "~icons/lucide/trash-2";

const typeStyles = {
  [ParamType.BOOLEAN]: { abbr: "bool", color: "bg-blue-200", icon: null },
  [ParamType.CODE]: { abbr: "code", color: "bg-gray-300", icon: null },
  [ParamType.GROUP]: { abbr: "grp", color: "bg-amber-100", icon: ListPlusIcon },
  [ParamType.JSON]: { abbr: "json", color: "bg-rose-200", icon: null },
  [ParamType.NUMBER]: { abbr: "num", color: "bg-teal-200", icon: null },
  [ParamType.SECRET]: { abbr: "sec", color: "bg-purple-200", icon: KeyRoundIcon },
  [ParamType.STRING]: { abbr: "str", color: "bg-amber-200", icon: null },
};

const TypeBadge = ({ type }: { type: ParamType }) => {
  const style = typeStyles[type] || typeStyles[ParamType.STRING];
  const IconComponent = style.icon;

  return (
    <div className="flex items-center space-x-1">
      {IconComponent && <IconComponent className="h-3 w-3 text-muted-foreground" />}
      <div
        className={`font-semibold px-1 py-0.5 rounded text-xs text-center min-w-[2rem] text-black ${style.color}`}
      >
        {style.abbr.toUpperCase()}
      </div>
    </div>
  );
};

const Breadcrumb = ({ items }: { items: Array<{ title: React.ReactNode }> }) => (
  <div className="flex items-center space-x-2 px-4 py-3 bg-muted/30 border-b">
    {items.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm">{item.title}</span>
      </React.Fragment>
    ))}
  </div>
);

const StatusIndicator = ({ status }: { status?: string }) => {
  if (!status) return null;

  const config: Record<string, { dot: string; label: string; text: string }> = {
    active: {
      dot: "bg-emerald-500",
      label: "Active",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    expiring_soon: {
      dot: "bg-amber-500",
      label: "Expiring",
      text: "text-amber-600 dark:text-amber-400",
    },
    expired: { dot: "bg-red-500", label: "Expired", text: "text-red-600 dark:text-red-400" },
  };

  const c = config[status] ?? config.active;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

const SecretValue = ({ parameterId }: { parameterId: string }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const reveal$ = useRevealParameter();

  useEffect(() => {
    if (isRevealed && revealedValue !== null) {
      const timer = setTimeout(() => {
        setIsRevealed(false);
        setRevealedValue(null);
      }, 10_000);
      return () => clearTimeout(timer);
    }
  }, [isRevealed, revealedValue]);

  const handleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRevealed) {
      setIsRevealed(false);
      setRevealedValue(null);
    } else {
      reveal$.mutate(parameterId, {
        onSuccess: (value) => {
          setRevealedValue(value);
          setIsRevealed(true);
        },
      });
    }
  };

  return (
    <span className="flex items-center gap-1">
      <span className="font-mono text-muted-foreground">
        {isRevealed && revealedValue !== null
          ? revealedValue
          : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-5 w-5 p-0"
        onClick={handleReveal}
        title={isRevealed ? "Hide secret" : "Reveal secret"}
        disabled={reveal$.isPending}
      >
        {isRevealed ? <EyeOffIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
      </Button>
    </span>
  );
};

function filterTree(parameters: Parameter[], query: string): Parameter[] {
  if (!query.trim()) return parameters;

  const lowerQuery = query.toLowerCase();

  function matches(param: Parameter): boolean {
    return (
      param.key.toLowerCase().includes(lowerQuery) ||
      (param.description ?? "").toLowerCase().includes(lowerQuery)
    );
  }

  function filterNode(param: Parameter): Parameter | null {
    if (param.type === ParamType.GROUP && param.children?.length) {
      const filteredChildren = param.children
        .map(filterNode)
        .filter((c): c is Parameter => c !== null);
      if (filteredChildren.length > 0 || matches(param)) {
        return { ...param, children: filteredChildren };
      }
      return null;
    }
    return matches(param) ? param : null;
  }

  return parameters.map(filterNode).filter((p): p is Parameter => p !== null);
}

const TableRow = ({
  parameter,
  level = 0,
  isLast = false,
  selectedId,
  expandedKeys,
  onToggleExpand,
  onAdd,
  onEdit,
  onRemove,
  onSelect,
}: {
  parameter: Parameter;
  level?: number;
  isLast?: boolean;
  selectedId?: string;
  expandedKeys: Set<string>;
  onToggleExpand: (id: string) => void;
  onAdd?: (param: Parameter) => void;
  onEdit?: (param: Parameter) => void;
  onRemove?: (param: Parameter) => void;
  onSelect?: (param: Parameter) => void;
}) => {
  const hasChildren = parameter.children && parameter.children.length > 0;
  const isExpanded = expandedKeys.has(parameter.id);
  const isSelected = selectedId === parameter.id;

  const paddingLeft = level * 24;

  const handleRowClick = () => onSelect?.(parameter);
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(parameter.id);
  };
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd?.(parameter);
  };
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(parameter);
  };
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(parameter);
  };

  return (
    <>
      <div
        className={`group flex items-center py-2 hover:bg-muted/50 transition-colors cursor-pointer border-l-2 ${
          isSelected ? "bg-muted border-l-primary" : "border-l-transparent"
        } border-b border-border/50`}
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
        onClick={handleRowClick}
      >
        {/* Tree connector lines */}
        {level > 0 && (
          <div className="relative" style={{ width: 0, height: "100%" }}>
            <span
              className="absolute bg-border"
              style={{
                height: 1,
                width: 12,
                top: "50%",
                left: -12,
              }}
            />
            <span
              className="absolute bg-border"
              style={{
                width: 1,
                top: -8,
                bottom: isLast ? "50%" : -8,
                left: -12,
              }}
            />
          </div>
        )}

        <div className="flex items-center mr-2 w-6">
          {hasChildren ? (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleExpandClick}>
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            </Button>
          ) : (
            <div className="w-6" />
          )}
        </div>

        <div className="grid grid-cols-12 gap-4 items-center flex-1">
          <div className="col-span-5 flex items-center space-x-2 overflow-hidden">
            <TypeBadge type={parameter.type} />
            <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {parameter.key}
            </div>
          </div>
          <div
            className="col-span-3 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground"
            title={parameter.description}
          >
            {parameter.description}
          </div>
          <div
            className="col-span-3 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground"
            title={
              parameter.type === ParamType.SECRET ? "Secret value" : String(parameter.value || "")
            }
          >
            {parameter.type === ParamType.SECRET ? (
              <span className="flex items-center gap-2">
                <SecretValue parameterId={parameter.id} />
                <StatusIndicator status={parameter.status} />
              </span>
            ) : parameter.value !== undefined && parameter.value !== null ? (
              String(parameter.value)
            ) : (
              ""
            )}
          </div>
          <div className="col-span-1 flex justify-end">
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {parameter.type === ParamType.GROUP && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handleAdd}
                  title={`Add parameter to ${parameter.key}`}
                >
                  <PlusIcon className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleEdit}
                title="Edit parameter"
              >
                <Edit2Icon className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleRemove}
                title={`Remove ${parameter.key}`}
              >
                <Trash2Icon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {parameter.children!.map((child, index) => (
            <TableRow
              key={child.id}
              parameter={child}
              level={level + 1}
              isLast={index === parameter.children!.length - 1}
              selectedId={selectedId}
              expandedKeys={expandedKeys}
              onToggleExpand={onToggleExpand}
              onAdd={onAdd}
              onEdit={onEdit}
              onRemove={onRemove}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </>
  );
};

export interface TreeTableProps {
  activeGroup?: { id: string; description: string };
  parameters: Parameter[];
  isLoading?: boolean;
  error?: Error | null;
  onAdd?: (param: Parameter) => void;
  onEdit?: (param: Parameter) => void;
  onRemove?: (param: Parameter) => void;
  onRefetch?: () => void;
  onSelect?: (param: Parameter) => void;
}

export function TreeTable({
  activeGroup,
  parameters = [],
  isLoading = false,
  error = null,
  onAdd,
  onEdit,
  onRefetch,
  onRemove,
  onSelect,
}: TreeTableProps) {
  const [selectedParameter, setSelectedParameter] = useState<Parameter | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const breadcrumb = useMemo(() => {
    const res: Array<{ title: React.ReactNode }> = [];
    if (!activeGroup) return res;
    res.push({
      title: (
        <span className="flex items-center space-x-2">
          <FolderTreeIcon className="h-4 w-4" />
          <span className="font-semibold">Path:</span>
          <span>{activeGroup.description}</span>
        </span>
      ),
    });
    return res;
  }, [activeGroup]);

  const filteredParameters = useMemo(
    () => filterTree(parameters, searchQuery),
    [parameters, searchQuery],
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  if (isLoading) {
    return (
      <main className="flex flex-col flex-1 overflow-hidden p-6">
        <Breadcrumb items={breadcrumb} />
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center space-x-2">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            <span>Loading parameters...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col flex-1 overflow-hidden p-6">
        <Breadcrumb items={breadcrumb} />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="text-destructive mb-2">
              <span>Error loading parameters</span>
              <div className="text-sm text-muted-foreground">{error.message}</div>
            </div>
            <Button onClick={onRefetch} variant="outline" size="sm">
              Try again
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-col flex-1 overflow-hidden p-6">
        <Breadcrumb items={breadcrumb} />

        {/* Search bar */}
        <div className="px-4 py-2 border-b">
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm"
              placeholder="Search parameters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="px-4 py-2 bg-muted/30 border-b">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground">
            <div className="col-span-5 pl-8">Attribute</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-3">Value</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredParameters.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="text-muted-foreground text-center">
                <p>{searchQuery ? "No matching parameters" : "No parameters found"}</p>
                {activeGroup && !searchQuery && (
                  <p className="text-sm mt-2">Group: {activeGroup.description}</p>
                )}
              </div>
            </div>
          ) : (
            filteredParameters.map((parameter, index) => (
              <TableRow
                key={parameter.id}
                parameter={parameter}
                level={0}
                isLast={index === filteredParameters.length - 1}
                selectedId={selectedParameter?.id}
                expandedKeys={expandedKeys}
                onToggleExpand={handleToggleExpand}
                onAdd={onAdd}
                onEdit={onEdit}
                onRemove={onRemove}
                onSelect={(param) => {
                  setSelectedParameter(param);
                  onSelect?.(param);
                }}
              />
            ))
          )}
        </div>

        {/* Footer with count */}
        {filteredParameters.length > 0 && (
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">
            Showing {filteredParameters.length} of {parameters.length} items
          </div>
        )}
      </main>
    </>
  );
}
