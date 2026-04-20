import type { SdConfigFn } from "./packages/sd-cli/src/sd-config.types";

const config: SdConfigFn = () => ({
  packages: {
    "angular": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-auto-update": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-intent": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-file-system": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-usb-storage": { target: "browser", publish: { type: "npm" } },
    "sd-cli": { target: "node", publish: { type: "npm" } },
    "core-browser": { target: "browser", publish: { type: "npm" } },
    "core-common": { target: "neutral", publish: { type: "npm" } },
    "core-node": { target: "node", publish: { type: "npm" } },
    "lint": { target: "node", publish: { type: "npm" } },
    "excel": { target: "neutral", publish: { type: "npm" } },
    "orm-common": { target: "neutral", publish: { type: "npm" } },
    "orm-node": { target: "node", publish: { type: "npm" } },
    "sd-claude": {
      target: "scripts",
      publish: { type: "npm" },
      watch: {
        target: ["../../.claude/**/sd-*", "../../.claude/**/sd-*/**", "../../.claude/settings.json"],
        cmd: "node",
        args: ["scripts/sync.mjs"],
      },
    },
    "service-client": { target: "neutral", publish: { type: "npm" } },
    "service-common": { target: "neutral", publish: { type: "npm" } },
    "service-server": { target: "node", publish: { type: "npm" } },
    "storage": { target: "node", publish: { type: "npm" } },
  },
});

export default config;
