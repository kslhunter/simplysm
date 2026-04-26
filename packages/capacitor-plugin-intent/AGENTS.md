# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/capacitor-plugin-intent/README.md`를 참조한다.

## Package Overview

`@simplysm/capacitor-plugin-intent`는 Capacitor Android Intent 플러그인이다. 브로드캐스트 송수신, 실행 인텐트 조회, 새 인텐트 이벤트 수신, `startActivityForResult` 호출을 `Intent` 정적 파사드로 제공한다.

- 패키지 경로: `packages/capacitor-plugin-intent`
- 공개 진입점: `src/index.ts`
- 소스 파일 수: 4개
- peer dependency: `@capacitor/core ^7`

## Architecture

```text
src/
  index.ts              # 공개 export 진입점
  Intent.ts             # 소비자용 정적 파사드와 registerPlugin 호출
  IntentPlugin.ts       # Capacitor 플러그인 인터페이스와 공개 타입
  web/
    IntentWeb.ts        # 웹 런타임 스텁 구현
```

`src/index.ts`는 `Intent`와 `IntentPlugin` 계열 타입만 re-export한다. Android 네이티브 구현은 `package.json`의 `capacitor.android.src`가 가리키는 `android` 디렉터리에 연결된다.

## Key Patterns

### 소비자는 `Intent` 파사드를 사용한다

`IntentPlugin`은 네이티브 플러그인 계약을 표현하는 타입이다. 소비자 코드에서 직접 `registerPlugin`을 호출하지 않고 `Intent`의 정적 메서드를 호출한다.

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

const unsubscribe = await Intent.subscribe(["com.symbol.datawedge.api.RESULT_ACTION"], (result) => {
  if (result.extras != null) {
    // 브로드캐스트 extras 처리
  }
});

await unsubscribe();
```

### `subscribe()`는 초기 resolve 콜백을 필터링한다

플러그인 레벨 `subscribe()`는 `{ id }`를 반환하기 위해 콜백을 한 번 호출할 수 있다. `Intent.subscribe()`는 `result.action != null`인 경우에만 소비자 콜백을 호출한다.

```typescript
const { id } = await intentPlugin.subscribe({ filters }, (result) => {
  if (result.action != null) {
    callback(result);
  }
});
```

구독 해제는 반환된 함수가 내부에서 `intentPlugin.unsubscribe({ id })`를 호출하는 형태다.

### 웹 구현은 동작 스텁이다

`IntentWeb`은 `WebPlugin`을 상속하지만 Android Intent 기능을 실제 수행하지 않는다.

- `subscribe()`는 경고 후 `{ id: "web-stub" }`를 반환한다.
- `send()`와 `startActivityForResult()`는 경고 후 완료된다.
- `getLaunchIntent()`는 `{}`를 반환한다.
- `unsubscribe()`와 `unsubscribeAll()`은 동작하지 않는다.

웹에서도 import 자체는 가능하지만, 기능 검증은 Android 런타임 기준으로 수행해야 한다.

## Testing

테스트는 `packages/capacitor-plugin-intent/tests`에 둔다.

- `intent-rename.spec.ts`: `IntentWeb` 스텁 반환값과 완료 동작을 Vitest로 검증한다.
- `*.spec.md`: Android 기기 또는 에뮬레이터에서 수행하는 수동 테스트 절차를 기록한다.

Android Intent 동작은 네이티브 런타임, 테스트용 Activity, 대상 앱 설치 상태가 필요하므로 문서형 수동 테스트로 검증한다.

## Package-specific Compiler Settings

이 패키지는 루트 TypeScript 설정을 확장하고, DOM 기반 Capacitor 타입을 위해 `lib`에 `DOM`, `DOM.Iterable`을 추가한다. 출력 경로는 `./dist`, 패키지 전용 `typeRoots`는 `./node_modules/@types`다.
