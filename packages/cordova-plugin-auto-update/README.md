# @simplysm/cordova-plugin-auto-update

코르도바 앱의 자동 업데이트 기능을 제공하는 플러그인입니다.

## 설치

```bash
cordova plugin add @simplysm/cordova-plugin-auto-update
```

## 주요 기능

- Android 앱의 자동 업데이트 지원
- 서버에서 최신 버전 확인
- 자동 다운로드 및 설치
- 업데이트 진행 상황 로깅
- 앱 재시작 시 새 버전 적용

## 사용 방법

### 초기화 및 실행

```typescript
import { CordovaAutoUpdate } from '@simplysm/cordova-plugin-auto-update';
import { SdServiceClient } from '@simplysm/sd-service-client';

// 자동 업데이트 실행
await CordovaAutoUpdate.runAsync({
  // 로그 메시지 처리
  log: (msg) => console.log(msg),
  // 서버 클라이언트 설정
  serviceClient: new SdServiceClient("http://server-url")
});
```

### 업데이트 프로세스

1. 현재 설치된 버전 확인
2. 서버의 최신 버전 확인
3. 버전이 다른 경우:
   - 최신 버전 파일 다운로드
   - 다운로드한 파일 압축 해제
   - 새 버전 설치
   - 앱 재시작 시 새 버전 적용

### 로깅 메시지

업데이트 과정에서 다음과 같은 로그 메시지가 출력됩니다:
- "보유버전 확인 중..."
- "최신버전 확인 중..."
- "최신버전 파일 다운로드중... (진행률%)"
- "최신버전 파일 압축해제..."
- "최신버전 설치 완료..."
- "최신버전 실행..."

## 의존성

- @simplysm/cordova-plugin-app-storage: 12.5.60
- @simplysm/sd-core-common: 12.5.60
- @simplysm/sd-service-client: 12.5.60
- @simplysm/types-cordova-plugin-ionic-webview: 12.5.60
- jszip: ^3.10.1
- rxjs: ^7.8.1

## 지원 플랫폼

- Android

## 라이선스

MIT

## 작성자

김석래 