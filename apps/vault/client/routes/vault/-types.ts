export enum ParamType {
  BOOLEAN = "BOOLEAN",
  CODE = "CODE",
  GROUP = "GROUP",
  JSON = "JSON",
  NUMBER = "NUMBER",
  SECRET = "SECRET",
  STRING = "STRING",
}

export enum Intent {
  AddParam,
  EditParam,
  RemoveParam,
}

export type Parameter = {
  id: string;
  key: string;
  description: string;
  value?: any;
  type: ParamType;
  parentId?: string;
  children?: Parameter[];
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string | null;
  rotationIntervalDays?: number | null;
  status?: "active" | "expiring_soon" | "expired";
};

export type Group = Parameter & {
  type: ParamType.GROUP;
};

export type IntentData = {
  item?: Parameter | null;
  parent?: Parameter | null;
};
