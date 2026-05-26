import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = () => ({
  packages: {
    "demo-client": {
      target: "client",
      server: 4000,
    },
  },
});

export default config;
