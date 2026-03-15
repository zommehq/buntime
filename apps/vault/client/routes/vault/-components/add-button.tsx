import { Button } from "~/components/ui/button.tsx";
import PlusIcon from "~icons/lucide/plus";

type AddButtonProps = {
  activeGroup?: any;
  onAdd: () => void;
};

export function AddButton({ activeGroup, onAdd }: AddButtonProps) {
  return (
    <Button className="px-4 h-10" disabled={!activeGroup} variant="outline" onClick={onAdd}>
      <PlusIcon className="h-4 w-4 mr-2" />
      Parameter
    </Button>
  );
}
