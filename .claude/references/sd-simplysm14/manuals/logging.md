# 로깅 표준

`@simplysm/*` v14 모든 패키지(node·browser·capacitor)에 적용.

## 원칙

- 모든 로그는 `consola.withTag(<tag>)` 인스턴스로 출력. `console.*` 직접 호출 금지.
- ESLint `no-console` 규칙은 의도된 게이트 — `eslint-disable`/`eslint-disable-next-line no-console` 우회 금지.
- 메시지에 `[패키지]` 같은 수동 prefix 금지. tag 가 그 역할.

## 권장 패턴

```ts
import consola from "consola";

const logger = consola.withTag("capacitor:auto-update");

// ...
logger.info("최신 버전 확인 중");
logger.warn("유효하지 않은 semver, 업데이트 건너뜀");
logger.error("checkPermissions 실패", err);
```

- tag 형식: `<도메인>:<역할>` 또는 `<패키지명>` 단일 토큰. 짧고 일관.
- logger 변수는 모듈 최상단에서 1회 선언, 모듈 내부에서 그 변수 사용.

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

→ 모두 `consola.withTag("x")` 1줄로 대체.

## 환경별 셋업

- **Node 진입점(서버·CLI)**: 진입점에서 `setupConsola()` 1회. 자세히 [apis/core-node/consola.md](../apis/core-node/consola.md).
- **Browser·Capacitor 진입점**: `setupConsola` 호출 X (Node 전용). consola 기본 reporter 가 브라우저 콘솔로 출력. tag/level/통일된 호출면 충족.

## 모듈-레벨 logger 주의 (Node 진입점)

Node 진입점에서 `setupConsola` 호출 **전** 에 모듈 레벨에서 `consola.withTag()` 를 호출하면 호출 시점의 옵션(level/reporters)이 스냅샷으로 고정되어 이후 setupConsola 변경이 반영되지 않는다.

- 해결: `@simplysm/sd-cli` 의 `createLazyLogger(tag)` (`src/runtime/lazy-logger.ts`) 처럼 첫 접근 시점까지 `withTag` 생성을 지연.
- 브라우저·Capacitor 는 setupConsola 가 없어 이 문제 없음 — 그냥 모듈 레벨 `consola.withTag()` OK.

## 예외 — `eslint-disable no-console` 가 정당화되는 자리

다음 경우에 한해 `/* eslint-disable no-console */` 파일 헤더를 허용한다. 그 외는 모두 consola 로 교체.

- **CLI 도움말·yargs help 텍스트** 처럼 stdout 그 자체를 사용자 출력으로 쓰는 경우 (예: `packages/sd-cli/src/sd-cli-entry.ts` 의 `collectYargsHelp`).
- **ErrorHandler 마지막 안전망** 등 consola 자체가 죽었을 가능성이 있는 catch 블록 — 해당 자리만 `eslint-disable-next-line no-console` + 이유 주석.

예외 적용 시 disable 주석 위에 사유를 1줄로 남긴다.
