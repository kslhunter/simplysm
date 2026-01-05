import { WebPlugin } from "@capacitor/core";
import type { IUsbDeviceFilter, IUsbDeviceInfo, IUsbStoragePlugin } from "../IUsbStoragePlugin";

export class UsbStorageWeb extends WebPlugin implements IUsbStoragePlugin {
  async getDevices(): Promise<{ devices: IUsbDeviceInfo[] }> {
    return await Promise.resolve({ devices: [] });
  }

  async requestPermission(_options: IUsbDeviceFilter): Promise<{ granted: boolean }> {
    alert("[UsbStorage] 웹 환경에서는 USB 저장장치 접근을 지원하지 않습니다.");
    return await Promise.resolve({ granted: false });
  }

  async hasPermission(_options: IUsbDeviceFilter): Promise<{ granted: boolean }> {
    return await Promise.resolve({ granted: false });
  }

  async readdir(_options: IUsbDeviceFilter & { path: string }): Promise<{ files: string[] }> {
    alert("[UsbStorage] 웹 환경에서는 USB 저장장치 접근을 지원하지 않습니다.");
    return await Promise.resolve({ files: [] });
  }

  async read(_options: IUsbDeviceFilter & { path: string }): Promise<{ data: string | null }> {
    alert("[UsbStorage] 웹 환경에서는 USB 저장장치 접근을 지원하지 않습니다.");
    return await Promise.resolve({ data: null });
  }
}
