export interface IUsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}

export interface IUsbDeviceFilter {
  vendorId: number;
  productId: number;
}

export interface IUsbStoragePlugin {
  getDevices(): Promise<{ devices: IUsbDeviceInfo[] }>;
  requestPermission(options: IUsbDeviceFilter): Promise<{ granted: boolean }>;
  hasPermission(options: IUsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: IUsbDeviceFilter & { path: string }): Promise<{ files: string[] }>;
  read(options: IUsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
