export const fc_project_npmconfig = (opt: { name: string; description: string; author: string; gitUrl: string; cliVersion?: string }): string => JSON.stringify({
  name: opt.name,
  version: "1.0.0",
  description: opt.description,
  author: opt.author,
  repository: {
    type: "git",
    url: opt.gitUrl
  },
  type: "module",
  license: "UNLICENSED",
  private: true,
  packageManager: "yarn@3.2.2",
  engines: {
    node: "^16"
  },
  workspaces: [
    "packages/*",
    "test"
  ],
  scripts: {
    "watch": "sd-cli watch",
    "build": "sd-cli build",
    "publish": "sd-cli publish",
    "----- utils": "",
    "postinstall": "npx sd-cli prepare"
  },
  devDependencies: {
    "@simplysm/eslint-plugin": "~7.1.0",
    "@simplysm/sd-cli": opt.cliVersion ?? "~7.1.0",
    "@types/node": "^16.11.47",
    "cross-env": "^7.0.3",
    "eslint": "^8.22.0",
    "typescript": "~4.8.4"
  }
}, undefined, 2);
