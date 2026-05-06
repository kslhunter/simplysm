# CLAUDE.md — `@simplysm/core-node`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다. 이 파일은 본 패키지에만 해당하는 보강이다.

## 역할

Node 전용 보강. `core-common` 위에 `fs`·`child_process`·worker·CLI 로깅 도우미를 얹는다. 빌드 타겟 `node`.

브라우저에서 import 되지 않게 한다.

## 구조

| 경로                       | 내용                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `utils/fs.ts` / `cp.ts` / `path.ts` | 동기/비동기 파일 IO·복사·경로 유틸. (`fs` 직접 사용 대신 가능하면 이 래퍼.)   |
| `features/fs-watcher.ts`   | `chokidar` 래퍼 — debounce/이벤트 그룹핑 포함.                                        |
| `features/consola/`        | `consola` 기반 로거 프리셋(레벨·포맷팅).                                              |
| `worker/`                  | `create-worker` — Node `worker_threads` 추상화. `Transferable`/타입 안전 메시지 채널. |
| `lib/`                     | (생성된 산출물) — 직접 수정 금지.                                                     |

외부 의존: `chokidar`, `consola`, `glob`, `minimatch`, `tsx`. `@simplysm/core-common` 워크스페이스 의존.

## 작업 시 주의

- 파일·프로세스 도우미는 여기에. 환경 비종속 도구는 `core-common` 으로.
- worker 는 `tsx` 로 `.ts` 그대로 실행할 수 있게 설계되어 있다. dev 모드와 prod 모드의 entry 스위칭은 `sd-cli` 가 담당.
- `lib/` 폴더는 빌드/생성 산출물이다. `src/` 만 편집하라.
