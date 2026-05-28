# 로깅 표준

`@simplysm/*` v14 모든 패키지(node·browser·capacitor)에 적용.

## 원칙

- 모든 로그는 `@simplysm/core-common` 의 `createLogger(tag)` 로 생성한 인스턴스로 출력. `console.*` 직접 호출 금지.
- ESLint `no-console` 규칙은 의도된 게이트 — `eslint-disable`·`eslint-disable-next-line no-console` 로 우회 금지.
- 메시지 본문에 `[패키지명]` 같은 수동 prefix 추가 금지. prefix 역할은 tag 가 담당.

## 권장 패턴

```ts
import { createLogger } from "@simplysm/core-common";

const logger = createLogger("capacitor:auto-update");

// ...
logger.info("최신 버전 확인 중");
logger.warn("유효하지 않은 semver, 업데이트 건너뜀");
logger.error("checkPermissions 실패", err);
```

- tag 형식: `<도메인>:<역할>` 또는 `<패키지명>` 단일 토큰. 짧고 일관되게 작성.
- logger 변수는 모듈 최상단에서 1회 선언한 뒤, 해당 모듈 내부에서 그 변수를 재사용.

## 금지 패턴

```ts
// 1) LOG_TAG 수동 prefix + console 래퍼
const LOG_TAG = "[X]";
const logger = {
  info: (msg: string, ...args: unknown[]) => {
    console.info(`${LOG_TAG} ${msg}`, ...args);
  },
};

// 2) eslint-disable + 수동 prefix
// eslint-disable-next-line no-console
console.error("[X] 실패:", err);
```

→ 모두 `createLogger("x")` 1줄로 대체.

## 환경별 셋업

- **Node 진입점(서버·CLI)**: 진입점에서 `setupConsola()` 를 1회 호출. 상세는 [apis/core-node/consola.md](../apis/core-node/consola.md) 참조.
- **Browser·Capacitor 진입점**: `setupConsola` 호출 금지 (Node 전용 API). consola 기본 reporter 가 브라우저 콘솔로 출력하며, tag·level·호출 방식의 일관성은 그대로 충족.

## 모듈-레벨 logger 주의

모듈 레벨에서 `consola.withTag()` 를 직접 호출하면 호출 시점의 options(level·reporters)가 스냅샷으로 고정되어, 이후 `setupConsola()` 가 reporters 를 갱신해도 child instance 에는 반영되지 않음.

- **해결**: `@simplysm/core-common` 의 `createLogger(tag)` 사용 (내부 구현이 lazy Proxy 라 첫 메서드 접근 시점까지 `withTag` 생성을 지연).
- 모든 환경(Node·브라우저·Capacitor)에서, 선언 위치(모듈 레벨·함수 내부·class field)와 무관하게 `createLogger` 로 통일.
- `consola.withTag()` 직접 호출 금지. 발견 시 `createLogger` 로의 코드 교체 의무. tag 인자를 유지할지 재선정할지는 교체 이후의 부수 결정이며, "tag 를 그대로 쓸 수 있다" 같은 판단으로 *교체 행위 자체* 를 생략 금지.

## 예외 — `eslint-disable no-console` 가 정당화되는 자리

다음 경우에 한해 `/* eslint-disable no-console */` 파일 헤더 허용. 그 외는 모두 consola 로 교체.

- **CLI 도움말·yargs help 텍스트** 처럼 stdout 자체를 사용자 출력 채널로 쓰는 경우 (예: `packages/sd-cli/src/sd-cli-entry.ts` 의 `collectYargsHelp`).
- **ErrorHandler 의 마지막 안전망** 등 consola 자체가 죽었을 가능성이 있는 catch 블록 — 해당 라인만 `eslint-disable-next-line no-console` + 사유 주석.

예외 적용 시 disable 주석 바로 위에 사유를 1줄로 기재.
