declare const SdUsbStorage: {
  getDevices(): Promise<
    {
      deviceName: string;
      manufacturerName: string;
      productName: string;
      vendorId: number;
      productId: number;
    }[]
  >;

  requestPermission(filter: { vendorId: number; productId: number }): Promise<boolean>;
  hasPermission(filter: { vendorId: number; productId: number }): Promise<boolean>;

  readdir(filter: { vendorId: number; productId: number }, dirPath: string): Promise<string[]>;
  read(filter: { vendorId: number; productId: number }, filePath: string): Promise<ArrayBuffer | undefined>;
};
