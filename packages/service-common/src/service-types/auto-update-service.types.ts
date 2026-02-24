/**
 * Auto-update service interface
 *
 * Retrieves the latest version info for client applications.
 */
export interface AutoUpdateService {
  /**
   * Retrieve the latest version info for the specified platform.
   * @param platform Target platform (e.g., "win32", "darwin", "linux")
   * @returns Latest version info, or undefined if no version exists
   */
  getLastVersion(platform: string): Promise<
    | {
        version: string;
        downloadPath: string;
      }
    | undefined
  >;
}
