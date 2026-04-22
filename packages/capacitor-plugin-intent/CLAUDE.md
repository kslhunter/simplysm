# CLAUDE.md

> 이 패키지의 사용법 및 지침은 [README.md](./README.md) 및 [docs/](./docs/)를 참조한다.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/capacitor-plugin-intent` — Android 인텐트 플러그인. 브로드캐스트 송수신, 실행 인텐트 조회, 새 인텐트 이벤트 수신, `startActivityForResult`를 제공한다. 산업용 디바이스 연동(바코드 스캐너, PDA 등)을 위해 설계되었다. TypeScript 소스 4개 파일.

외부 의존성 없음 (`@capacitor/core`만 peerDependency).

## Architecture

```
src/
├── IntentPlugin.ts    ← Capacitor 플러그인 인터페이스 및 타입 (IntentResult, IntentPlugin 등)
├── Intent.ts          ← 플러그인 등록 및 정적 파사드 클래스
├── web/
│   └── IntentWeb.ts   ← 브라우저 폴백 (WebPlugin 상속, 스텁 반환)
└── index.ts           ← public API re-exports
android/
└── src/main/kotlin/kr/co/simplysm/capacitor/intent/
    └── IntentPlugin.kt ← Android 네이티브 구현 (Kotlin)
tests/
├── android-rename.spec.md            ← Android 리네이밍 요구사항 스펙 문서
├── intent-rename.spec.ts             ← IntentWeb 스텁 동작 검증
└── start-activity-for-result.spec.md ← startActivityForResult 요구사항 스펙 문서
```

## Key Patterns

### 레이어 구조

플러그인은 항상 3계층으로 구성된다:

1. **`*Plugin.ts`** — Capacitor 플러그인 인터페이스와 타입만 정의 (로직 없음)
2. **`*.ts` (파사드)** — `registerPlugin()`으로 플러그인을 등록하고, `abstract class`로 정적 메서드를 노출
3. **`web/*.ts`** — `WebPlugin`을 상속하는 브라우저 폴백

```typescript
// 1. 플러그인 인터페이스 (IntentPlugin.ts)
export interface IntentPlugin {
  subscribe(options: { filters: string[] }, callback: (result: IntentResult) => void): Promise<{ id: string }>;
  startActivityForResult(options: StartActivityForResultOptions): Promise<StartActivityForResultResult>;
}

// 2. 파사드 (Intent.ts)
const intentPlugin = registerPlugin<IntentPlugin>("Intent", {
  web: async () => {
    const { IntentWeb } = await import("./web/IntentWeb");
    return new IntentWeb();
  },
});

export abstract class Intent {
  static async subscribe(
    filters: string[],
    callback: (result: IntentResult) => void,
  ): Promise<() => Promise<void>> {
    const { id } = await intentPlugin.subscribe({ filters }, (result) => {
      if (result.action != null) { callback(result); } // 초기 resolve 필터링
    });
    return async () => { await intentPlugin.unsubscribe({ id }); };
  }
}
```

### subscribe/unsubscribe 반환 패턴

`Intent.subscribe()`는 구독 해제 함수를 반환한다. 플러그인 레벨의 `{ id }` 반환값을 감싸서 호출자가 ID를 직접 관리할 필요가 없도록 한다.

```typescript
const unsub = await Intent.subscribe(["com.symbol.datawedge.api.RESULT_ACTION"], (result) => {
  // result.extras 처리
});
// 구독 해제
await unsub();
```

### 초기 resolve 필터링

`subscribe()` 콜백은 `result.action != null` 조건으로 초기 resolve(`{ id }`만 포함된 응답)를 필터링한다. 이 조건을 제거하면 빈 콜백이 한 번 더 호출된다.

### 브라우저 폴백 (스텁)

`IntentWeb`은 모든 메서드에서 no-op 또는 스텁 값을 반환한다. Android 전용 기능이므로 브라우저 폴백은 실제 동작을 에뮬레이션하지 않는다.

- `subscribe()` — 경고 로그 후 `{ id: "web-stub" }` 반환
- `getLaunchIntent()` — `{}` 반환
- `startActivityForResult()` — 경고 로그 후 `{ resultCode: 0 }` 반환
- `send()` — 경고 로그 후 no-op
- `unsubscribe()`, `unsubscribeAll()` — no-op (경고 없음)
- `addListener()`, `removeAllListeners()` — `WebPlugin` 부모 클래스에서 상속 (직접 구현 없음)

## Android 네이티브

- 파일: `android/src/main/kotlin/kr/co/simplysm/capacitor/intent/IntentPlugin.kt`
- `subscribe()`: `RETURN_CALLBACK` 타입 메서드. `call.setKeepAlive(true)`로 콜백을 유지하고, `UUID`로 수신기 ID를 발급한다. Android 13+(TIRAMISU) 이상에서는 `RECEIVER_EXPORTED` 플래그를 지정해야 한다.
- `startActivityForResult()`: `@ActivityCallback`을 통해 `handleActivityResult()`를 콜백으로 등록한다.
- `handleOnDestroy()`: 등록된 모든 BroadcastReceiver를 정리한다. 리소스 누수 방지를 위해 이 로직을 유지해야 한다.
- `handleOnNewIntent()`: Activity가 새 인텐트를 수신하면 리스너에게 `"newIntent"` 이벤트를 발생시킨다.
- `populateExtras()`: `String`, `Int`, `Long`, `Double`, `Boolean`, `JSONArray`, `JSONObject`를 Intent extras로 변환한다. `JSONObject`는 `Bundle`로 중첩 변환된다.
- `bundleToJson()`: Bundle을 JSON으로 변환한다. `String`, `Int`, `Long`, `Double`, `Float`(Double로 변환), `Boolean`, `Bundle`(재귀), `Array<String>`, `Array<Parcelable>`, `IntArray`, `Parcelable`(toString 폴백)을 처리한다.

## Testing

**프레임워크**: Vitest

테스트는 `tests/` 디렉토리에 위치하며, 웹 폴백(`IntentWeb`) 동작만 검증한다. Android 네이티브 코드는 단위 테스트 대상이 아니다.

```typescript
import { IntentWeb } from "../src/web/IntentWeb";

describe("Feature 1.1", () => {
  it("IntentWeb.subscribe returns web-stub id", async () => {
    const web = new IntentWeb();
    const result = await web.subscribe({ filters: ["test.ACTION"] }, () => {});
    expect(result.id).toBe("web-stub");
  });
});
```

테스트 파일명 패턴: `{feature-description}.spec.ts`

## 컴파일러 설정 (패키지 고유)

`tsconfig.json`에 `"lib": ["ESNext", "DOM", "DOM.Iterable"]`이 설정되어 있다. `PluginListenerHandle` 등 Capacitor DOM 타입을 사용하므로 DOM lib가 필수다.
