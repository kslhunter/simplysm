import { describe, it, expect } from "vitest";
import recommended from "../src/eslint-recommended";
import plugin from "../src/eslint-plugin";

// ESLint config type helper
type ConfigItem = (typeof recommended)[number];

const hasIgnores = (config: ConfigItem): config is ConfigItem & { ignores: string[] } => {
  return "ignores" in config && Array.isArray(config.ignores);
};

const hasFiles = (config: ConfigItem): config is ConfigItem & { files: (string | string[])[] } => {
  return "files" in config && Array.isArray(config.files);
};

const hasRules = (
  config: ConfigItem,
): config is ConfigItem & { rules: Record<string, unknown> } => {
  return "rules" in config && config.rules != null;
};

const hasPlugins = (
  config: ConfigItem,
): config is ConfigItem & { plugins: Record<string, unknown> } => {
  return "plugins" in config && config.plugins != null;
};

const flattenFiles = (files: (string | string[])[]): string[] => {
  return files.flat();
};

describe("recommended config", () => {
  it("should export as array", () => {
    expect(Array.isArray(recommended)).toBe(true);
    expect(recommended.length).toBeGreaterThan(0);
  });

  it("should include globalIgnores config", () => {
    const ignoresConfig = recommended.find(hasIgnores);
    expect(ignoresConfig).toBeDefined();
    if (ignoresConfig == null) return;

    const expectedPatterns = ["**/node_modules/**", "**/dist/**", "**/.*/**", "**/_*/**"];
    expect(ignoresConfig.ignores).toEqual(expect.arrayContaining(expectedPatterns));
  });

  it("should include JS file config", () => {
    const jsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.js")),
    );
    expect(jsConfig).toBeDefined();
    if (jsConfig == null) return;
    if (hasPlugins(jsConfig)) {
      expect(jsConfig.plugins).toHaveProperty("@simplysm");
    }
  });

  it("should include TS file config", () => {
    const tsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.ts")),
    );
    expect(tsConfig).toBeDefined();
    if (tsConfig == null) return;
    if (hasPlugins(tsConfig)) {
      expect(tsConfig.plugins).toHaveProperty("@typescript-eslint");
      expect(tsConfig.plugins).toHaveProperty("@simplysm");
    }
  });

  it("should enable @simplysm custom rules with correct severity in TS config", () => {
    const tsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.ts")),
    );
    expect(tsConfig).toBeDefined();
    if (tsConfig == null) return;
    if (hasRules(tsConfig)) {
      expect(tsConfig.rules).toHaveProperty("@simplysm/no-hard-private", "error");
      expect(tsConfig.rules).toHaveProperty("@simplysm/no-subpath-imports-from-simplysm", "error");
      expect(tsConfig.rules).toHaveProperty("@simplysm/ts-no-throw-not-implemented-error", "warn");
    }
  });

  it("should enable @simplysm custom rules in JS config", () => {
    const jsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.js")),
    );
    expect(jsConfig).toBeDefined();
    if (jsConfig == null) return;
    if (hasRules(jsConfig)) {
      expect(jsConfig.rules).toHaveProperty("@simplysm/no-hard-private", "error");
      expect(jsConfig.rules).toHaveProperty("@simplysm/no-subpath-imports-from-simplysm", "error");
    }
  });

  it("should disable import/no-extraneous-dependencies in test folder", () => {
    const testConfig = recommended.find(
      (config) =>
        hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("**/tests/**")),
    );
    expect(testConfig).toBeDefined();
    if (testConfig == null) return;
    if (hasRules(testConfig)) {
      expect(testConfig.rules).toHaveProperty("import/no-extraneous-dependencies", "off");
    }
  });

  it("should include Angular TS config with processor", () => {
    const tsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.ts")),
    );
    expect(tsConfig).toBeDefined();
    if (tsConfig == null) return;
    expect(tsConfig).toHaveProperty("processor");
  });

  it("should include HTML file config with angular template rules", () => {
    const htmlConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.html")),
    );
    expect(htmlConfig).toBeDefined();
    if (htmlConfig == null) return;
    if (hasPlugins(htmlConfig)) {
      expect(htmlConfig.plugins).toHaveProperty("@angular-eslint/template");
    }
  });

  it("should NOT include component-selector or directive-selector rules", () => {
    const tsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.ts")),
    );
    expect(tsConfig).toBeDefined();
    if (tsConfig == null) return;
    if (hasRules(tsConfig)) {
      expect(tsConfig.rules).not.toHaveProperty("@angular-eslint/component-selector");
      expect(tsConfig.rules).not.toHaveProperty("@angular-eslint/directive-selector");
    }
  });

  it("should include all plugin.rules in recommended config (TS or HTML)", () => {
    const tsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.ts")),
    );
    const htmlConfigs = recommended.filter(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.html")),
    );
    expect(tsConfig).toBeDefined();
    expect(htmlConfigs.length).toBeGreaterThan(0);
    if (tsConfig == null) return;

    const ruleNames = Object.keys(plugin.rules);
    for (const ruleName of ruleNames) {
      const fullRuleName = `@simplysm/${ruleName}`;
      const inTs = hasRules(tsConfig) && fullRuleName in tsConfig.rules;
      const inHtml = htmlConfigs.some(
        (config) => hasRules(config) && fullRuleName in config.rules,
      );
      expect(
        inTs || inHtml,
        `rule '${fullRuleName}' should be included in TS or HTML config`,
      ).toBe(true);
    }
  });

  it("should activate ng-template rules in HTML config with correct severity", () => {
    const htmlSimplysmConfig = recommended.find(
      (config) =>
        hasFiles(config) &&
        flattenFiles(config.files).some((f) => f.includes("*.html")) &&
        hasPlugins(config) &&
        "@simplysm" in config.plugins,
    );
    expect(htmlSimplysmConfig).toBeDefined();
    if (htmlSimplysmConfig == null) return;
    if (hasRules(htmlSimplysmConfig)) {
      expect(htmlSimplysmConfig.rules).toHaveProperty(
        "@simplysm/ng-template-no-todo-comments",
        "warn",
      );
      expect(htmlSimplysmConfig.rules).toHaveProperty(
        "@simplysm/ng-template-sd-require-binding-attrs",
        "error",
      );
    }
  });

  it("should activate ts rules in TS config with correct severity", () => {
    const tsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.ts")),
    );
    expect(tsConfig).toBeDefined();
    if (tsConfig == null) return;
    if (hasRules(tsConfig)) {
      expect(tsConfig.rules).toHaveProperty("@simplysm/ts-no-unused-injects", "error");
      expect(tsConfig.rules).toHaveProperty("@simplysm/ts-no-unused-protected-readonly", "error");
    }
  });

});
