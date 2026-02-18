import { registerPlugin } from "@capacitor/core";
import type {
  IUsbDeviceFilter,
  IUsbDeviceInfo,
  IUsbFileInfo,
  IUsbStoragePlugin,
} from "./IUsbStoragePlugin";
import type { Bytes } from "@simplysm/core-common";
import { bytesFromBase64 } from "@simplysm/core-common";

const UsbStoragePlugin = registerPlugin<IUsbStoragePlugin>("UsbStorage", {
  web: async () => {
    const { UsbStorageWeb } = await import("./web/UsbStorageWeb");
    return new UsbStorageWeb();
  },
});

/**
 * USB 저장장치와 상호작용하기 위한 플러그인
 * - Android: libaums 라이브러리를 통한 USB Mass Storage 접근
 * - Browser: IndexedDB 기반 가상 USB 저장소 에뮬레이션
 */
export abstract class UsbStorage {
  /**
   * 연결된 USB 장치 목록을 가져옴
   * @returns 연결된 USB 장치 정보 배열
   */
  static async getDevices(): Promise<IUsbDeviceInfo[]> {
    const result = await UsbStoragePlugin.getDevices();
    return result.devices;
  }

  /**
   * USB 장치 접근 권한을 요청
   * @param filter 권한을 요청할 USB 장치의 vendorId와 productId
   * @returns 권한 승인 여부
   */
  static async requestPermission(filter: IUsbDeviceFilter): Promise<boolean> {
    const result = await UsbStoragePlugin.requestPermission(filter);
    return result.granted;
  }

  /**
   * USB 장치 접근 권한이 있는지 확인
   * @param filter 권한을 확인할 USB 장치의 vendorId와 productId
   * @returns 권한 보유 여부
   */
  static async hasPermission(filter: IUsbDeviceFilter): Promise<boolean> {
    const result = await UsbStoragePlugin.hasPermission(filter);
    return result.granted;
  }

  /**
   * USB 저장장치의 디렉토리 내용을 읽어옴
   * @param filter 대상 USB 장치의 vendorId와 productId
   * @param dirPath 읽어올 디렉토리 경로
   * @returns 디렉토리 내 파일/폴더 정보 배열
   */
  static async readdir(filter: IUsbDeviceFilter, dirPath: string): Promise<IUsbFileInfo[]> {
    const result = await UsbStoragePlugin.readdir({ ...filter, path: dirPath });
    return result.files;
  }

  /**
   * USB 저장장치의 파일을 읽어옴
   * @param filter 대상 USB 장치의 vendorId와 productId
   * @param filePath 읽어올 파일 경로
   * @returns 파일 데이터를 담은 Bytes 또는 undefined
   */
  static async read(filter: IUsbDeviceFilter, filePath: string): Promise<Bytes | undefined> {
    const result = await UsbStoragePlugin.read({ ...filter, path: filePath });
    if (result.data == null) {
      return undefined;
    }
    return bytesFromBase64(result.data);
  }
}
