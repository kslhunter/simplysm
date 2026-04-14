# 코드 리뷰: esbuild-notes

## 리뷰 대상

- **Feature:** `.tasks/260414165852_esbuild-error-notes` — esbuild 에러 메시지 notes 필드 누락 수정
- **수정 파일:**
  - `packages/sd-cli/src/utils/output-utils.ts` (함수 추가)
  - `packages/sd-cli/tests/utils/output-utils.spec.ts` (테스트 추가)
  - `packages/sd-cli/src/workers/client.worker.ts` (4곳 적용)
  - `packages/sd-cli/src/workers/server-build.worker.ts` (2곳 적용)
  - `packages/sd-cli/src/workers/server-esbuild-context.ts` (2곳 적용)

## 검증 결과

### 구현 정합성

| 검증 항목 | 결과 |
|-----------|------|
| `formatEsbuildMessage` 함수 — spec 4개 시나리오 일치 | Pass |
| 8개 호출 지점 `.map((e) => e.text)` → `.map(formatEsbuildMessage)` 교체 | Pass |
| `src/` 내 `.map((e) => e.text)` 잔류 패턴 없음 (Grep 확인) | Pass |
| import 문 정확 (`output-utils.js`) | Pass |
| 타입 호환 — esbuild `Message.notes: Note[]` ↔ `ReadonlyArray<{ text: string }>` | Pass |
| `client.worker.ts:175` catch 타입 캐스트에 notes 포함 | Pass |
| `formatBuildMessages` 연계 — D1 설계(2칸 들여쓰기 + `  → ` 접두사 = 계층 시각화) 정상 | Pass |
| 테스트 16건 전체 통과 | Pass |

### 이슈

**이슈 없음.** Critical, Medium, Low 모두 해당하는 이슈가 탐지되지 않았다.

### 거짓양성 필터링 기록

분석 과정에서 2건의 후보가 탐지되었으나 모두 거짓양성으로 판단하여 제외하였다.

#### 후보 1: `notes?` (optional) vs 계획의 `notes` (required)

- **위치:** `output-utils.ts:8`
- **탐지 관점:** CONSIST — 구현계획 시그니처와 불일치
- **제외 사유:** 의도적 설계 개선. D4(구조적 서브타입)의 취지에 맞게 함수를 더 관대하게 만든 것. `msg.notes == null` 가드로 undefined를 안전하게 처리하며, 모든 실제 호출 지점은 esbuild `Message`(notes 필수)를 전달하므로 기능적 영향 없음.

#### 후보 2: `EsbuildClientEngine.ts:136` — 에러 join 방식 차이

- **위치:** `packages/sd-cli/src/engines/EsbuildClientEngine.ts:136`
- **탐지 관점:** CONSIST — `errors.join("; ")` vs `engine-watch-events.ts:70`의 `errors.join("\n")`
- **제외 사유:** 이 Feature에서 수정하지 않은 기존 코드. 기존에는 에러가 단일행 문자열이어서 `"; "` join이 문제없었고, `formatEsbuildMessage`로 다중행이 될 수 있지만, 이 경로(초기 빌드 실패 + 다수 esbuild 에러 + 각각 notes 보유)는 발생 빈도가 극히 낮고 정보 누락은 없음. Feature 경계("esbuild 외부의 에러 포맷팅은 이 Feature에서 다루지 않음") 밖이므로 제외.
