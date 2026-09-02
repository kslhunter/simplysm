import simplysmRootConfigs from "./packages/lint/src/eslint-recommended";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores([
    "sdcc-plugin/**",
    "packages/sd-cli/src/commands/init/templates/**",
    "**/tests/*/fixtures/**",
  ]),
  ...simplysmRootConfigs,
];
