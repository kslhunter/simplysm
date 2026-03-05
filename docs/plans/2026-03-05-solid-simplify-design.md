# Solid Package Simplify Design

## Goal

`packages/solid` 패키지 전체 코드 리뷰 후 도출된 저위험/고가치 개선 3건 적용.
Public API 변경 없이 코드 정확성과 중복 제거에 집중.

## Changes

### 1. createControllableStore: JSON.stringify → objClone + objEqual

**파일**: `packages/solid/src/hooks/createControllableStore.ts`

`JSON.stringify`로 변경 감지하는 코드를 `objClone` + `objEqual`로 교체.

- **이유**: `JSON.stringify`는 `DateTime`, `DateOnly`, `Time`, `Uuid`, `Date`, `Map`, `Set` 타입 정보를 손실. CrudSheet/CrudDetail에서 ORM 데이터를 store에 담을 수 있어 실제 문제 가능.
- **방법**: import에 `objEqual` 추가. `JSON.stringify` 2회를 `objClone` 1회 + `objEqual` 1회로 교체.
- **성능**: 양쪽 O(n)으로 동등. 추가 오버헤드 없음.

### 2. ServiceClientProvider: 중복 progress 핸들러 추출

**파일**: `packages/solid/src/providers/ServiceClientProvider.tsx`

request-progress (103-128)와 response-progress (131-156) 핸들러가 구조적으로 동일.

- **차이점**: 이벤트명, Map 인스턴스, 알림 제목 문자열 3개
- **방법**: 컴포넌트 내부에 `handleProgress` 로컬 함수 추출. `notification` closure 접근.

### 3. Checkbox/Radio: SelectableBase 추출

**파일**:
- 생성: `packages/solid/src/components/form-control/checkbox/SelectableBase.tsx`
- 수정: `packages/solid/src/components/form-control/checkbox/Checkbox.tsx`
- 수정: `packages/solid/src/components/form-control/checkbox/Radio.tsx`

Checkbox(119줄)와 Radio(117줄)는 4가지만 다름: click 핸들러, indicator 모양, indicator 내용, ARIA role.

- **방법**: `SelectableBase` 내부 컴포넌트 생성 (index.ts에 export 안함). `config` prop으로 차이점 주입. `splitProps`로 `config`을 분리하여 DOM spread 방지.
- **패턴**: 기존 `SelectionGroupBase.tsx` 패턴을 따름.
- **영향**: CheckboxGroup/RadioGroup은 Checkbox/Radio를 이름으로 import하므로 변경 없음.

## Excluded Items

| 항목 | 사유 |
|------|------|
| Validation 패턴 중복 (8개 컴포넌트) | 타입-specific 로직이 달라 추출 시 복잡해짐 |
| getWrapperClass 중복 (5개 컴포넌트) | `extra`만 다르고 이미 `getFieldWrapperClass`로 추상화됨 |
| IME flush effect 중복 | 3줄 × 2파일, 추출 비용 > 이득 |
| CheckboxGroup/RadioGroup | 이미 `SelectionGroupBase`로 공유부 추출됨 |
| DataSheet 분할 | 대규모 아키텍처 변경, scope 밖 |
| FieldShell parameter sprawl | public API 변경 필요 |
| startPointerDrag 미export | 의도적 internal 가능 |

## Verification

`/sd-check` — typecheck + lint
