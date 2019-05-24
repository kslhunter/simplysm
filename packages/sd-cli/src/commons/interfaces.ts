export interface ISdWorkerMessage {
  type: "ready" | "run" | "done" | "log" | "info" | "warning" | "error";
  message?: any;
}

export interface ISdProjectConfig {
  packages: { [key: string]: ISdPackageConfig };
  localUpdates?: { [key: string]: string };
}

export interface ISdPackageConfig {
  type?: "server" | "web" | "none";
  publish?: "npm" | ISdSimplysmPublishConfig;
  server?: string;
  configs?: { [key: string]: any };
}

export interface ISdSimplysmPublishConfig {
  type: "simplysm";
  host: string;
  port?: number;
  path: string;
  ssl?: boolean;
}
