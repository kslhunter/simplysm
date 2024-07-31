interface Ionic {
  Webview: {
    convertFileSrc: (url: string) => string;
    setServerBasePath: (path: string) => void;
    getServerBasePath: (callback: (r: string) => void) => void;
    persistServerBasePath: () => void;
  }
}