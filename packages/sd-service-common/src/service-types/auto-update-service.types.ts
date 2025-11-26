export interface ISdAutoUpdateService {
  getLastVersion(
    platform: string,
    apk?: boolean,
  ):
    | {
        version: string;
        downloadPath: string;
      }
    | undefined;
}
