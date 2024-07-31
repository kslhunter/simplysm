declare const SdUsbStorage: {
  getDevices(): Promise<{
    deviceName: string;
    manufacturerName: string;
    productName: string;
    vendorId: number;
    productId: number;
  }[]>;
  requestPermission: (filter: { vendorId: number; productId: number; }) => Promise<void>;
  readdir: (filter: { vendorId: number; productId: number; }, filePath: string) => Promise<string[]>;
};