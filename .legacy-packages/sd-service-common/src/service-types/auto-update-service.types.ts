export interface ISdAutoUpdateService {
  getLastVersion(platform: string):
    | {
        version: string;
        downloadPath: string;
      }
    | undefined;
}
