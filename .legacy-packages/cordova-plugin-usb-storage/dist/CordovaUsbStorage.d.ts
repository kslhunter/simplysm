/**
 * USB 저장장치와 상호작용하기 위한 Cordova 플러그인 클래스
 */
export declare abstract class CordovaUsbStorage {
    /**
     * 연결된 USB 장치 목록을 가져옴
     * @returns 연결된 USB 장치 정보 배열
     */
    static getDevices(): Promise<{
        deviceName: string;
        manufacturerName: string;
        productName: string;
        vendorId: number;
        productId: number;
    }[]>;
    /**
     * USB 장치 접근 권한을 요청
     * @param filter 권한을 요청할 USB 장치의 vendorId와 productId
     * @returns 권한 승인 여부
     */
    static requestPermission(filter: {
        vendorId: number;
        productId: number;
    }): Promise<boolean>;
    /**
     * USB 장치 접근 권한이 있는지 확인
     * @param filter 권한을 확인할 USB 장치의 vendorId와 productId
     * @returns 권한 보유 여부
     */
    static hasPermission(filter: {
        vendorId: number;
        productId: number;
    }): Promise<boolean>;
    /**
     * USB 저장장치의 디렉토리 내용을 읽어옴
     * @param filter 대상 USB 장치의 vendorId와 productId
     * @param dirPath 읽어올 디렉토리 경로
     * @returns 디렉토리 내 파일/폴더 이름 배열
     */
    static readdir(filter: {
        vendorId: number;
        productId: number;
    }, dirPath: string): Promise<string[]>;
    /**
     * USB 저장장치의 파일을 읽어옴
     * @param filter 대상 USB 장치의 vendorId와 productId
     * @param filePath 읽어올 파일 경로
     * @returns 파일 데이터를 담은 Buffer 또는 undefined
     */
    static read(filter: {
        vendorId: number;
        productId: number;
    }, filePath: string): Promise<Buffer | undefined>;
}
