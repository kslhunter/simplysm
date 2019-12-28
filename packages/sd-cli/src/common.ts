export interface ISdProjectConfig {
  packages: { [key: string]: ISdPackageConfig };
}

export interface ISdPackageConfig {
  type: "library" | "none";
  env?: { [key: string]: string };
  configs?: { [key: string]: any };
  publish?: "npm";
}