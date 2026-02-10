import { WebPlugin } from "@capacitor/core";
import type { IUsbDeviceFilter, IUsbDeviceInfo, IUsbStoragePlugin } from "../IUsbStoragePlugin";
export declare class UsbStorageWeb extends WebPlugin implements IUsbStoragePlugin {
  getDevices(): Promise<{
    devices: IUsbDeviceInfo[];
  }>;
  requestPermission(_options: IUsbDeviceFilter): Promise<{
    granted: boolean;
  }>;
  hasPermission(_options: IUsbDeviceFilter): Promise<{
    granted: boolean;
  }>;
  readdir(
    _options: IUsbDeviceFilter & {
      path: string;
    },
  ): Promise<{
    files: string[];
  }>;
  read(
    _options: IUsbDeviceFilter & {
      path: string;
    },
  ): Promise<{
    data: string | null;
  }>;
}
