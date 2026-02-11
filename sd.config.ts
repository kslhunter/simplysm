import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "capacitor-plugin-auto-update": { target: "browser", publish: "npm" },
    "capacitor-plugin-broadcast": { target: "browser", publish: "npm" },
    "capacitor-plugin-file-system": { target: "browser", publish: "npm" },
    "capacitor-plugin-usb-storage": { target: "browser", publish: "npm" },
    "cli": { target: "node", publish: "npm" },
    "core-browser": { target: "browser", publish: "npm" },
    "core-common": { target: "neutral", publish: "npm" },
    "core-node": { target: "node", publish: "npm" },
    "eslint-plugin": { target: "node", publish: "npm" },
    "excel": { target: "neutral", publish: "npm" },
    "orm-common": { target: "neutral", publish: "npm" },
    "orm-node": { target: "node", publish: "npm" },
    "sd-claude": { target: "node", publish: "npm" },
    "service-client": { target: "neutral", publish: "npm" },
    "service-common": { target: "neutral", publish: "npm" },
    "service-server": { target: "node", publish: "npm" },
    "solid": { target: "browser", publish: "npm" },
    "solid-demo": { target: "client", server: "solid-demo-server" },
    "solid-demo-server": { target: "server" },
    "storage": { target: "node", publish: "npm" },
  },
});

export default config;
