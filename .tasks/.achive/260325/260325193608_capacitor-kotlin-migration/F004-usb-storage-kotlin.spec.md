# F004 usb-storage 플러그인 Kotlin 전환 - 수동 테스트

## 전제 조건

- USB mass storage 장치가 Android 디바이스에 연결되어 있다
- Capacitor 앱이 디바이스에 설치되어 있다
- 앱이 USB 디바이스에 접근 가능한 상태이다

## 수행 절차

1. 앱을 실행하고 USB 장치를 연결한다
2. `getDevices`를 호출하여 장치 목록을 확인한다
3. `requestPermissions`를 vendorId/productId와 함께 호출하여 권한을 요청한다
4. 권한 다이얼로그에서 허용을 선택한다
5. `checkPermissions`를 호출하여 권한이 부여되었는지 확인한다
6. `readdir`을 root 경로로 호출하여 디렉토리 목록을 확인한다
7. `readFile`을 기존 파일 경로로 호출하여 파일을 읽는다

## 기대 결과

- `getDevices`: deviceName, manufacturerName, productName, vendorId, productId가 포함된 장치 목록을 반환한다
- `requestPermissions`: 권한 부여 후 `{ granted: true }`를 반환한다
- `checkPermissions`: `{ granted: true }`를 반환한다
- `readdir`: name, isDirectory가 포함된 파일 목록을 반환한다
- `readFile`: Base64 인코딩된 파일 데이터를 반환한다
- 모든 동작이 Java 버전과 동일하게 작동한다
