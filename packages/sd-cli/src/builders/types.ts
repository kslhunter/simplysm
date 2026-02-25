import type { SdPackageConfig } from "../sd-config.types";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/rebuild-manager";

/**
 * Package information
 */
export interface PackageInfo {
  name: string;
  dir: string;
  config: SdPackageConfig;
}

/**
 * Common Builder options
 */
export interface BuilderOptions {
  cwd: string;
  packages: PackageInfo[];
  resultCollector: ResultCollector;
  rebuildManager?: RebuildManager;
}

/**
 * Builder interface
 *
 * Common interface that all Builders must implement
 */
export interface IBuilder {
  /**
   * Initialize Builder (create Workers, register event handlers)
   */
  initialize(): Promise<void>;

  /**
   * One-time build (for production builds)
   */
  build(): Promise<void>;

  /**
   * Start watch mode
   * Promise resolves when initial build is complete
   */
  startWatch(): Promise<void>;

  /**
   * Shutdown Builder (clean up Workers)
   */
  shutdown(): Promise<void>;

  /**
   * Get initial build Promise map (for Listr tasks)
   */
  getInitialBuildPromises(): Map<string, Promise<void>>;
}
