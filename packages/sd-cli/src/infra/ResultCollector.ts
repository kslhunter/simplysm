/**
 * Build result status
 */
export interface BuildResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "pending" | "building" | "success" | "error" | "running";
  message?: string;
  port?: number;
}

/**
 * Class that collects and manages build results
 *
 * Manages build results from multiple Builders at a central location and
 * provides filtering and output functionality by status.
 */
export class ResultCollector {
  private readonly _results = new Map<string, BuildResult>();

  /**
   * Add result
   * @param result build result
   */
  add(result: BuildResult): void {
    const key = `${result.name}:${result.type}`;
    this._results.set(key, result);
  }

  /**
   * Get result by key
   * @param key result key (e.g., "core-common:build")
   */
  get(key: string): BuildResult | undefined {
    return this._results.get(key);
  }

  /**
   * Return internal Map (for backward compatibility)
   */
  toMap(): Map<string, BuildResult> {
    return this._results;
  }
}
