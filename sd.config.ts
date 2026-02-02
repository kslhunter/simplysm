import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "capacitor-plugin-broadcast": { target: "browser" },
    "capacitor-plugin-file-system": { target: "browser" },
    "capacitor-plugin-usb-storage": { target: "browser" },
    // "claude": { target: "scripts" },
    "cli": { target: "node" },
    "core-browser": { target: "browser" },
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "eslint-plugin": { target: "node" },
    "excel": { target: "neutral" },
    "orm-common": { target: "neutral" },
    "orm-node": { target: "node" },
    "service-client": { target: "neutral" },
    "service-common": { target: "neutral" },
    "service-server": { target: "node" },
    "solid": { target: "browser" },
    "solid-demo": { target: "client", server: 40080 },
    "storage": { target: "node" },
  },
});

export default config;
