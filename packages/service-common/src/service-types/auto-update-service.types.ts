export interface IAutoUpdateService {
  getLastVersion(platform: string):
    | {
        version: string;
        downloadPath: string;
      }
    | undefined;
}
