import { ESLint } from "eslint";
import { createJiti } from "jiti";
import path from "path";
import { fsExists, fsGlob, pathFilterByTargets } from "@simplysm/core-node";
import "@simplysm/core-common";
import { SdError } from "@simplysm/core-common";
import { consola } from "consola";
import stylelint from "stylelint";

//#region Types

/**
 * ESLint execution options
 */
export interface LintOptions {
  /** Path filter for linting (e.g., `packages/core-common`). Empty array targets everything */
  targets: string[];
  /** Enable auto-fix */
  fix: boolean;
  /** Enable execution time measurement per ESLint rule (sets TIMING environment variable) */
  timing: boolean;
}

/**
 * Return type of executeLint()
 */
export interface LintResult {
  /** true if there are no lint errors */
  success: boolean;
  /** Total error count from ESLint + Stylelint */
  errorCount: number;
  /** Total warning count from ESLint + Stylelint */
  warningCount: number;
  /** Formatter output string (content to write to stdout) */
  formattedOutput: string;
}

//#endregion

//#region Utilities

/** ESLint config file search order */
const ESLINT_CONFIG_FILES = [
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.js",
  "eslint.config.mjs",
] as const;

/** Stylelint config file search order */
const STYLELINT_CONFIG_FILES = [
  "stylelint.config.ts",
  "stylelint.config.mts",
  "stylelint.config.js",
  "stylelint.config.mjs",
  ".stylelintrc.json",
  ".stylelintrc.yml",
] as const;

/**
 * Type guard to check if an ESLint config object has only ignores property
 */
function isGlobalIgnoresConfig(item: unknown): item is { ignores: string[] } {
  if (item == null || typeof item !== "object") return false;
  if (!("ignores" in item)) return false;
  if ("files" in item) return false; // if files exists, it's not globalIgnores
  const ignores = (item as { ignores: unknown }).ignores;
  if (!Array.isArray(ignores)) return false;
  return ignores.every((i) => typeof i === "string");
}

/**
 * Extract globalIgnores patterns from eslint.config.ts/js.
 * A config object with only ignores (no files) is a globalIgnores.
 * @internal exported for testing
 */
export async function loadIgnorePatterns(cwd: string): Promise<string[]> {
  let configPath: string | undefined;
  for (const f of ESLINT_CONFIG_FILES) {
    const p = path.join(cwd, f);
    if (await fsExists(p)) {
      configPath = p;
      break;
    }
  }

  if (configPath == null) {
    throw new SdError(
      `Cannot find ESLint config file (cwd: ${cwd}): ${ESLINT_CONFIG_FILES.join(", ")}`,
    );
  }

  const jiti = createJiti(import.meta.url);
  const configModule = await jiti.import<{ default: Record<string, unknown>[] } | undefined>(
    configPath,
  );

  let configs: unknown;
  if (Array.isArray(configModule)) {
    configs = configModule;
  } else if (
    configModule != null &&
    typeof configModule === "object" &&
    "default" in configModule
  ) {
    configs = configModule.default;
  } else {
    throw new SdError(`ESLint config file is not in correct format: ${configPath}`);
  }

  if (!Array.isArray(configs)) {
    throw new SdError(`ESLint config is not an array: ${configPath}`);
  }

  return configs.filter(isGlobalIgnoresConfig).flatMap((item) => item.ignores);
}

/**
 * Check if Stylelint config file exists.
 */
async function hasStylelintConfig(cwd: string): Promise<boolean> {
  for (const f of STYLELINT_CONFIG_FILES) {
    if (await fsExists(path.join(cwd, f))) return true;
  }
  return false;
}

//#endregion

//#region Main

/**
 * Run ESLint/Stylelint and return results.
 *
 * - Extract globalIgnores patterns from `eslint.config.ts/js` and apply to glob filtering
 * - Show progress using consola
 * - Enable cache (saved to `.cache/eslint.cache`, auto invalidated on config changes)
 * - No stdout output or process.exitCode setting (caller decides)
 *
 * @param options - lint execution options
 * @returns lint result (success status, error/warning counts, formatter output)
 */
export async function executeLint(options: LintOptions): Promise<LintResult> {
  const { targets, fix, timing } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:lint");

  logger.debug("start lint", { targets, fix, timing });

  // Set TIMING environment variable
  if (timing) {
    process.env["TIMING"] = "1";
  }

  // Load ESLint configuration
  logger.start("loading ESLint config");
  const ignorePatterns = await loadIgnorePatterns(cwd);
  logger.debug("ignore patterns loaded", { ignorePatternCount: ignorePatterns.length });
  logger.success(`loaded ESLint config (${ignorePatterns.length} ignore patterns)`);

  // Collect lint target files
  logger.start("collecting lint target files");
  let files = await fsGlob("**/*.{ts,tsx,js,jsx}", {
    cwd,
    ignore: ignorePatterns,
    nodir: true,
    absolute: true,
  });
  files = pathFilterByTargets(files, targets, cwd);
  logger.debug("file collection complete", { fileCount: files.length });
  logger.success(`collected lint target files (${files.length} files)`);

  // Run lint
  let eslint: ESLint | undefined;
  let eslintResults: ESLint.LintResult[] | undefined;
  if (files.length > 0) {
    logger.start(`running lint... (${files.length} files)`);
    eslint = new ESLint({
      cwd,
      fix,
      cache: true,
      cacheLocation: path.join(cwd, ".cache", "eslint.cache"),
    });
    eslintResults = await eslint.lintFiles(files);
    logger.success("lint complete");

    // Apply auto-fix
    if (fix) {
      logger.debug("applying auto-fix...");
      await ESLint.outputFixes(eslintResults);
      logger.debug("auto-fix applied");
    }
  }

  // Stylelint
  const hasStylelintCfg = await hasStylelintConfig(cwd);
  let stylelintResult: stylelint.LinterResult | undefined;
  if (hasStylelintCfg) {
    logger.start("collecting CSS files");
    let cssFiles = await fsGlob("**/*.css", {
      cwd,
      ignore: ignorePatterns,
      nodir: true,
      absolute: true,
    });
    cssFiles = pathFilterByTargets(cssFiles, targets, cwd);
    logger.success(`collected CSS files (${cssFiles.length} files)`);

    if (cssFiles.length > 0) {
      logger.start(`running Stylelint... (${cssFiles.length} files)`);
      let configFile: string | undefined;
      for (const f of STYLELINT_CONFIG_FILES) {
        const configPath = path.join(cwd, f);
        if (await fsExists(configPath)) {
          configFile = configPath;
          break;
        }
      }

      // Support TypeScript config files: load with jiti, pass as config object
      let stylelintOptions: stylelint.LinterOptions;
      if (configFile != null && /\.ts$/.test(configFile)) {
        const jiti = createJiti(import.meta.url);
        const configModule = await jiti.import<{ default: stylelint.Config }>(configFile);
        const config = configModule.default;
        stylelintOptions = {
          files: cssFiles,
          config,
          configBasedir: cwd,
          fix,
          cache: true,
          cacheLocation: path.join(cwd, ".cache", "stylelint.cache"),
        };
      } else {
        stylelintOptions = {
          files: cssFiles,
          configFile,
          fix,
          cache: true,
          cacheLocation: path.join(cwd, ".cache", "stylelint.cache"),
        };
      }
      stylelintResult = await stylelint.lint(stylelintOptions);
      logger.success("Stylelint execution complete");
    }
  }

  // Return success result if no files or lint was not executed
  if (files.length === 0 || eslintResults == null || eslint == null) {
    logger.info("no files to lint");
    return { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" };
  }

  // Aggregate results
  let errorCount = eslintResults.sum((r) => r.errorCount);
  let warningCount = eslintResults.sum((r) => r.warningCount);

  if (errorCount > 0) {
    logger.error("lint errors occurred", { errorCount, warningCount });
  } else if (warningCount > 0) {
    logger.info("lint complete (warnings present)", { errorCount, warningCount });
  } else {
    logger.info("lint complete", { errorCount, warningCount });
  }

  // Collect formatter output
  let formattedOutput = "";
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(eslintResults);
  if (resultText) {
    formattedOutput += resultText;
  }

  // Collect Stylelint results
  if (stylelintResult != null && stylelintResult.results.length > 0) {
    const stylelintErrorCount = stylelintResult.results.sum(
      (r) => r.warnings.filter((w) => w.severity === "error").length,
    );
    const stylelintWarningCount = stylelintResult.results.sum(
      (r) => r.warnings.filter((w) => w.severity === "warning").length,
    );

    errorCount += stylelintErrorCount;
    warningCount += stylelintWarningCount;

    if (stylelintErrorCount > 0) {
      logger.error("Stylelint errors occurred", {
        errorCount: stylelintErrorCount,
        warningCount: stylelintWarningCount,
      });
    } else if (stylelintWarningCount > 0) {
      logger.info("Stylelint complete (warnings present)", {
        errorCount: stylelintErrorCount,
        warningCount: stylelintWarningCount,
      });
    } else {
      logger.info("Stylelint complete", {
        errorCount: stylelintErrorCount,
        warningCount: stylelintWarningCount,
      });
    }

    // Stylelint formatter output
    const stylelintFormatter = await stylelint.formatters.string;
    const stylelintOutput = stylelintFormatter(stylelintResult.results, stylelintResult);
    if (stylelintOutput) {
      formattedOutput += stylelintOutput;
    }
  }

  return {
    success: errorCount === 0,
    errorCount,
    warningCount,
    formattedOutput,
  };
}

/**
 * Run ESLint.
 *
 * Wrapper that calls executeLint(), outputs results to stdout, and sets exitCode.
 *
 * @param options - lint execution options
 * @returns resolves when complete. If errors are found, sets `process.exitCode` to 1 and resolves (does not throw)
 */
export async function runLint(options: LintOptions): Promise<void> {
  const result = await executeLint(options);
  if (result.formattedOutput) {
    process.stdout.write(result.formattedOutput);
  }
  if (!result.success) {
    process.exitCode = 1;
  }
}

//#endregion
