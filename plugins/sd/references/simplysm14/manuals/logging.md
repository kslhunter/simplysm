# 로깅 표준

`@simplysm/*` v14 모든 패키지(node, browser, capacitor)에 적용합니다.

## 원칙

- 제품, 런타임 소스의 로그는 `@simplysm/core-common` 의 `createLogger(tag)` 로 생성한 인스턴스로 출력하세요.
  - `console.*` 를 직접 호출하지 마세요.
- ESLint `no-console` 규칙은 제품, 런타임 소스의 의도된 게이트입니다. `eslint-disable`, `eslint-disable-next-line no-console` 로 우회하지 마세요.
  - 단, 현재 recommended config 는 `**/tests/**/*.ts` 에서 `no-console` 을 끄므로 테스트 진행 로그 등 제한적 용도는 예외입니다.
- 메시지 본문에 `[패키지명]` 같은 수동 prefix 를 추가하지 마세요. prefix 역할은 tag 가 담당합니다.

## 권장 패턴

```ts
import { createLogger } from "@simplysm/core-common";

const logger = createLogger("capacitor:auto-update");

// ...
logger.info("최신 버전 확인 중");
logger.warn("유효하지 않은 semver, 업데이트 건너뜀");
logger.error("checkPermissions 실패", err);
```

- tag 형식은 `<도메인>:<역할>` 또는 `<패키지명>` 단일 토큰입니다. 짧고 일관되게 작성하세요.
- logger 변수는 모듈 최상단에서 1회 선언한 뒤, 해당 모듈 내부에서 그 변수를 재사용하세요.

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

→ 모두 `createLogger("x")` 1줄로 대체하세요.

## 환경별 셋업

- **Node 서버 진입점**: 진입점에서 `setupConsola()` 를 1회 호출하세요.
- **Node CLI 진입점**: 진입점 또는 CLI middleware 에서 `setupConsola({ cli: true })` 를 호출하세요.
- **Browser, Capacitor 진입점**: `setupConsola` 를 호출하지 마세요(Node 전용 API).
  - consola 기본 reporter 가 브라우저 콘솔로 출력하며, tag, level, 호출 방식의 일관성은 그대로 충족합니다.

## 모듈-레벨 logger 주의

- 모듈 레벨에서 `consola.withTag()` 를 직접 호출하면 호출 시점의 options(level, reporters)가 스냅샷으로 고정됩니다.
  - 이후 `setupConsola()` 가 reporters 를 갱신해도 child instance 에는 반영되지 않습니다.
- **해결**: `@simplysm/core-common` 의 `createLogger(tag)` 를 사용하세요.
  - 내부 구현이 lazy Proxy 라 첫 메서드 접근 시점까지 `withTag` 생성을 지연합니다.
- 모든 환경(Node, 브라우저, Capacitor)에서 `createLogger` 로 통일하세요.
  - 선언 위치(모듈 레벨, 함수 내부, class field)와 무관합니다.
- `consola.withTag()` 를 직접 호출하지 마세요. 발견 시 `createLogger` 로 코드를 교체해야합니다.
  - tag 인자를 유지할지 재선정할지는 교체 이후의 부수 결정입니다.
  - "tag 를 그대로 쓸 수 있다" 같은 판단으로 *교체 행위 자체* 를 생략하지 마세요.

## 예외 — `eslint-disable no-console` 가 정당화되는 자리

- 다음 경우에 한해 `/* eslint-disable no-console */` 파일 헤더를 허용합니다. 그 외는 모두 consola 로 교체하세요.
  - **CLI 도움말, yargs help 텍스트** 처럼 stdout 자체를 사용자 출력 채널로 쓰는 경우.
  - **ErrorHandler 의 마지막 안전망** 등 consola 자체가 죽었을 가능성이 있는 catch 블록.
    - 해당 라인만 `eslint-disable-next-line no-console` + 사유 주석을 답니다.
- 예외 적용 시 disable 주석 바로 위에 사유를 1줄로 기재하세요.
