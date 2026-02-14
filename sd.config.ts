import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = () => ({
  packages: {
    "capacitor-plugin-auto-update": { target: "browser", publish: "npm" },
    "capacitor-plugin-broadcast": { target: "browser", publish: "npm" },
    "capacitor-plugin-file-system": { target: "browser", publish: "npm" },
    "capacitor-plugin-usb-storage": { target: "browser", publish: "npm" },
    "sd-cli": { target: "node", publish: "npm" },
    "core-browser": { target: "browser", publish: "npm" },
    "core-common": { target: "neutral", publish: "npm" },
    "core-node": { target: "node", publish: "npm" },
    "lint": { target: "node", publish: "npm" },
    "excel": { target: "neutral", publish: "npm" },
    "orm-common": { target: "neutral", publish: "npm" },
    "orm-node": { target: "node", publish: "npm" },
    "claude": { target: "node", publish: "npm" },
    "service-client": { target: "neutral", publish: "npm" },
    "service-common": { target: "neutral", publish: "npm" },
    "service-server": { target: "node", publish: "npm" },
    "solid": { target: "browser", publish: "npm", copySrc: ["**/*.css"] },
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
    "storage": { target: "node", publish: "npm" },
  },
});

export default config;
