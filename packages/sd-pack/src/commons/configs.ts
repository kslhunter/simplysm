export type SdPackConfigType = ISdPackClientConfig | ISdPackLibraryConfig | ISdPackServerConfig;

export interface ISdPackAppPublishConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  root: string;
}

export interface ISdPackLibraryConfig {
  name: string;
  type: "library";
}

export interface ISdPackClientConfig {
  name: string;
  type: "client";
  platforms?: ("web" | "desktop")[];
  devServer?: {
    host: string;
    port: number;
  };
  publish?: ISdPackAppPublishConfig;
  env?: { [key: string]: string };
}

export interface ISdPackServerConfig {
  name: string;
  type: "server";
  publish?: ISdPackAppPublishConfig;
  env?: { [key: string]: string };
}