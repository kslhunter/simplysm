import { registerPlugin } from "@capacitor/core";
import type {
  UsbDeviceFilter,
  UsbDeviceInfo,
  UsbFileInfo,
  UsbStoragePlugin,
} from "./UsbStoragePlugin";
import type { Bytes } from "@simplysm/core-common";
import { bytes } from "@simplysm/core-common";

const usbStoragePlugin = registerPlugin<UsbStoragePlugin>("UsbStorage", {
  web: async () => {
    const { UsbStorageWeb } = await import("./web/UsbStorageWeb");
    return new UsbStorageWeb();
  },
});

/**
 * USB 저장 장치 접근 플러그인
 * - Android: libaums 라이브러리를 통한 USB Mass Storage 접근
 * - Browser: IndexedDB 기반 가상 USB 저장소 에뮬레이션
 */
export abstract class UsbStorage {
  /**
   * 연결된 USB 장치 목록 조회
   * @returns 연결된 USB 장치 정보 배열
   */
  static async getDevices(): Promise<UsbDeviceInfo[]> {
    const result = await usbStoragePlugin.getDevices();
    return result.devices;
  }

  /**
   * USB 장치 접근 권한 요청
   * @param filter 권한을 요청할 USB 장치의 vendorId 및 productId
   * @returns 권한 승인 여부
   */
  static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean> {
    const result = await usbStoragePlugin.requestPermissions(filter);
    return result.granted;
  }

  /**
   * USB 장치 접근 권한 확인
   * @param filter 권한을 확인할 USB 장치의 vendorId 및 productId
   * @returns 권한 보유 여부
   */
  static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean> {
    const result = await usbStoragePlugin.checkPermissions(filter);
    return result.granted;
  }

  /**
   * USB 저장 장치에서 디렉토리 내용 읽기
   * @param filter 대상 USB 장치의 vendorId 및 productId
   * @param dirPath 읽을 디렉토리 경로
   * @returns 디렉토리 내 파일/폴더 정보 배열
   */
  static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]> {
    const result = await usbStoragePlugin.readdir({ ...filter, path: dirPath });
    return result.files;
  }

  /**
   * USB 저장 장치에서 파일 읽기
   * @param filter 대상 USB 장치의 vendorId 및 productId
   * @param filePath 읽을 파일 경로
   * @returns 파일 데이터를 포함하는 Bytes, 또는 undefined
   */
  static async readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined> {
    const result = await usbStoragePlugin.readFile({ ...filter, path: filePath });
    if (result.data == null) {
      return undefined;
    }
    return bytes.fromBase64(result.data);
  }
}
