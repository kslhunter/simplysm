export const fc_project_npmconfig = (opt: { name: string; description: string; author: string }): string => JSON.stringify({
  name: opt.name,
  version: "1.0.0",
  description: opt.description,
  author: opt.author,
  type: "module",
  license: "UNLICENSED",
  private: true,
  engines: {
    node: "^16"
  },
  workspaces: [
    "packages/*"
  ],
  scripts: {
    "watch": "sd-cli watch",
    "build": "sd-cli build",
    "publish": "sd-cli publish",
    "----- utils": "",
    "postinstall": "sd-cli prepare"
  },
  devDependencies: {
    "@simplysm/eslint-plugin": "~7.0.0",
    "@simplysm/sd-cli": "~7.0.0",
    "@types/node": "^17.0.12",
    "cross-env": "^7.0.3",
    "eslint": "^8.7.0",
    "typescript": "~4.5.5"
  }
}, undefined, 2);
