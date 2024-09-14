import { StringUtil } from "@simplysm/sd-core-common";
import { variables } from "./variables";

export const generateCssVariables = (rec: any, prefix?: string): string => {
  const resultItems: string[] = [];
  for (const key of Object.keys(rec)) {
    const val = rec[key];

    const fullName = (prefix !== undefined ? prefix + "-" : "") + StringUtil.toKebabCase(key).replace(/_/g, "-");
    if (typeof val === "string" || typeof val === "number") {
      resultItems.push(`--${fullName}: ${val.toString()};`);
    } else if (typeof val === "object") {
      resultItems.push(generateCssVariables(val, fullName));
    } else {
      throw new Error();
    }
  }

  return resultItems.join("\n");
};

export const varKeys = (varKey: keyof typeof variables): string[] => {
  return _varKeys(variables[varKey]);
};

function _varKeys(obj: any, prefix?: string): string[] {
  const result: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullName = (prefix !== undefined ? prefix + "-" : "") + StringUtil.toKebabCase(key).replace(/_/g, "-");
    if (typeof obj[key] === "string" || typeof obj[key] === "number") {
      result.push(fullName);
    } else if (typeof obj[key] === "object") {
      result.push(..._varKeys(obj[key], fullName));
    } else {
      throw new Error();
    }
  }

  return result;
}
