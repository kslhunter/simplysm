export interface ISdPackageBuilder {
  watchAsync(): Promise<void>;

  buildAsync(): Promise<void>;

  publishAsync(): Promise<void>;
}