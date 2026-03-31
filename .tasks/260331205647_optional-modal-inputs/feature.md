# Feature: optional modal/print inputs 타입 지원 및 typecheck 에러 수정

## 참조 자료

### 현황
- `includeTests: true` 변경으로 테스트 파일 typecheck 에러 80개 노출 (remote 8개 + 로컬 72개)
- Angular 21의 `input(default)`와 `input.required()`는 동일한 `InputSignal<T>` 반환 — 타입 레벨 구분 불가
- `ISdModal`, `ISdModalInfo`, `ISdPrint`, `ISdPrintInput` 타입 정의: `packages/angular/src/ui/overlay/modal/sd-modal.provider.ts`, `packages/angular/src/core/providers/sd-print.provider.ts`
- `TDirectiveInputSignals`: `packages/angular/src/core/utils/TDirectiveInputSignals.ts`
- `ISdSelectModal`, `TSdSelectModalInfo`: `packages/angular/src/ui/form/button/sd-modal-select-button.control.ts`

### 합의된 방안
- `ISdModal`에 `readonly _optionalModalInputs?: string` 프로퍼티 추가
- 구현 클래스가 `readonly _optionalModalInputs?: "age" | "memo"` 식으로 타입을 좁혀서 선언
- `ISdModalInfo`에서 해당 프로퍼티를 추출하여 Partial 처리
- `ISdPrint`에도 `readonly _optionalPrintInputs?: string` 동일 패턴
- 선언하지 않은 컴포넌트는 기존과 동일하게 동작 (하위호환)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | input(default) vs input.required() 구분 방법 | ISdModal에 _optionalModalInputs 프로퍼티 추가 | Angular 타입 시스템 한계로 자동 구분 불가, 프로퍼티 기반 수동 선언이 가장 실용적 |
| D2 | ISdModal 제네릭 파라미터 추가 여부 | 추가하지 않음 | phantom type은 TypeScript 구조적 타이핑에서 추론 불가, 프로퍼티 방식이 더 단순 |
| D3 | AbsSdDataDetail 리팩토링 | 현행 유지 | abstract class override 필요성 존재, 별도 리팩토링 주제 |

## 요구명세

```gherkin
Feature: optional modal/print inputs 타입 지원 및 typecheck 에러 수정

  Background:
    Given simplysm 모노레포의 Angular 패키지가 있다
    And typecheck 명령에 includeTests: true가 설정되어 있다

  Rule: ISdModal에 _optionalModalInputs 프로퍼티가 존재한다

    Scenario: _optionalModalInputs를 선언하지 않은 모달은 기존과 동일하게 동작한다
      Given SdConfirmModalControl이 ISdModal<boolean>을 구현한다
      And _optionalModalInputs를 선언하지 않았다
      When showAsync로 모달을 열 때 inputs 타입을 확인하면
      Then 모든 InputSignal 프로퍼티가 required이다

    Scenario: _optionalModalInputs를 선언한 모달은 해당 키가 optional이다
      Given MyModal이 ISdModal<string>을 구현한다
      And readonly _optionalModalInputs?: "age"를 선언했다
      When showAsync로 모달을 열 때 inputs 타입을 확인하면
      Then age는 optional이고 나머지 InputSignal 프로퍼티는 required이다

  Rule: ISdModalInfo가 _optionalModalInputs를 추출하여 해당 키를 Partial 처리한다

    Scenario: ExtractOPT 타입이 _optionalModalInputs에서 문자열 리터럴을 추출한다
      Given MyModal에 readonly _optionalModalInputs?: "age"가 있다
      When ExtractOPT<MyModal>을 평가하면
      Then 결과는 "age"이다

    Scenario: _optionalModalInputs가 없는 클래스에서 ExtractOPT는 never이다
      Given SdConfirmModalControl에 _optionalModalInputs가 없다
      When ExtractOPT<SdConfirmModalControl>을 평가하면
      Then 결과는 never이다

  Rule: ISdPrint에도 동일 패턴을 적용한다

    Scenario: _optionalPrintInputs를 선언한 프린트 컴포넌트는 해당 키가 optional이다
      Given MyPrint가 ISdPrint를 구현한다
      And readonly _optionalPrintInputs?: "title"을 선언했다
      When printAsync로 프린트할 때 inputs 타입을 확인하면
      Then title은 optional이다

  Rule: includeTests로 드러난 테스트 타입 에러를 수정한다

    Scenario: SCSS ?inline 임포트가 타입체크를 통과한다
      Given *.scss?inline 모듈 타입 선언이 존재한다
      When 테스트 파일에서 import cssText from "*.scss?inline"을 사용하면
      Then TS2307 에러가 발생하지 않는다

    Scenario: DOM 요소 타입이 올바르게 캐스팅된다
      Given querySelectorAll 결과를 HTMLElement로 캐스팅한다
      When .style, .click, .checkValidity 등을 접근하면
      Then TS2339 에러가 발생하지 않는다

    Scenario: 테스트 fixture의 componentInstance가 올바르게 타이핑된다
      Given setup 함수의 반환 타입이 제네릭으로 지정되어 있다
      When fixture.componentInstance의 프로퍼티에 접근하면
      Then TS18046 에러가 발생하지 않는다

    Scenario: 전체 typecheck가 통과한다
      When pnpm run typecheck를 실행하면
      Then 에러 0개, 경고 0개이다
```

## 구현계획

### 배경

`sd-cli typecheck`에 `includeTests: true` 옵션이 추가되면서, 테스트 파일의 타입 에러 72개가 새로 노출되었다 (remote에도 8개 존재). 동시에, `ISdModal`/`ISdPrint`의 `showAsync`/`printAsync` 호출 시 `input(default)`를 가진 프로퍼티도 필수로 요구되는 타입 문제가 있다.

### 목표

- `ISdModal`, `ISdPrint`에 optional input 선언 메커니즘 추가
- `ISdModalInfo`, `ISdPrintInput`에서 선언된 키를 Partial 처리
- 전체 typecheck 에러 0개 달성

### 비목표

- AbsSdDataDetail 리팩토링 (별도 주제)
- `input(default)` 자체를 lint로 금지하는 것

### 설계

#### 타입 유틸리티

`TDirectiveInputSignals.ts`에 헬퍼 타입 추가:

```typescript
// 특정 키를 optional로 변환
export type TWithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

#### ISdModal / ISdModalInfo

```typescript
// sd-modal.provider.ts
export interface ISdModal<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
  readonly _optionalModalInputs?: string;  // 추가
}

// 추출 헬퍼
type TSdModalOptionalKeys<T> =
  T extends { _optionalModalInputs?: infer K extends string } ? K : never;

type TSdModalExcludeKeys = "initialized" | "close" | "actionTplRef" | "_optionalModalInputs";

export interface ISdModalInfo<T extends ISdModal<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: TWithOptional<
    Omit<TDirectiveInputSignals<T>, TSdModalExcludeKeys | X>,
    TSdModalOptionalKeys<T> & keyof Omit<TDirectiveInputSignals<T>, TSdModalExcludeKeys | X>
  >;
}
```

#### ISdPrint / ISdPrintInput

```typescript
// sd-print.provider.ts
export interface ISdPrint {
  initialized: Signal<boolean>;
  readonly _optionalPrintInputs?: string;  // 추가
}

type TSdPrintOptionalKeys<T> =
  T extends { _optionalPrintInputs?: infer K extends string } ? K : never;

export interface ISdPrintInput<T, X extends keyof any = ""> {
  type: Type<T>;
  inputs: TWithOptional<
    Omit<TDirectiveInputSignals<T>, "_optionalPrintInputs" | X>,
    TSdPrintOptionalKeys<T> & keyof Omit<TDirectiveInputSignals<T>, "_optionalPrintInputs" | X>
  >;
}
```

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| ISdModal 제네릭에 OPT 추가 | 미채택 | phantom type은 TypeScript 구조적 타이핑에서 추론 불가 |
| input(default) 전면 금지 | 미채택 | 프로젝트 전체 영향, Angular 표준 패턴 금지 부적절 |
| Partial로 모든 input optional | 미채택 | input.required()도 optional이 되어 타입 안전성 상실 |
| 프로퍼티 기반 _optionalModalInputs | 채택 | 하위호환, 선언적, ISdModal 제네릭 변경 불필요 |

### Vertical Slices

- [x] #### Slice 1: 타입 유틸리티 및 ISdModal/ISdPrint 타입 수정
  - **구현 내용:** `TWithOptional` 헬퍼 추가, `ISdModal`에 `_optionalModalInputs` 프로퍼티 추가, `ISdModalInfo` inputs 타입 수정, `ISdPrint`/`ISdPrintInput` 동일 적용
  - **호출 그래프:**
    ```mermaid
    flowchart TD
      A[TDirectiveInputSignals.ts] -->|TWithOptional 제공| B[sd-modal.provider.ts]
      A -->|TWithOptional 제공| C[sd-print.provider.ts]
      B -->|TSdModalOptionalKeys 추출| D[ISdModalInfo.inputs]
      C -->|TSdPrintOptionalKeys 추출| E[ISdPrintInput.inputs]
    ```
  - **Scenarios:**
    - Scenario: _optionalModalInputs를 선언하지 않은 모달은 기존과 동일하게 동작한다
    - Scenario: _optionalModalInputs를 선언한 모달은 해당 키가 optional이다
    - Scenario: ExtractOPT 타입이 _optionalModalInputs에서 문자열 리터럴을 추출한다
    - Scenario: _optionalModalInputs가 없는 클래스에서 ExtractOPT는 never이다
    - Scenario: _optionalPrintInputs를 선언한 프린트 컴포넌트는 해당 키가 optional이다

- [x] #### Slice 2: 테스트 타입 에러 수정 — 인프라
  - **구현 내용:** `scss.d.ts`에 `*.scss?inline` 모듈 선언 추가, 테스트 fixture의 `_optionalModalInputs`/`_optionalPrintInputs` 선언 (G5/G6 해결), `setup()` 함수 제네릭 타이핑 (G4 해결)
  - **의존:** Slice 1
  - **호출 그래프:**
    ```mermaid
    flowchart TD
      A[scss.d.ts] -->|모듈 선언| B[scss 테스트 파일들]
      C[sd-modal-test.fixture.ts] -->|_optionalModalInputs| D[modal-types.spec.ts]
      C -->|_optionalModalInputs| E[modal-provider.spec.ts]
      F[sd-print-test.fixture.ts] -->|_optionalPrintInputs| G[print-provider.spec.ts]
      H[busy-container.spec.ts] -->|setup 제네릭| I[fixture.componentInstance 타이핑]
    ```
  - **Scenarios:**
    - Scenario: SCSS ?inline 임포트가 타입체크를 통과한다
    - Scenario: 테스트 fixture의 componentInstance가 올바르게 타이핑된다

- [x] #### Slice 3: 테스트 타입 에러 수정 — 개별 파일
  - **구현 내용:** DOM 타입 캐스팅(G7/G8), `Record<string, unknown>` 수정(G3), `TSelectModeValue` 수정(G9), implicit any 수정(G10), Mock 타입 수정(G11/G12), `ISdSheetColumnDef` 수정(G2), remote 8개 에러 수정
  - **의존:** Slice 2
  - **호출 그래프:**
    ```mermaid
    flowchart TD
      A[modal-focus.spec.ts] -->|HTMLElement 캐스팅| B[.style 접근]
      C[date-range-picker.spec.ts] -->|HTMLInputElement 캐스팅| D[.checkValidity 접근]
      E[topbar-user.spec.ts] -->|HTMLElement 캐스팅| F[.click 접근]
      G[column-fixing.spec.ts] -->|disableResizing 추가| H[ISdSheetColumnDef]
    ```
  - **Scenarios:**
    - Scenario: DOM 요소 타입이 올바르게 캐스팅된다
    - Scenario: 전체 typecheck가 통과한다
