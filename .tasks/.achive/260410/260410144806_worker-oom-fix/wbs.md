# WBS: 빌드 워커 OOM 크래시 수정

## 프로젝트 개요

- **배경:** watch 모드에서 sd-cli 등 무거운 패키지의 빌드 워커가 3회 리빌드 후 OOM으로 크래시됨
- **환경:** simplysm 모노레포, `pnpm watch` (dev 모드, tsx 실행)
- **전제조건:** 없음
- **기술적 제약:** Node.js worker_threads의 `resourceLimits` API 사용
- **참조 자료:**
  - `.tasks/260410144333_debug-worker-oom/debug.md` — 근본 원인 분석 및 해결 방안 확정

## Impact Mapping

- **Goal:** watch 모드에서 리빌드 반복 시 워커 OOM 크래시 제거
  - **Actor:** simplysm 개발자
    - **Impact:** 파일 수정 후 watch 리빌드가 중단 없이 지속됨
      - **Deliverable:** BaseEngine 워커 메모리 제한 설정

## Feature Breakdown

### Epic 1. 빌드 워커 메모리 안정화

#### [x] Feature 1.1 BaseEngine 워커 resourceLimits 설정

**의존성:** 없음

**범위:**

- `BaseEngine._createWorker()`에서 `Worker.create()` 호출 시 `resourceLimits: { maxOldGenerationSizeMb: 4096 }` 전달

**경계:**

- ViteEngine은 BaseEngine을 상속하지 않으므로 이 Feature에서 다루지 않음 (ViteEngine 워커는 별도 생명주기)
- dev 모드 메인 프로세스의 메모리 제한은 이 Feature에서 다루지 않음

**근거:**

- 디버그 분석: `.tasks/260410144333_debug-worker-oom/debug.md` — H1 확정, 방안 A 선택
- 선례: `packages/service-server/src/protocol/protocol-wrapper.ts:38`에서 동일 패턴 사용 중

## 제외 사항

- ViteEngine 워커 메모리 설정 — BaseEngine 미상속, 별도 생명주기 (필요 시 별도 Feature)
- dev 모드 메인 프로세스 `--max-old-space-size` 설정 — 현재 메인 프로세스 OOM은 보고되지 않음
