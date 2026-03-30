import path from "path";
import type ts from "typescript";
import { ESLint } from "eslint";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:lint-with-program");

/**
 * Lint result returned by LintWithProgramRunner.lint()
 */
export interface LintWithProgramResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string;
}

/**
 * Options for LintWithProgramRunner constructor
 */
export interface LintWithProgramRunnerOptions {
  cwd: string;
  pkgName: string;
}

/**
 * Options for LintWithProgramRunner.lint()
 */
export interface LintRunOptions {
  program: ts.Program;
  /** When provided, only files in this set are linted (intersection with extracted files).
   *  Used in watch rebuild for incremental lint based on affected files. */
  affectedFiles?: ReadonlySet<string>;
}

/**
 * Runs ESLint using an existing ts.Program (avoids duplicate Program creation).
 *
 * - Extracts source files from program.getSourceFiles() filtered to pkgDir
 * - Excludes .d.ts files and node_modules paths
 * - Injects ts.Program via parserOptions.programs (typescript-eslint)
 * - Reuses ESLint instance across calls (watch mode optimization)
 */
export class LintWithProgramRunner {
  private readonly _cwd: string;
  private readonly _pkgName: string;
  private _eslint: ESLint | undefined;
  private _lastUseCache: boolean | undefined;
  private readonly _programsRef: ts.Program[] = [];

  constructor(options: LintWithProgramRunnerOptions) {
    this._cwd = options.cwd;
    this._pkgName = options.pkgName;
  }

  /**
   * Extract lint target files from ts.Program.
   * Includes all workspace source files (cwd scope), excludes .d.ts, node_modules, and Angular shims.
   */
  private _extractFiles(program: ts.Program): string[] {
    const normalizedCwd = this._cwd.replace(/\\/g, "/");
    const files: string[] = [];

    for (const sf of program.getSourceFiles()) {
      const fileName = sf.fileName.replace(/\\/g, "/");

      // Must be within workspace root
      if (!fileName.startsWith(normalizedCwd + "/")) {
        continue;
      }

      // Exclude declaration files
      if (sf.isDeclarationFile) {
        continue;
      }

      // Exclude node_modules
      if (fileName.includes("/node_modules/")) {
        continue;
      }

      // Exclude Angular type-check shim files (virtual, not on disk)
      if (fileName.endsWith(".ngtypecheck.ts")) {
        continue;
      }

      files.push(sf.fileName);
    }

    return files;
  }

  /**
   * Run ESLint on files from the given ts.Program.
   * When affectedFiles is provided, only the intersection is linted (watch rebuild).
   * Creates ESLint instance on first call, reuses on subsequent calls.
   */
  async lint(options: LintRunOptions): Promise<LintWithProgramResult> {
    const { program, affectedFiles } = options;

    // Extract target files (workspace scope)
    let files = this._extractFiles(program);

    // When affectedFiles is provided, intersect with extracted files
    if (affectedFiles != null) {
      files = files.filter((f) => affectedFiles.has(f.replace(/\\/g, "/")));
    }

    if (files.length === 0) {
      return {
        success: true,
        errorCount: 0,
        warningCount: 0,
        formattedOutput: "",
      };
    }

    // Update programs reference (mutable array — ESLint reads it on lintFiles)
    this._programsRef.length = 0;
    this._programsRef.push(program);

    // Cache policy: affected files-based incremental lint is more accurate than ESLint's
    // file-content-based cache (which misses dependency changes).
    // When affectedFiles is provided (watch rebuild), disable cache.
    // When not provided (one-time build), enable cache for performance.
    const useCache = affectedFiles == null;

    // Create new ESLint instance when cache policy changes or on first call
    if (this._eslint == null || this._lastUseCache !== useCache) {
      // ESLint Flat Config serializes languageOptions via languageOptionsToJSON(),
      // which recurses into parserOptions and throws on ts.Program methods.
      // Adding toJSON() to parserOptions returns a serializable representation
      // while keeping the actual programs array accessible to typescript-eslint.
      const parserOptions = {
        programs: this._programsRef,
        project: null,
        projectService: false,
        toJSON() {
          return { programs: "[ts.Program]", project: null, projectService: false };
        },
      };

      this._eslint = new ESLint({
        cwd: this._cwd,
        cache: useCache,
        cacheLocation: path.join(this._cwd, ".cache", `eslint-${this._pkgName.replace(/\//g, "-")}.cache`),
        overrideConfig: {
          languageOptions: {
            parserOptions,
          },
        },
      });
      this._lastUseCache = useCache;
    }

    // Run lint
    logger.debug(`[${this._pkgName}] 린트 시작 (${files.length}개 파일, affected: ${affectedFiles != null})`);
    const results = await this._eslint.lintFiles(files);

    // Aggregate results
    let errorCount = 0;
    let warningCount = 0;
    for (const r of results) {
      errorCount += r.errorCount;
      warningCount += r.warningCount;
    }

    // Format output
    const formatter = await this._eslint.loadFormatter("stylish");
    const formattedOutput = await formatter.format(results);

    logger.debug(`[${this._pkgName}] 린트 완료 (에러: ${errorCount}, 경고: ${warningCount})`);

    return {
      success: errorCount === 0,
      errorCount,
      warningCount,
      formattedOutput,
    };
  }
}
