import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = () => ({
  packages: {
    "capacitor-plugin-auto-update": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-broadcast": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-file-system": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-usb-storage": { target: "browser", publish: { type: "npm" } },
    "sd-cli": { target: "node", publish: { type: "npm" } },
    "core-browser": { target: "browser", publish: { type: "npm" } },
    "core-common": { target: "neutral", publish: { type: "npm" } },
    "core-node": { target: "node", publish: { type: "npm" } },
    "lint": { target: "node", publish: { type: "npm" } },
    "excel": { target: "neutral", publish: { type: "npm" } },
    "mcp-playwright": { target: "node", publish: { type: "npm" } },
    "orm-common": { target: "neutral", publish: { type: "npm" } },
    "orm-node": { target: "node", publish: { type: "npm" } },
    "sd-claude": { target: "node", publish: { type: "npm" } },
    "service-client": { target: "neutral", publish: { type: "npm" } },
    "service-common": { target: "neutral", publish: { type: "npm" } },
    "service-server": { target: "node", publish: { type: "npm" } },
    "solid": { target: "browser", publish: { type: "npm" }, copySrc: ["**/*.css"] },
    "solid-demo": {
      target: "client",
      server: "solid-demo-server",
      publish: {
        type: "sftp",
        host: "simplysm.co.kr",
        path: "/srv/pm2/simplysm-demo/www/solid-demo",
        user: "simplysm",
      },
    },
    "solid-demo-server": {
      target: "server",
      packageManager: "volta",
      pm2: {},
      publish: {
        type: "sftp",
        host: "simplysm.co.kr",
        path: "/srv/pm2/simplysm-demo",
        user: "simplysm",
      },
    },
    "storage": { target: "node", publish: { type: "npm" } },
  },
});

export default config;
