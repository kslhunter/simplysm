import type { SdConfigFn } from "./packages/sd-cli/src/sd-config.types";

/** Claude Code 런타임이 참조하지 않는 플러그인 자산 (pi 확장·개발 산출물·캐시) */
const PLUGIN_COPY_IGNORE = [
  "**/node_modules/**",
  "**/.cache/**",
  "**/__pycache__/**",
  "**/*.tsbuildinfo",
  "extensions/**",
  "tests/**",
  "tsconfig.json",
  "package.json",
];

const config: SdConfigFn = () => ({
  packages: {
    angular: { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-auto-update": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-intent": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-file-system": { target: "browser", publish: { type: "npm" } },
    "capacitor-plugin-usb-storage": { target: "browser", publish: { type: "npm" } },
    cc: {
      target: "node",
      publish: { type: "npm" },
      // Claude Code 가 읽는 플러그인 구성만 배포물에 담는다.
      // node_modules 는 워크스페이스 루트를 가리키는 심볼릭 링크를 포함하므로 반드시 제외한다.
      copyFiles: [
        { from: "plugins/sd", to: "plugins/sd", ignore: PLUGIN_COPY_IGNORE },
        { from: "plugins/sd-wiki", to: "plugins/sd-wiki", ignore: PLUGIN_COPY_IGNORE },
      ],
    },
    "sd-cli": { target: "node", publish: { type: "npm" } },
    "core-browser": { target: "browser", publish: { type: "npm" } },
    "core-common": { target: "neutral", publish: { type: "npm" } },
    "core-node": { target: "node", publish: { type: "npm" } },
    lint: { target: "node", publish: { type: "npm" } },
    excel: { target: "neutral", publish: { type: "npm" } },
    "orm-common": { target: "neutral", publish: { type: "npm" } },
    "orm-node": { target: "node", publish: { type: "npm" } },
    "service-client": { target: "neutral", publish: { type: "npm" } },
    "service-common": { target: "neutral", publish: { type: "npm" } },
    "service-server": { target: "node", publish: { type: "npm" } },
    storage: { target: "node", publish: { type: "npm" } },
  },
});

export default config;
