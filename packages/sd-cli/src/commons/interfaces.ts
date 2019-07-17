export interface ISdWorkerMessage {
  type: "ready" | "run" | "done" | "log" | "info" | "warning" | "error";
  message?: any;
}

export interface ISdProjectConfig {
  packages: { [key: string]: ISdPackageConfig };
  localUpdates?: { [key: string]: string };
}

export interface ISdPackageConfig {
  type: "library" | "server" | "web" | "none";
  server?: string;
  framework?: "vue" | "angular" | "angular-jit";
  publish?: "npm" | ISdSimplysmPublishConfig;
  configs?: { [key: string]: any };
}

export interface ISdSimplysmPublishConfig {
  type: "simplysm";
  host: string;
  port?: number;
  path: string;
  ssl?: boolean;
  origin?: string;
}
