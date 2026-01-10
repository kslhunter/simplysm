export interface AutoUpdateService {
  getLastVersion(platform: string):
    | {
        version: string;
        downloadPath: string;
      }
    | undefined;
}
