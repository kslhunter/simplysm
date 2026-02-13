declare const process: { env: { DEV?: string; VER?: string; [key: string]: string | undefined } };

export const env: {
  DEV: boolean;
  VER?: string;
  [key: string]: unknown;
} = {
  ...process.env,
  DEV: JSON.parse(process.env.DEV != null && process.env.DEV !== "" ? process.env.DEV : "false"),
  VER: process.env.VER,
};
