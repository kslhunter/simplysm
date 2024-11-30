# @simplysm/cordova-plugin-app-storage

코르도바 앱의 로컬 저장소를 관리하는 플러그인입니다.

## 설치

```bash
cordova plugin add @simplysm/cordova-plugin-app-storage
```

## 주요 기능

- 앱의 로컬 저장소에 파일 읽기/쓰기
- JSON 데이터 저장 및 로드
- 디렉토리 생성 및 관리
- 파일/디렉토리 존재 여부 확인
- 파일/디렉토리 삭제

## 사용 방법

### 초기화

```typescript
import { CordovaAppStorage } from '@simplysm/cordova-plugin-app-storage';

// 기본 저장소 디렉토리 사용
const storage = new CordovaAppStorage();

// 커스텀 루트 디렉토리 지정
const storage = new CordovaAppStorage('/custom/path');
```

### JSON 데이터 다루기

```typescript
// JSON 파일 쓰기
await storage.writeJsonAsync('/data/config.json', { setting: 'value' });

// JSON 파일 읽기
const config = await storage.readJsonAsync('/data/config.json');
```

### 일반 파일 다루기

```typescript
// 파일 쓰기
await storage.writeAsync('/files/doc.txt', 'Hello World');

// 파일 읽기 (문자열)
const content = await storage.readFileAsync('/files/doc.txt');

// 파일 읽기 (Buffer)
const buffer = await storage.readFileBufferAsync('/files/doc.txt');
```

### 디렉토리 관리

```typescript
// 디렉토리 내용 읽기
const files = await storage.readdirAsync('/data');

// 파일/디렉토리 존재 여부 확인
const exists = await storage.exists('/data/config.json');

// 파일/디렉토리 삭제
await storage.removeAsync('/data/old-file.txt');
```

## 의존성

- @awesome-cordova-plugins/core: ^6.11.0
- @awesome-cordova-plugins/file: ^6.11.0
- @simplysm/sd-core-common: 12.5.60
- rxjs: ^7.8.1

## 지원 플랫폼

- Android

## 라이선스

MIT

## 작성자

김석래
