import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { useQueryState } from "~/hooks/use-query-state.ts";
import { AddButton } from "./-components/add-button.tsx";
import { GroupSelect } from "./-components/group-select.tsx";
import { ParamDetailSheet } from "./-components/param-detail-sheet.tsx";
import { ParameterForm } from "./-components/param-form.tsx";
import { TreeTable } from "./-components/tree-table.tsx";
import { useDeleteParameter } from "./-hooks/use-delete-parameter.ts";
import { useGroups } from "./-hooks/use-groups.ts";
import { useParameters } from "./-hooks/use-parameters.ts";
import { Intent, type IntentData, type Parameter, ParamType } from "./-types.ts";

function VaultPage() {
  const navigate = useNavigate();
  const [groupId, setGroupId] = useQueryState("groupId", "");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [intentData, setIntentData] = useState<IntentData | null>(null);
  const [isEditingMainGroup, setIsEditingMainGroup] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Parameter | null>(null);
  const [detailParam, setDetailParam] = useState<Parameter | null>(null);
  const [paramToDelete, setParamToDelete] = useState<Parameter | null>(null);

  const groups$ = useGroups();
  const parameters$ = useParameters(groupId);
  const delete$ = useDeleteParameter();

  const activeGroup = groups$.data?.find((g) => g.id === groupId) || null;

  useEffect(() => {
    if (groups$.isLoading) return;
    if (groupId && !activeGroup && groups$.data) {
      navigate({ to: "/vault" });
      return;
    }
    if (!groupId && groups$.data?.length) {
      setGroupId(groups$.data[0].id);
      return;
    }
  }, [groupId, activeGroup, groups$.data, groups$.isLoading, navigate, setGroupId]);

  const handleAddGroup = () => {
    setIntent(Intent.AddParam);
    setIntentData({});
    setIsEditingMainGroup(true);
  };

  const handleEditGroup = (group: Parameter) => {
    setIntent(Intent.EditParam);
    setIntentData({ item: group });
    setIsEditingMainGroup(true);
  };

  const handleDeleteGroup = (group: Parameter) => {
    setGroupToDelete(group);
  };

  const handleConfirmDeleteGroup = useCallback(() => {
    if (groupToDelete) {
      delete$.mutate(groupToDelete, {
        onSuccess: () => {
          toast.success(`Group "${groupToDelete.description}" removed`);
          setGroupToDelete(null);
          if (groupToDelete.id === groupId) {
            setGroupId("");
          }
          groups$.refetch();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to remove group");
        },
      });
    }
  }, [groupToDelete, delete$, groupId, setGroupId, groups$]);

  const handleAdd = (parent?: Parameter) => {
    setIntent(Intent.AddParam);
    setIntentData({ parent: parent || activeGroup });
    setIsEditingMainGroup(false);
  };

  const handleEdit = (param: Parameter) => {
    setIntent(Intent.EditParam);
    setIntentData({ item: param });
    setIsEditingMainGroup(false);
  };

  const handleRemove = (param: Parameter) => {
    setParamToDelete(param);
  };

  const handleConfirmRemoveParam = useCallback(() => {
    if (paramToDelete) {
      delete$.mutate(paramToDelete, {
        onSuccess: () => {
          toast.success(`Parameter "${paramToDelete.description}" removed`);
          setParamToDelete(null);
          if (detailParam?.id === paramToDelete.id) {
            setDetailParam(null);
          }
          parameters$.refetch();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to remove parameter");
        },
      });
    }
  }, [paramToDelete, delete$, detailParam, parameters$]);

  const handleRotate = (param: Parameter) => {
    // Rotate = open edit form for the SECRET so user can enter new value
    setIntent(Intent.EditParam);
    setIntentData({ item: param });
    setIsEditingMainGroup(false);
  };

  const handleFormClose = () => {
    setIntent(null);
    setIntentData(null);
    setIsEditingMainGroup(false);
  };

  const handleFormSuccess = (param?: Parameter) => {
    const isNewMainGroup =
      intent === Intent.AddParam && isEditingMainGroup && param?.type === ParamType.GROUP;

    handleFormClose();
    groups$.refetch();

    if (isNewMainGroup) {
      setGroupId(param.id);
    } else {
      parameters$.refetch();
    }
  };

  if (groups$.isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div>Loading parameters...</div>
      </div>
    );
  }

  if (groups$.error) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="text-red-500">Error loading parameters: {groups$.error.message}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="border-b p-4">
        <div className="flex items-center justify-between">
          <GroupSelect
            activeGroupId={groupId}
            onGroupChange={setGroupId}
            onAddGroup={handleAddGroup}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
          />
          <AddButton activeGroup={activeGroup} onAdd={() => handleAdd()} />
        </div>
      </header>

      <TreeTable
        activeGroup={activeGroup ?? undefined}
        parameters={parameters$.data || []}
        isLoading={parameters$.isLoading}
        error={parameters$.error}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onRemove={handleRemove}
        onRefetch={() => parameters$.refetch()}
        onSelect={setDetailParam}
      />

      <ParameterForm
        open={intent === Intent.AddParam || intent === Intent.EditParam}
        onOpenChange={handleFormClose}
        intent={intent}
        intentData={intentData}
        onSuccess={handleFormSuccess}
        groupId={groupId}
        isMainGroup={isEditingMainGroup}
      />

      <ParamDetailSheet
        parameter={detailParam}
        open={!!detailParam}
        onOpenChange={(open) => {
          if (!open) setDetailParam(null);
        }}
        onDelete={handleRemove}
        onEdit={handleEdit}
        onRotate={handleRotate}
      />

      {/* Group delete confirmation */}
      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the group "{groupToDelete?.description}"? This action
              cannot be undone and all parameters within this group will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delete$.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteGroup}
              disabled={delete$.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {delete$.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Parameter delete confirmation */}
      <AlertDialog open={!!paramToDelete} onOpenChange={(open) => !open && setParamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Parameter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the parameter "{paramToDelete?.description}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delete$.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveParam}
              disabled={delete$.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {delete$.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute("/vault/")({
  component: VaultPage,
});
