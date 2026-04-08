import type { AppStructureItem } from "@simplysm/service-common";
import { defineService, type ServiceMethods } from "../core/define-service";

export function AppStructureService(itemsMap: Record<string, AppStructureItem[]>) {
  return defineService("AppStructure", () => ({
    getItems(): Record<string, AppStructureItem[]> {
      return itemsMap;
    },
  }));
}

export type AppStructureServiceType = ServiceMethods<ReturnType<typeof AppStructureService>>;
