import { Button } from "~/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select.tsx";
import type { Parameter } from "~/routes/vault/-types.ts";
import Edit2Icon from "~icons/lucide/edit-2";
import ListPlusIcon from "~icons/lucide/list-plus";
import Trash2Icon from "~icons/lucide/trash-2";
import { useGroups } from "../-hooks/use-groups.ts";

type GroupSelectProps = {
  activeGroupId?: string;
  onAddGroup: () => void;
  onDeleteGroup: (group: Parameter) => void;
  onEditGroup: (group: Parameter) => void;
  onGroupChange: (groupId: string) => void;
};

export function GroupSelect({
  activeGroupId,
  onGroupChange,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
}: GroupSelectProps) {
  const groups$ = useGroups();

  if (groups$.isLoading) {
    return <div className="w-60 h-10 bg-gray-200 animate-pulse rounded-md" />;
  }

  return (
    <div className="flex items-center">
      <Select value={activeGroupId} onValueChange={onGroupChange}>
        <SelectTrigger className="w-60 rounded-r-none">
          <SelectValue placeholder="Select a group..." />
        </SelectTrigger>
        <SelectContent>
          {groups$.data?.map((group) => (
            <div
              key={group.id}
              className="group flex items-center justify-between pr-2"
              onMouseDown={(e) => e.preventDefault()}
            >
              <SelectItem value={group.id} className="flex-1 cursor-pointer">
                {group.description}
              </SelectItem>
              <div className="flex items-center transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditGroup(group);
                  }}
                  title="Edit group"
                >
                  <Edit2Icon className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteGroup(group);
                  }}
                  title="Remove group"
                >
                  <Trash2Icon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        className="px-3 rounded-l-none border-l-0 h-10"
        onClick={onAddGroup}
      >
        <ListPlusIcon className="h-4 w-4 mr-1" />
        Group
      </Button>
    </div>
  );
}
