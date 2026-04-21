# CLI 진입점 태그 로거 — LLM 검증

## 검증 항목

- sd-cli.ts에 `consola.withTag("sd:cli")` 모듈-레벨 로거가 생성됨: `src/sd-cli.ts:18` — `const logger = consola.withTag("sd:cli");`
- sd-cli.ts replaceDeps 경고에서 수동 `[sd-cli]` prefix가 제거됨: `src/sd-cli.ts:43` — `logger.warn("replaceDeps 사전 설정 실패:", ...)` (이전: `consola.warn("[sd-cli] replaceDeps ..."`)
- sd-cli.ts CPU affinity 경고가 consola로 전환됨: `src/sd-cli.ts:104-108` — `logger.warn("CPU affinity/priority 설정 실패:", ...)` (이전: `console.warn("Failed to configure ..."`)
- sd-cli.ts에서 `eslint-disable-next-line no-console` 주석이 제거됨: `src/sd-cli.ts:104` 부근에 해당 주석 없음
- sd-cli-entry.ts에 `consola.withTag("sd:cli:entry")` 모듈-레벨 로거가 생성됨: `src/sd-cli-entry.ts:20` — `const logger = consola.withTag("sd:cli:entry");`
- sd-cli-entry.ts .fail() 핸들러가 태그 로거를 사용함: `src/sd-cli-entry.ts:329` — `logger.error(msg);` (이전: `consola.error(msg)`)
- sd-cli-entry.ts의 `/* eslint-disable no-console */`이 유지됨: `src/sd-cli-entry.ts:1` — `collectYargsHelp`의 `console.log` 사용 때문에 필요
