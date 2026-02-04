import { env } from "@simplysm/core-common";
import { ServiceBase } from "@simplysm/service-server";

export interface HealthStatus {
  status: "ok" | "error";
  timestamp: number;
  version?: string;
}

export class HealthService extends ServiceBase {
  check(): HealthStatus {
    return {
      status: "ok",
      timestamp: Date.now(),
      version: env.VER,
    };
  }

  ping(): string {
    return "pong";
  }
}
