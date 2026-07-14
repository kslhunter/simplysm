# @simplysm/capacitor-plugin-intent

Android 디바이스의 Intent 기능을 JavaScript에서 제어하는 Capacitor 플러그인임. 브로드캐스트 수신/송신, 앱 실행 인텐트 조회, 외부 Activity 실행 및 결과 수신이 가능함.

**주요 용도**: 산업용 디바이스(바코드 스캐너, PDA 등) 연동을 통한 Intent 기반 통신.

**플랫폼 지원**: Android (네이티브). 웹 환경에서는 경고 로그를 남기고 stub 값을 반환함.

---

## Intent — 정적 API

`abstract class Intent`는 registerPlugin으로 등록된 플러그인을 감싼 정적 API임. 인스턴스를 생성하지 않고 모든 메서드를 정적으로 호출함.

### subscribe(filters, callback) → Promise<() => Promise<void>>

Android 브로드캐스트 수신기를 등록함.

**매개변수:**

- `filters`: `string[]` — 수신할 브로드캐스트 액션 문자열 배열 (예: `["android.intent.action.BATTERY_LOW"]`)
- `callback`: `(result: IntentResult) => void` — 브로드캐스트 수신 시 호출되는 함수

**반환값:** 구독 해제 함수 (`async () => void`). 이 함수를 호출하면 리스너가 제거됨.

**동작:**

- 플러그인에 필터를 등록하면 내부 ID가 발급됨.
- 초기 응답(ID만 포함된 `{ id }`)은 `result.action != null` 검사로 필터링되어 콜백에 전달되지 않음.
- 실제 브로드캐스트(action 포함)가 도착할 때만 콜백이 호출됨.

**예시:**

```typescript
const unsubscribe = await Intent.subscribe(["com.scanner.ACTION_BARCODE"], (result) => {
  console.log("액션:", result.action);
  console.log("데이터:", result.extras);
});

// 리스너 해제
await unsubscribe();
```

---

### unsubscribeAll() → Promise<void>

모든 등록된 브로드캐스트 수신기를 한 번에 해제함.

**동작:** 플러그인의 `unsubscribeAll` 메서드를 호출하여 활성 구독을 모두 정리함.

---

### send(options) → Promise<void>

Android 브로드캐스트를 시스템에 전송함.

**매개변수:**

- `options.action`: `string` — 전송할 브로드캐스트 액션 이름 (필수)
- `options.extras`: `Record<string, unknown>` (선택) — 추가 데이터 객체

**동작:** 지정된 액션과 데이터를 포함한 브로드캐스트를 전송함.

**예시:**

```typescript
await Intent.send({
  action: "com.device.REQUEST_UPDATE",
  extras: { mode: "sync", timeout: 5000 },
});
```

---

### getLaunchIntent() → Promise<IntentResult>

앱이 인텐트를 통해 실행될 때 전달받은 초기 인텐트를 조회함.

**반환값:** `IntentResult` — 앱 시작 시점의 인텐트 정보

**동작:**

- 앱이 다른 앱에서 인텐트로 호출되었을 때, 그 인텐트의 액션과 데이터를 반환함.
- 정상 시작인 경우 빈 객체를 반환할 수 있음.

**예시:**

```typescript
const launchIntent = await Intent.getLaunchIntent();
if (launchIntent.action === "com.example.OPEN_DOCUMENT") {
  const docId = launchIntent.extras?.["doc_id"];
  loadDocument(docId);
}
```

---

### addListener(eventName, callback) → Promise<PluginListenerHandle>

앱 실행 중 수신되는 새로운 인텐트에 대한 리스너를 등록함.

**매개변수:**

- `eventName`: `"newIntent"` (고정) — 새 인텐트 이벤트
- `callback`: `(result: IntentResult) => void` — 새 인텐트 도착 시 호출될 함수

**반환값:** `PluginListenerHandle` — 핸들 객체 (`.remove()` 메서드로 해제)

**동작:**

- `subscribe`와 달리 필터 없이 앱이 **실행 중인 상태에서 들어오는 모든 인텐트**를 감시함.
- 핸들의 `.remove()` 메서드를 호출하면 개별 리스너가 제거됨.

**예시:**

```typescript
const handle = await Intent.addListener("newIntent", (result) => {
  console.log("새 인텐트:", result.action);
  updateUI(result.extras);
});

// 나중에
await handle.remove();
```

---

### removeAllListeners() → Promise<void>

`addListener`로 등록된 모든 이벤트 리스너를 제거함.

**동작:** 플러그인의 `removeAllListeners` 메서드를 호출하여 모든 `newIntent` 리스너를 정리함.

---

### startActivityForResult(options) → Promise<StartActivityForResultResult>

외부 Activity를 실행하고 실행 결과를 수신함.

**매개변수:** `StartActivityForResultOptions`

- `action`: `string` (선택) — Intent 액션 (예: `"android.intent.action.VIEW"`, `"android.intent.action.GET_CONTENT"`)
- `uri`: `string` (선택) — 대상 URI (예: `"content://media/external/images/media/1"`, `"https://example.com"`)
- `type`: `string` (선택) — MIME type (예: `"image/*"`, `"text/plain"`, `"application/pdf"`)
- `packageName`: `string` (선택) — 특정 패키지명으로 제한 (예: `"com.android.camera"`)
- `className`: `string` (선택) — 특정 Activity 클래스명으로 제한 (예: `"com.camera.MainActivity"`)
- `extras`: `Record<string, unknown>` (선택) — 추가 데이터
- `flags`: `number` (선택) — Intent flags 숫자값

**반환값:** `StartActivityForResultResult`

- `resultCode`: `number` — 결과 코드 (0=RESULT_CANCELED, -1=RESULT_OK, 기타 사용자 정의)
- `data`: 결과 인텐트 데이터 (선택) — `action`, `uri`, `extras` 포함 가능

**동작:**

1. 조건에 맞는 Activity를 찾아 실행함.
2. 사용자가 Activity를 완료할 때까지 기다림.
3. 결과 코드와 반환 데이터를 반환함.

**예시:**

```typescript
// 갤러리에서 이미지 선택
const result = await Intent.startActivityForResult({
  action: "android.intent.action.GET_CONTENT",
  type: "image/*",
});

if (result.resultCode === -1) {
  // RESULT_OK
  const imageUri = result.data?.uri;
  uploadImage(imageUri);
} else {
  console.log("선택 취소됨");
}
```

---

## 데이터 타입

### IntentResult

브로드캐스트 또는 인텐트 내용을 표현함.

```typescript
interface IntentResult {
  /** 브로드캐스트 또는 인텐트의 액션 문자열 (예: "android.intent.action.BATTERY_LOW") */
  action?: string;

  /** 인텐트에 포함된 추가 데이터 */
  extras?: Record<string, unknown>;
}
```

**필드 설명:**

- `action`: 액션 문자열. 시스템 정의 액션 또는 커스텀 액션. 생략 가능.
- `extras`: 액션 데이터와 함께 전달되는 부가 정보. 객체 형태로 자유로운 값을 담을 수 있음.

---

### StartActivityForResultOptions

외부 Activity 실행 요청 매개변수임.

```typescript
interface StartActivityForResultOptions {
  /** Intent 액션 (예: "android.intent.action.VIEW") */
  action?: string;

  /** 데이터 URI (예: "content://...", "https://...") */
  uri?: string;

  /** 추가 데이터 객체 */
  extras?: Record<string, unknown>;

  /** MIME type (예: "image/*", "text/plain", "application/pdf") */
  type?: string;

  /** 특정 앱 패키지명으로 대상 제한 (예: "com.google.android.gms") */
  packageName?: string;

  /** 특정 Activity 클래스명으로 대상 제한 (예: "com.example.Activity") */
  className?: string;

  /** Intent flags 숫자값 (플래그 합산) */
  flags?: number;
}
```

**필드 설명:**

- `action`: 어떤 작업을 수행할 것인지 지시하는 문자열. `packageName`/`className` 없으면 Android는 이 액션을 처리할 앱을 찾음.
- `uri`: 처리 대상 데이터 주소. `type`과 함께 사용하면 앱 선택 다이얼로그가 표시됨.
- `type`: MIME type. `uri` 없이 `type`만 지정하면 해당 타입을 처리할 앱들을 필터링함.
- `packageName`/`className`: 직접 지정하면 특정 앱/Activity만 실행되므로 선택 다이얼로그 없이 즉시 실행됨.
- `flags`: Intent.FLAG_* 상수들을 비트 OR로 합산한 값. (예: `Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP`)

---

### StartActivityForResultResult

Activity 실행 결과임.

```typescript
interface StartActivityForResultResult {
  /** 결과 코드 (0=RESULT_CANCELED, -1=RESULT_OK, 기타 사용자 정의) */
  resultCode: number;

  /** Activity가 반환한 데이터 (생략 가능) */
  data?: {
    action?: string;
    uri?: string;
    extras?: Record<string, unknown>;
  };
}
```

**필드 설명:**

- `resultCode`: Activity 실행 종료 코드. -1(RESULT_OK)는 성공, 0(RESULT_CANCELED)는 취소, 그 외 앱 정의 코드.
- `data.action`: 결과 인텐트의 액션.
- `data.uri`: 결과 인텐트의 URI (예: 선택된 이미지 경로).
- `data.extras`: 결과 인텐트의 부가 데이터.

---

### IntentPlugin (저수준 계약)

`Intent` 정적 API가 내부에서 호출하는 Capacitor 플러그인 인터페이스임. 네이티브(Android)와 웹(`IntentWeb`) 구현이 이 계약을 따름.

```typescript
interface IntentPlugin {
  subscribe(
    options: { filters: string[] },
    callback: (result: IntentResult) => void,
  ): Promise<{ id: string }>;

  unsubscribe(options: { id: string }): Promise<void>;

  unsubscribeAll(): Promise<void>;

  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;

  getLaunchIntent(): Promise<IntentResult>;

  addListener(
    eventName: "newIntent",
    listenerFunc: (data: IntentResult) => void,
  ): Promise<PluginListenerHandle>;

  removeAllListeners(): Promise<void>;

  startActivityForResult(
    options: StartActivityForResultOptions,
  ): Promise<StartActivityForResultResult>;
}
```

일반적으로 `Intent` 정적 메서드를 사용하며, 이 인터페이스는 구현·해석 확인 목적임.

---

## 웹 환경 지원

`IntentWeb` 클래스가 웹 환경용 구현을 제공함.

**웹에서의 동작:**

- `subscribe` → 경고 로그, `{ id: "web-stub" }` 반환
- `send` → 경고 로그, Promise.resolve()
- `startActivityForResult` → 경고 로그, `{ resultCode: 0 }` 반환
- `unsubscribe` / `unsubscribeAll` → 아무 동작 없음 (no-op)
- `getLaunchIntent` → 빈 객체 `{}` 반환

**실 동작은 Android 디바이스/에뮬레이터에서만 이루어짐.** 웹 브라우저에서 개발 시 이 차이를 고려함.

---

## 사용 예시

### 예시 1: PDA 바코드 스캐너 수신

```typescript
// 컴포넌트 초기화 시
async ngOnInit() {
  this.unsubscribeBarcode = await Intent.subscribe(
    ["com.scanner.ACTION_BARCODE_SCANNED"],
    (result) => {
      const barcodeValue = result.extras?.["barcode"];
      this.processBarcode(barcodeValue);
    }
  );
}

// 컴포넌트 제거 시
async ngOnDestroy() {
  if (this.unsubscribeBarcode) {
    await this.unsubscribeBarcode();
  }
}
```

### 예시 2: 앱 시작 인텐트 확인

```typescript
// 앱 부트스트랩 시
async initializeApp() {
  const launchIntent = await Intent.getLaunchIntent();

  if (launchIntent.action === "com.myapp.OPEN_TICKET") {
    const ticketId = launchIntent.extras?.["ticket_id"];
    this.router.navigate(["/tickets", ticketId]);
  }
}
```

### 예시 3: 갤러리에서 이미지 선택

```typescript
async selectImage() {
  const result = await Intent.startActivityForResult({
    action: "android.intent.action.GET_CONTENT",
    type: "image/*"
  });

  if (result.resultCode === -1 && result.data?.uri) {
    this.selectedImageUri = result.data.uri;
    await this.uploadImage(result.data.uri);
  } else {
    console.log("이미지 선택 취소");
  }
}
```

### 예시 4: 새 인텐트 이벤트 리스너

```typescript
async setupIntentListener() {
  const handle = await Intent.addListener("newIntent", (result) => {
    console.log("새 인텐트 도착:", result.action);

    if (result.action === "com.myapp.REFRESH_DATA") {
      this.refreshDataFromServer();
    }
  });

  this.intentListenerHandle = handle;
}

ngOnDestroy() {
  if (this.intentListenerHandle) {
    this.intentListenerHandle.remove();
  }
}
```

---

## 주의사항

1. **Android 권한**: `AndroidManifest.xml`에서 필요한 권한을 명시해야 함.
   - 브로드캐스트 수신: API 31 이상에서는 명시적 필터 필요
   - 특정 기능에 따라 추가 권한 필요 (카메라, 파일 접근 등)

2. **메모리 누수 방지**: `subscribe` 또는 `addListener` 등록 후 반드시 리스너를 제거해야 함.
   - Angular 컴포넌트의 경우 `ngOnDestroy`에서 정리
   - 단일 `unsubscribe` 또는 `handle.remove()` 사용

3. **웹에서 완전 테스트 불가**: 브라우저 환경에서는 Intent 기능을 테스트할 수 없음.
   - 실제 Android 디바이스 또는 에뮬레이터에서 검증 필수

4. **액션 문자열 정확성**: 브로드캐스트 액션은 정확한 문자열이어야 수신됨.
   - 디바이스 제조사 또는 타사 앱 문서 참고
   - 오타는 브로드캐스트 수신 실패를 초래

5. **타이밍**: `getLaunchIntent()`는 **앱 시작 직후 가능한 빨리** 호출해야 정확한 데이터를 얻을 수 있음.

---

## 트리거 인덱스

이 문서를 언제 참고하는지:

- **Intent 메서드** — 브로드캐스트 구독/해제/전송, 앱 실행 인텐트 조회, 새 인텐트 리스너, startActivityForResult 호출 코드 작성 시
- **IntentResult** — 브로드캐스트/인텐트 콜백의 `action`/`extras` 타입 구성 시
- **StartActivityForResultOptions / StartActivityForResultResult** — 외부 Activity 실행 옵션과 결과 처리 시
- **웹 환경 지원** — 테스트 환경과 배포 환경의 동작 차이 확인 시
