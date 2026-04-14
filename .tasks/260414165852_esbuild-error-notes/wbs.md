# WBS: esbuild 에러 메시지 notes 필드 누락 수정

## 프로젝트 개요

- **배경:** `sd-cli dev` 실행 시 Angular 컴파일 에러가 발생하면, 에러의 `notes` 정보가 출력에서 누락되어 실제 원인을 파악할 수 없다.
- **환경:** `@simplysm/sd-cli` 패키지, esbuild 기반 빌드 워커 3개 파일
- **전제조건:** 없음
- **기술적 제약:** esbuild `Message` 타입의 `notes: Note[]` 필드를 활용해야 함
- **참조 자료:**
  - `packages/sd-cli/src/workers/client.worker.ts` — 클라이언트 빌드 워커 (4곳)
  - `packages/sd-cli/src/workers/server-build.worker.ts` — 서버 빌드 워커 (2곳)
  - `packages/sd-cli/src/workers/server-esbuild-context.ts` — 서버 esbuild watch 컨텍스트 (2곳)

## Impact Mapping

- **Goal:** 빌드 에러 발생 시 원인 파악에 필요한 모든 정보가 출력되어 디버깅 시간을 단축한다
  - **Actor:** sd-cli 사용 개발자
    - **Impact:** 에러 메시지만으로 원인을 즉시 파악한다 (별도 디버깅 불필요)
      - **Deliverable:** esbuild 에러/경고 메시지에 notes 정보 포함

## Feature Breakdown

### Epic 1. 에러 메시지 개선

#### [x] Feature 1.1 esbuild Message notes 포함

**의존성:** 없음

**범위:**

- esbuild 에러 메시지 변환 시 `notes[].text`를 포함하여 출력
- esbuild 경고 메시지 변환 시 `notes[].text`를 포함하여 출력
- `client.worker.ts` — 프로덕션 빌드 catch(175), watch 에러/경고(329, 333), 초기 빌드(345)
- `server-build.worker.ts` — 프로덕션 빌드 에러/경고(173, 174)
- `server-esbuild-context.ts` — watch 에러/경고(101, 104)

**경계:**

- esbuild 외부의 에러 포맷팅은 이 Feature에서 다루지 않음
- `notes[].location` 정보는 제외 (D2: 과도한 정보로 가독성 저하)

**근거:**

- 사용자 확인: `sd-cli --debug dev` 실행 시 "Angular compilation initialization failed" 에러에서 notes 누락 확인
- 코드 확인: 3개 파일 8곳에서 `.map((e) => e.text)`로 notes 유실

## 제외 사항

- 없음
