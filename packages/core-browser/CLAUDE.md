# CLAUDE.md — `@simplysm/core-browser`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다. 이 파일은 본 패키지에만 해당하는 보강이다.

## 역할

브라우저 전용 보강. `core-common` 위에 DOM·File·IndexedDB·Fetch 도우미를 얹는다. 빌드 타겟 `browser`.

서버에서 절대 import 되지 않게 한다 — `window`/`document`/`indexedDB` 사용 코드는 전부 여기.

## 구조

| 경로                 | 내용                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `extensions/`        | `Element`/`HTMLElement` 프로토타입 확장 (DOM 트리 탐색·포커스 보조). 부수효과 로드.        |
| `utils/IndexedDb*`   | `IndexedDbStore`(키-값 저장), `IndexedDbVirtualFs`(브라우저 가상 파일시스템).              |
| `utils/download.ts`  | Blob / data URL → 파일 다운로드 트리거.                                                    |
| `utils/fetch.ts`     | 진행률·취소·타임아웃 포함 fetch 래퍼.                                                      |
| `utils/file-dialog.ts` | 파일 선택 대화상자(드래그앤드롭 포함).                                                   |

외부 의존: `tabbable`(포커스 가능 요소 탐색), `sanitize-filename`. `@simplysm/core-common` 만 워크스페이스 의존.

## 작업 시 주의

- DOM 비종속 로직은 `core-common` 으로 내려라.
- 프로토타입 확장은 `core-common` 과 동일하게 부수효과 import 로 들어간다. 사용자가 `@simplysm/core-browser` 한 줄만 import 해도 확장이 적용되어야 함.
- 테스트는 chromium(Vitest `browser` project)에서 실행된다.
