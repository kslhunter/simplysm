export interface ISdProjectConfig {
  packages: { [key: string]: ISdPackageConfig };
  localUpdates?: { [key: string]: string };
}

export interface ISdPackageConfig {
  type: "library" | "server" | "web" | "none";
  env?: { [key: string]: string };
  configs?: { [key: string]: any };
  publish?: "npm";
  server?: string;
}
