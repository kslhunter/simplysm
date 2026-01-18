import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "claude": { target: "node" },
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
    "storage": { target: "node" },
  },
});

export default config;
