import { WebPlugin } from "@capacitor/core";
export class UsbStorageWeb extends WebPlugin {
    async getDevices() {
        return await Promise.resolve({ devices: [] });
    }
    async requestPermission(_options) {
        alert("[UsbStorage] 웹 환경에서는 USB 저장장치 접근을 지원하지 않습니다.");
        return await Promise.resolve({ granted: false });
    }
    async hasPermission(_options) {
        return await Promise.resolve({ granted: false });
    }
    async readdir(_options) {
        alert("[UsbStorage] 웹 환경에서는 USB 저장장치 접근을 지원하지 않습니다.");
        return await Promise.resolve({ files: [] });
    }
    async read(_options) {
        alert("[UsbStorage] 웹 환경에서는 USB 저장장치 접근을 지원하지 않습니다.");
        return await Promise.resolve({ data: null });
    }
}
//# sourceMappingURL=UsbStorageWeb.js.map