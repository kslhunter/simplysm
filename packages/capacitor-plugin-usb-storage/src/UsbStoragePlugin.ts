export interface UsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}

export interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}

export interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}

export interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
