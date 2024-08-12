declare const SdLocalBaseUrl: {
  setUrl: (url: string) => Promise<void>;
  getUrl: () => Promise<string>;
};