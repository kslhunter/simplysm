# @simplysm/cordova-plugin-usb-storage

안드로이드 기기에서 USB 저장 장치에 접근할 수 있는 코도바 플러그인입니다.

## 설치

```bash
cordova plugin add @simplysm/cordova-plugin-usb-storage
```

## 기능

- USB 저장 장치 목록 조회
- USB 저장 장치 접근 권한 요청/확인
- USB 저장 장치의 파일 및 디렉토리 목록 조회
- USB 저장 장치의 파일 읽기

## API

### getDevices()

연결된 USB 저장 장치 목록을 조회합니다.

```typescript
const devices = await SdUsbStorage.getDevices();
// 반환값 예시:
// [{
//   deviceName: "USB 장치명",
//   manufacturerName: "제조사명",
//   productName: "제품명",
//   vendorId: 1234,
//   productId: 5678
// }]
```

### requestPermission(filter)

USB 저장 장치에 대한 접근 권한을 요청합니다.

```typescript
const granted = await SdUsbStorage.requestPermission({
  vendorId: 1234,
  productId: 5678
});
```

### hasPermission(filter)

USB 저장 장치에 대한 접근 권한이 있는지 확인합니다.

```typescript
const hasPermission = await SdUsbStorage.hasPermission({
  vendorId: 1234,
  productId: 5678
});
```

### readdir(filter, dirPath)

USB 저장 장치의 특정 디렉토리 내 파일 목록을 조회합니다.

```typescript
const files = await SdUsbStorage.readdir({
  vendorId: 1234,
  productId: 5678
}, "/");
```

### read(filter, filePath)

USB 저장 장치의 파일을 읽어옵니다.

```typescript
const data = await SdUsbStorage.read({
  vendorId: 1234,
  productId: 5678
}, "/example.txt");
```

## 의존성

- [libaums](https://github.com/magnusja/libaums): USB 대용량 저장 장치 접근을 위한 안드로이드 라이브러리

## 라이선스

MIT

## 작성자

김석래
