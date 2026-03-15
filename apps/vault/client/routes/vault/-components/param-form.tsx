import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button.tsx";
import { Input } from "~/components/ui/input.tsx";
import { Label } from "~/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet.tsx";
import { Switch } from "~/components/ui/switch.tsx";
import { Textarea } from "~/components/ui/textarea.tsx";
import { useCreateParameter } from "~/routes/vault/-hooks/use-create-parameter.ts";
import { useUpdateParameter } from "~/routes/vault/-hooks/use-update-parameter.ts";
import { Intent, type IntentData, type Parameter, ParamType } from "~/routes/vault/-types.ts";
import EyeIcon from "~icons/lucide/eye";
import EyeOffIcon from "~icons/lucide/eye-off";
import SaveIcon from "~icons/lucide/save";
import XIcon from "~icons/lucide/x";

type ParameterFormProps = {
  groupId?: string;
  intent: Intent | null;
  intentData: IntentData | null;
  isMainGroup?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (param?: Parameter) => void;
};

const normalizeKey = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
};

export function ParameterForm({
  open,
  onOpenChange,
  intent,
  intentData,
  onSuccess,
  isMainGroup = false,
}: ParameterFormProps) {
  const create$ = useCreateParameter();
  const update$ = useUpdateParameter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Partial<Parameter>>({
    key: "",
    description: "",
    value: "",
    type: ParamType.STRING,
  });

  const isCreatingNewGroup = intent === Intent.AddParam && !intentData?.parent;

  const shouldShowTypeField = !isCreatingNewGroup;

  const isTypeFieldDisabled = isMainGroup;

  const title =
    intent === Intent.AddParam
      ? intentData?.parent
        ? `Add parameter to ${intentData.parent.description}`
        : "Add Group"
      : intentData?.item?.description || "Edit Parameter";

  useEffect(() => {
    const isNewGroup = intent === Intent.AddParam && !intentData?.parent;

    setShowPassword(false);

    if (open && intentData?.item) {
      if (intentData.item.type === ParamType.BOOLEAN) {
        setFormData({ ...intentData.item, value: intentData.item.value === "true" });
      } else if (intentData.item.type === ParamType.SECRET) {
        // When editing a SECRET, clear the value (server returns masked "••••••••")
        setFormData({ ...intentData.item, value: "" });
      } else {
        setFormData(intentData.item);
      }
    } else if (open) {
      if (isNewGroup) {
        setFormData({
          key: "",
          description: "",
          value: null,
          type: ParamType.GROUP,
        });
      } else {
        setFormData({
          key: "",
          description: "",
          value: "",
          type: ParamType.STRING,
        });
      }
    }
  }, [intent, intentData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let valueToSave: any = formData.value;
    if (formData.type === ParamType.BOOLEAN) {
      valueToSave = String(formData.value);
    } else if (formData.type === ParamType.GROUP) {
      valueToSave = null;
    } else if (
      formData.type === ParamType.SECRET &&
      intent === Intent.EditParam &&
      !formData.value
    ) {
      // When editing SECRET and value is empty, send null to preserve existing encrypted value
      valueToSave = null;
    }

    if (intent === Intent.EditParam && intentData?.item?.id) {
      update$.mutate(
        {
          id: intentData.item.id,
          description: formData.description || "",
          key: formData.key ? normalizeKey(formData.key) : "",
          value: valueToSave,
          type: formData.type || "",
          parentId: formData.parentId ? Number(formData.parentId) : null,
          expiresAt: formData.type === ParamType.SECRET ? formData.expiresAt || null : undefined,
          rotationIntervalDays:
            formData.type === ParamType.SECRET ? formData.rotationIntervalDays || null : undefined,
        },
        {
          onSuccess: (updatedParam) => {
            toast.success("Parameter updated successfully");
            onSuccess?.(updatedParam);
          },
          onError: (error) => {
            toast.error(error.message || "Failed to update parameter");
          },
        },
      );
    } else if (intent === Intent.AddParam) {
      const payload: Partial<Parameter> = {
        description: formData.description,
        key: formData.key ? normalizeKey(formData.key) : "",
        value: valueToSave,
        type: formData.type,
      };

      if (intentData?.parent) {
        payload.parentId = intentData.parent.id;
      }

      if (isCreatingNewGroup) {
        payload.type = ParamType.GROUP;
        payload.value = null;
      }

      if (formData.type === ParamType.SECRET) {
        payload.expiresAt = formData.expiresAt || null;
        payload.rotationIntervalDays = formData.rotationIntervalDays || null;
      }

      create$.mutate(payload as Omit<Parameter, "id">, {
        onSuccess: (newParam) => {
          toast.success("Parameter created successfully");
          onSuccess?.(newParam);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create parameter");
        },
      });
    }
  };

  const handleTypeChange = (type: ParamType) => {
    if (isTypeFieldDisabled) return;

    setFormData((prev) => ({
      ...prev,
      type,
      value: type === ParamType.BOOLEAN ? false : "",
    }));
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalizedKey = normalizeKey(e.target.value);
    setFormData((prev) => ({ ...prev, key: normalizedKey }));
  };

  const renderValueInput = () => {
    if (formData.type === ParamType.GROUP) return null;

    switch (formData.type) {
      case ParamType.BOOLEAN:
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={!!formData.value}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, value: checked }))}
            />
            <Label>{formData.value ? "True" : "False"}</Label>
          </div>
        );

      case ParamType.NUMBER:
        return (
          <Input
            type="number"
            value={String(formData.value || "")}
            onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
            placeholder="Enter a number"
          />
        );

      case ParamType.SECRET:
        return (
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={String(formData.value || "")}
              onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
              placeholder={
                intent === Intent.EditParam
                  ? "Enter new value (leave empty to keep current)"
                  : "Enter secret value"
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </Button>
          </div>
        );

      case ParamType.CODE:
      case ParamType.JSON:
        return (
          <Textarea
            rows={5}
            value={String(formData.value || "")}
            onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
            placeholder={formData.type === ParamType.JSON ? "Enter valid JSON" : "Enter the code"}
          />
        );

      default:
        return (
          <Input
            value={String(formData.value || "")}
            onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
            placeholder="Enter the value"
          />
        );
    }
  };

  const isLoading = create$.isPending || update$.isPending;
  const isValid = formData.key && formData.description;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[640px] p-6">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {intent === Intent.AddParam
                ? "Fill in the fields below to add."
                : "Edit the fields below to update."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="key">
                Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="key"
                value={formData.key || ""}
                onChange={handleKeyChange}
                required
                placeholder="Enter the key"
              />
            </div>

            {shouldShowTypeField && (
              <div className="space-y-2">
                <Label htmlFor="type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={handleTypeChange}
                  disabled={isTypeFieldDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ParamType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                required
                placeholder="Enter the description"
              />
            </div>

            {formData.type !== ParamType.GROUP && (
              <div className="space-y-2">
                <Label htmlFor="value">
                  Value <span className="text-red-500">*</span>
                </Label>
                {renderValueInput()}
              </div>
            )}

            {formData.type === ParamType.SECRET && (
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Expiration Settings</Label>
                  <Switch
                    checked={!!formData.expiresAt}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        setFormData((prev) => ({
                          ...prev,
                          expiresAt: null,
                          rotationIntervalDays: null,
                        }));
                      } else {
                        // Default to 90 days from now
                        const defaultDate = new Date();
                        defaultDate.setDate(defaultDate.getDate() + 90);
                        setFormData((prev) => ({
                          ...prev,
                          expiresAt: defaultDate.toISOString().split("T")[0],
                        }));
                      }
                    }}
                  />
                </div>
                {formData.expiresAt && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt" className="text-xs text-muted-foreground">
                        Expiration Date
                      </Label>
                      <Input
                        id="expiresAt"
                        type="date"
                        value={
                          formData.expiresAt
                            ? new Date(formData.expiresAt).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            expiresAt: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="rotationIntervalDays"
                        className="text-xs text-muted-foreground"
                      >
                        Rotation Interval (days)
                      </Label>
                      <Input
                        id="rotationIntervalDays"
                        type="number"
                        min={1}
                        value={String(formData.rotationIntervalDays || "")}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            rotationIntervalDays: e.target.value
                              ? Number.parseInt(e.target.value)
                              : null,
                          }))
                        }
                        placeholder="e.g. 90"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-start gap-2">
              <Button
                type="submit"
                disabled={isLoading || !isValid}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <SaveIcon className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                <XIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>

          <SheetFooter />
        </form>
      </SheetContent>
    </Sheet>
  );
}
