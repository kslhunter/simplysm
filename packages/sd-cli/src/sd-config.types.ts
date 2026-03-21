/**
 * Build target type (built with esbuild)
 * - node: Node.js only package
 * - browser: browser only package
 * - neutral: Node/browser shared package
 */
export type BuildTarget = "node" | "browser" | "neutral";

//#region Publish configuration types

/**
 * npm registry publish configuration
 */
export interface SdNpmPublishConfig {
  type: "npm";
}

/**
 * Package publish configuration
 * - SdNpmPublishConfig: deploy to npm registry
 * - SdLocalDirectoryPublishConfig: copy to local directory
 * - SdStoragePublishConfig: upload to FTP/FTPS/SFTP server
 */
export type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;

/**
 * Local directory publish configuration
 */
export interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  /** deployment target path (supports environment variable substitution: %VER%, %PROJECT%) */
  path: string;
}

/**
 * Storage (FTP/FTPS/SFTP) publish configuration
 */
export interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  password?: string;
}

/**
 * postPublish script configuration
 */
export interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  /** script arguments (supports environment variable substitution: %VER%, %PROJECT%) */
  args: string[];
}

//#endregion

/**
 * Package configuration (node/browser/neutral)
 */
export interface SdBuildPackageConfig {
  /** build target */
  target: BuildTarget;
  /** publish configuration */
  publish?: SdPublishConfig;
  /** glob patterns for files to copy from src/ to dist/ (relative path based on src/) */
  copySrc?: string[];
}

/**
 * Capacitor Android sign configuration
 */
export interface SdCapacitorSignConfig {
  /** keystore file path (relative path based on package directory) */
  keystore: string;
  /** keystore password */
  storePassword: string;
  /** key alias */
  alias: string;
  /** key password */
  password: string;
  /** keystore type (default: "jks") */
  keystoreType?: string;
}

/**
 * Capacitor Android permission configuration
 */
export interface SdCapacitorPermission {
  /** permission name (e.g., "CAMERA", "WRITE_EXTERNAL_STORAGE") */
  name: string;
  /** maximum SDK version */
  maxSdkVersion?: number;
  /** tools:ignore attribute value */
  ignore?: string;
}

/**
 * Capacitor Android Intent Filter configuration
 */
export interface SdCapacitorIntentFilter {
  /** intent action (e.g., "android.intent.action.VIEW") */
  action?: string;
  /** intent category (e.g., "android.intent.category.DEFAULT") */
  category?: string;
}

/**
 * Capacitor Android platform configuration
 */
export interface SdCapacitorAndroidConfig {
  /** AndroidManifest.xml application tag attributes (e.g., { requestLegacyExternalStorage: "true" }) */
  config?: Record<string, string>;
  /** AAB bundle build flag (false for APK) */
  bundle?: boolean;
  /** Intent Filter configuration */
  intentFilters?: SdCapacitorIntentFilter[];
  /** APK/AAB signing configuration */
  sign?: SdCapacitorSignConfig;
  /** Android SDK version (minSdk, targetSdk) */
  sdkVersion?: number;
  /** additional permission configuration */
  permissions?: SdCapacitorPermission[];
}

/**
 * Capacitor configuration
 */
export interface SdCapacitorConfig {
  /** app ID (e.g., "com.example.app") */
  appId: string;
  /** app name */
  appName: string;
  /** Capacitor plugin configuration (key: package name, value: true or plugin options) */
  plugins?: Record<string, Record<string, unknown> | true>;
  /** app icon path (relative path based on package directory) */
  icon?: string;
  /** debug build flag */
  debug?: boolean;
  /** per-platform configuration */
  platform?: {
    android?: SdCapacitorAndroidConfig;
  };
}

/**
 * Electron configuration
 */
export interface SdElectronConfig {
  /** Electron app ID (e.g., "com.example.myapp") */
  appId: string;
  /** portable .exe (true) or NSIS installer (false/unspecified) */
  portable?: boolean;
  /** installer icon path (.ico, relative path based on package directory) */
  installerIcon?: string;
  /** npm packages to include in Electron (native modules, etc.) */
  reinstallDependencies?: string[];
  /** npm postinstall script */
  postInstallScript?: string;
  /** NSIS options (when portable is false) */
  nsisOptions?: Record<string, unknown>;
  /** environment variables (accessible via process.env in electron-main.ts) */
  env?: Record<string, string>;
}

/**
 * Client package configuration (Vite development server)
 */
export interface SdClientPackageConfig {
  /** build target */
  target: "client";
  /**
   * server configuration
   * - string: server package name to connect to (e.g., "solid-demo-server")
   * - number: use Vite port directly (backward compatibility)
   */
  server: string | number;
  /** environment variables to substitute during build (replace process.env with object) */
  env?: Record<string, string>;
  /** publish configuration */
  publish?: SdPublishConfig;
  /** Capacitor configuration */
  capacitor?: SdCapacitorConfig;
  /** Electron configuration */
  electron?: SdElectronConfig;
  /** runtime config (written to dist/.config.json during build) */
  configs?: Record<string, unknown>;
  /** packages to exclude from Vite optimizeDeps and add to Capacitor/Electron package.json */
  exclude?: string[];
}

/**
 * Server package configuration (Fastify server)
 */
export interface SdServerPackageConfig {
  /** build target */
  target: "server";
  /** environment variables to substitute during build (replace process.env.KEY with constant) */
  env?: Record<string, string>;
  /** publish configuration */
  publish?: SdPublishConfig;
  /** runtime config (written to dist/.config.json during build) */
  configs?: Record<string, unknown>;
  /** external modules not to include in esbuild bundle (in addition to automatic binding.gyp detection) */
  externals?: string[];
  /** PM2 configuration (generates dist/pm2.config.cjs when specified) */
  pm2?: {
    /** PM2 process name (generated from package.json name if unspecified) */
    name?: string;
    /** paths to exclude from PM2 watch */
    ignoreWatchPaths?: string[];
  };
  /** Package manager to use (affects mise.toml or volta settings generation) */
  packageManager?: "volta" | "mise";
}

/**
 * Watch hook configuration for scripts packages
 */
export interface SdWatchHookConfig {
  /** glob patterns to watch (relative to package directory) */
  target: string[];
  /** command to execute on change */
  cmd: string;
  /** command arguments */
  args?: string[];
}

/**
 * Scripts-only package configuration (excluded from watch/typecheck unless watch hook is configured)
 */
export interface SdScriptsPackageConfig {
  /** build target */
  target: "scripts";
  /** publish configuration */
  publish?: SdPublishConfig;
  /** watch hook configuration (when set, package is included in watch mode) */
  watch?: SdWatchHookConfig;
}

/**
 * Package configuration
 */
export type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;

/**
 * sd.config.ts configuration type
 */
export interface SdConfig {
  /** per-package configuration (key: subdirectory name under packages/, e.g., "core-common") */
  packages: Record<string, SdPackageConfig | undefined>;
  /**
   * dependency replacement configuration (replace node_modules packages with local sources via symlink)
   * - key: package glob pattern to find in node_modules (e.g., "@simplysm/*")
   * - value: source directory path (captured values from key's * are substituted into value's *)
   * - example: { "@simplysm/*": "../simplysm/packages/*" }
   */
  replaceDeps?: Record<string, string>;
  /** script to execute after deployment completes */
  postPublish?: SdPostPublishScriptConfig[];
}

/**
 * parameters passed to sd.config.ts function
 */
export interface SdConfigParams {
  /** current working directory */
  cwd: string;
  /** development mode flag */
  dev: boolean;
  /** additional options (from CLI's -o flag) */
  options: string[];
}

/**
 * sd.config.ts must default export a function of the following form:
 *
 * ```typescript
 * import type { SdConfig, SdConfigFn, SdConfigParams } from "@simplysm/sd-cli";
 *
 * const config: SdConfigFn = (params: SdConfigParams) => ({
 *   packages: {
 *     "core-common": { target: "neutral" },
 *     "core-node": { target: "node" },
 *   },
 * });
 *
 * export default config;
 * ```
 */
export type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
