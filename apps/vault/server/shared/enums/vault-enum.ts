export enum ParameterType {
  GROUP = 0,
  STRING = 1,
  NUMBER = 2,
  BOOLEAN = 3,
  JSON = 4,
  CODE = 5,
  SECRET = 6,
}

export function getParameterTypeName(typeValue: string | number): string {
  if (typeof typeValue === "string") {
    const upperType = typeValue.toUpperCase();
    if (["GROUP", "STRING", "NUMBER", "BOOLEAN", "JSON", "CODE", "SECRET"].includes(upperType)) {
      return upperType;
    }

    const numericValue = parseInt(typeValue);
    if (!isNaN(numericValue)) {
      return getParameterTypeNameFromNumber(numericValue);
    }
  }

  if (typeof typeValue === "number") {
    return getParameterTypeNameFromNumber(typeValue);
  }

  return "UNKNOWN";
}

function getParameterTypeNameFromNumber(typeValue: number): string {
  switch (typeValue) {
    case 0:
      return "GROUP";
    case 1:
      return "STRING";
    case 2:
      return "NUMBER";
    case 3:
      return "BOOLEAN";
    case 4:
      return "JSON";
    case 5:
      return "CODE";
    case 6:
      return "SECRET";
    default:
      return "UNKNOWN";
  }
}

export function getParameterTypeValue(typeName: string): number | undefined {
  switch (typeName.toUpperCase()) {
    case "GROUP":
      return ParameterType.GROUP;
    case "STRING":
      return ParameterType.STRING;
    case "NUMBER":
      return ParameterType.NUMBER;
    case "BOOLEAN":
      return ParameterType.BOOLEAN;
    case "JSON":
      return ParameterType.JSON;
    case "CODE":
      return ParameterType.CODE;
    case "SECRET":
      return ParameterType.SECRET;
    default:
      return undefined;
  }
}
