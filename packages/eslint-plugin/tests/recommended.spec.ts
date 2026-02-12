import { describe, it, expect } from "vitest";
import recommended from "../src/configs/recommended";
import plugin from "../src/plugin";

// ESLint 설정 타입 헬퍼
type ConfigItem = (typeof recommended)[number];

const hasIgnores = (config: ConfigItem): config is ConfigItem & { ignores: string[] } => {
  return "ignores" in config && Array.isArray(config.ignores);
};

const hasFiles = (config: ConfigItem): config is ConfigItem & { files: (string | string[])[] } => {
  return "files" in config && Array.isArray(config.files);
};

const hasRules = (config: ConfigItem): config is ConfigItem & { rules: Record<string, unknown> } => {
  return "rules" in config && config.rules != null;
};

const hasPlugins = (config: ConfigItem): config is ConfigItem & { plugins: Record<string, unknown> } => {
  return "plugins" in config && config.plugins != null;
};

const flattenFiles = (files: (string | string[])[]): string[] => {
  return files.flat();
};

describe("recommended 설정", () => {
  it("배열 형태로 export 되어야 함", () => {
    expect(Array.isArray(recommended)).toBe(true);
    expect(recommended.length).toBeGreaterThan(0);
  });

  it("globalIgnores 설정이 포함되어야 함", () => {
    const ignoresConfig = recommended.find(hasIgnores);
    expect(ignoresConfig).toBeDefined();
    if (ignoresConfig == null) return;

    const expectedPatterns = ["**/node_modules/**", "**/dist/**", "**/.*/**", "**/_*/**"];
    expect(ignoresConfig.ignores).toEqual(expect.arrayContaining(expectedPatterns));
  });

  it("JS 파일 설정이 포함되어야 함", () => {
    const jsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.js")),
    );
    expect(jsConfig).toBeDefined();
    if (jsConfig == null) return;
    if (hasPlugins(jsConfig)) {
      expect(jsConfig.plugins).toHaveProperty("@simplysm");
    }
  });

  it("TS 파일 설정이 포함되어야 함", () => {
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

  it("TS 설정에서 @simplysm 커스텀 규칙이 올바른 severity로 활성화되어야 함", () => {
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

  it("JS 설정에서 @simplysm 커스텀 규칙이 활성화되어야 함", () => {
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

  it("테스트 폴더에서 import/no-extraneous-dependencies가 off 되어야 함", () => {
    const testConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("**/tests/**")),
    );
    expect(testConfig).toBeDefined();
    if (testConfig == null) return;
    if (hasRules(testConfig)) {
      expect(testConfig.rules).toHaveProperty("import/no-extraneous-dependencies", "off");
    }
  });

  it("plugin.rules의 모든 규칙이 recommended 설정에 포함되어야 함", () => {
    const tsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.ts")),
    );
    expect(tsConfig).toBeDefined();
    if (tsConfig == null) return;

    if (hasRules(tsConfig)) {
      const ruleNames = Object.keys(plugin.rules);
      for (const ruleName of ruleNames) {
        const fullRuleName = `@simplysm/${ruleName}`;
        expect(tsConfig.rules, `규칙 '${fullRuleName}'이 TS 설정에 포함되어야 함`).toHaveProperty(fullRuleName);
      }
    }
  });

  it("TS 설정에서 parserOptions.project가 true로 설정되어야 함", () => {
    const tsConfig = recommended.find(
      (config) => hasFiles(config) && flattenFiles(config.files).some((f) => f.includes("*.ts")),
    ) as ConfigItem & {
      languageOptions?: { parserOptions?: { project?: unknown } };
    };
    expect(tsConfig).toBeDefined();
    expect(tsConfig.languageOptions?.parserOptions?.project).toBe(true);
  });

  it("TSX 파일에 solid 플러그인이 적용되어야 함", () => {
    // TSX를 포함하는 설정에서 solid 플러그인이 있는 설정을 찾음
    // (현재 구현에서는 **/*.ts, **/*.tsx를 함께 처리)
    const tsxSolidConfig = recommended.find(
      (config) =>
        hasFiles(config) &&
        flattenFiles(config.files).some((f) => f.includes(".tsx")) &&
        hasPlugins(config) &&
        "solid" in config.plugins,
    );
    expect(tsxSolidConfig).toBeDefined();
    if (tsxSolidConfig == null) return;
    if (hasPlugins(tsxSolidConfig)) {
      expect(tsxSolidConfig.plugins).toHaveProperty("solid");
    }
    if (hasRules(tsxSolidConfig)) {
      // eslint-plugin-solid의 flat/typescript 규칙이 적용되어야 함
      expect(tsxSolidConfig.rules).toHaveProperty("solid/jsx-no-undef");
    }
  });
});
