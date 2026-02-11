import { describe, test, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { addPackageToSdConfig, setClientServerInSdConfig, addTailwindToEslintConfig } from "../src/utils/config-editor";

describe("config-editor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  describe("addPackageToSdConfig", () => {
    test("adds client package to empty packages object", () => {
      const configPath = path.join(tmpDir, "sd.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import type { SdConfigFn } from "@simplysm/cli";',
          "",
          "const config: SdConfigFn = () => ({",
          "  packages: {},",
          "});",
          "",
          "export default config;",
        ].join("\n"),
      );

      addPackageToSdConfig(configPath, "client-web", { target: "client" });

      const result = fs.readFileSync(configPath, "utf-8");
      expect(result).toContain('"client-web"');
      expect(result).toContain('"client"');
    });

    test("adds server package to existing packages", () => {
      const configPath = path.join(tmpDir, "sd.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import type { SdConfigFn } from "@simplysm/cli";',
          "",
          "const config: SdConfigFn = () => ({",
          "  packages: {",
          '    "client-web": { target: "client" },',
          "  },",
          "});",
          "",
          "export default config;",
        ].join("\n"),
      );

      addPackageToSdConfig(configPath, "server", { target: "server" });

      const result = fs.readFileSync(configPath, "utf-8");
      expect(result).toContain('"client-web"');
      expect(result).toContain('"server"');
    });

    test("returns false if package already exists", () => {
      const configPath = path.join(tmpDir, "sd.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import type { SdConfigFn } from "@simplysm/cli";',
          "",
          "const config: SdConfigFn = () => ({",
          "  packages: {",
          '    "client-web": { target: "client" },',
          "  },",
          "});",
          "",
          "export default config;",
        ].join("\n"),
      );

      const result = addPackageToSdConfig(configPath, "client-web", { target: "client" });
      expect(result).toBe(false);
    });
  });

  describe("setClientServerInSdConfig", () => {
    test("adds server field to client config", () => {
      const configPath = path.join(tmpDir, "sd.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import type { SdConfigFn } from "@simplysm/cli";',
          "",
          "const config: SdConfigFn = () => ({",
          "  packages: {",
          '    "client-web": { target: "client" },',
          "  },",
          "});",
          "",
          "export default config;",
        ].join("\n"),
      );

      setClientServerInSdConfig(configPath, "client-web", "server");

      const result = fs.readFileSync(configPath, "utf-8");
      expect(result).toContain('server: "server"');
    });
  });

  describe("addTailwindToEslintConfig", () => {
    test("adds tailwind settings to eslint config without tailwind", () => {
      const configPath = path.join(tmpDir, "eslint.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import simplysmPlugin from "@simplysm/eslint-plugin";',
          "",
          "export default [",
          "  ...simplysmPlugin.configs.recommended,",
          "];",
        ].join("\n"),
      );

      addTailwindToEslintConfig(configPath, "client-web");

      const result = fs.readFileSync(configPath, "utf-8");
      expect(result).toContain("tailwindcss");
      expect(result).toContain("packages/client-web/tailwind.config.ts");
    });

    test("does nothing if tailwind settings already exist", () => {
      const configPath = path.join(tmpDir, "eslint.config.ts");
      const original = [
        'import simplysmPlugin from "@simplysm/eslint-plugin";',
        "",
        "export default [",
        "  ...simplysmPlugin.configs.recommended,",
        "  {",
        '    files: ["**/*.{ts,tsx}"],',
        "    settings: {",
        "      tailwindcss: {",
        '        config: "packages/client-old/tailwind.config.ts",',
        "      },",
        "    },",
        "  },",
        "];",
      ].join("\n");
      fs.writeFileSync(configPath, original);

      const result = addTailwindToEslintConfig(configPath, "client-web");
      expect(result).toBe(false);
    });
  });
});
