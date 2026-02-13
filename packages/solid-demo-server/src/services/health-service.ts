import { env } from "@simplysm/core-common";
import { defineService } from "@simplysm/service-server";

export interface HealthStatus {
  status: "ok" | "error";
  timestamp: number;
  version?: string;
}

export const HealthService = defineService("Health", () => ({
  check: (): HealthStatus => {
    return {
      status: "ok",
      timestamp: Date.now(),
      version: env.VER,
    };
  },

  ping: (): string => {
    return "pong";
  },
}));
