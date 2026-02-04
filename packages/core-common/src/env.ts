declare const process: { env: Record<string, string | undefined> };

export const env: {
  DEV: boolean;
  VER?: string;
  [key: string]: unknown;
} = {
  DEV: JSON.parse(process.env["DEV"] ?? "false"),
  VER: process.env["VER"],
  ...process.env,
};
