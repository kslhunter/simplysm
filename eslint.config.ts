import simplysmRootConfigs from "./packages/lint/src/eslint-recommended";
import {globalIgnores} from "eslint/config";

export default [
  globalIgnores(["packages/sd-claude/claude/**", "packages/sd-cli/templates/**"]),
  ...simplysmRootConfigs
];
