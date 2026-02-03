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
      version: process.env["SD_VERSION"],
    };
  }

  ping(): string {
    return "pong";
  }
}
