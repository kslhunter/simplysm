# Feature FIX-2 UI Form/Overlay 이슈 수정

## 참조 자료

- [wbs.md](./wbs.md)
- [review.md](../../.tasks/260329202656_review-angular-migration/review.md)

### 대상 파일

| 파일 | 관련 이슈 |
|------|----------|
| `src/ui/form/input/sd-textfield-type-handlers.ts` | LOGIC-008 |
| `src/ui/form/input/sd-numpad.control.ts` | LOGIC-009 |
| `src/ui/form/input/sd-textfield.control.ts` | LOGIC-010 |
| `src/ui/form/editor/sd-tiptap-editor.control.ts` | LOGIC-011, LOGIC-019 |
| `src/ui/overlay/toast/sd-toast.provider.ts` | DESIGN-003 |
| `src/ui/overlay/dropdown/sd-dropdown.control.ts` | DESIGN-004 |
| `src/ui/overlay/busy/sd-busy-container.control.ts` | CONSIST-001 |
| `src/ui/form/checkbox/sd-checkbox.control.ts` | CONSIST-005 |
| `src/ui/form/checkbox/sd-switch.control.ts` | CONSIST-005 |
| `src/ui/form/select/sd-select-item.control.ts` | PERF-003 |

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | LOGIC-008: number parse에서 중간 입력("0.0") 처리 | trailing-zero/trailing-dot 입력 시 parse가 undefined를 반환하되, onInput에서 undefined일 때 기존 value를 유지 (이미 현행 동작) | 문제의 본질은 parse 자체가 아니라, "0.0"이 `Number("0.0") === 0`이면서 `includes(".") && Number(...) === 0` 조건에 걸려 undefined가 되는 것. "0.01" 같은 유효 입력 경로상 중간 상태이므로 parse가 undefined를 반환하는 현행 동작이 올바름. 단, `0.10` → `0.1` 변환 문제는 controlValue computed가 toControlValue를 호출해 trailing zero를 제거하므로 input 값이 덮어써지는 것이 문제 — onInput 내에서 parse가 성공하고 value가 변경되면 controlValue가 재계산되어 input.value를 재설정. 이는 Angular의 [value] 바인딩 때문. 수정 범위: parse 조건을 `inputValue.endsWith(".")` 만 남기고 `includes(".") && Number(...) === 0` 조건은 제거하여 "0.0"이 0으로 정상 parse |
| D2 | LOGIC-009: numpad 소수점 입력 중 역방향 동기화 | focused 상태 체크 대신, text→value effect에서 set 후 value→text effect의 prevValue 비교로 자연스럽게 가드 | numpad는 text signal을 통해서만 입력을 받으므로, text→value에서 value를 set하면 value→text effect가 트리거됨. 이때 prevValue와 value가 같으면 text를 덮어쓰지 않음. "1."의 경우 parseFloat가 1이 되므로 value=1이 set되고, value→text가 "1"로 덮어씀. 수정: text→value effect에서 parseFloat 결과가 undefined가 아닐 때만 value를 set하고, 중간 입력(trailing dot)은 value를 변경하지 않음 |
| D3 | LOGIC-010: paste 실패 시 복원 | parse 실패 시 input.value를 이전 controlValue로 복원 | event.target에서 input element 접근 가능. 이전 controlValue는 this.controlValue() computed에서 가져옴 |
| D4 | LOGIC-011: editor DOM 컨테이너 타이밍 | 현행 유지 | `._editor-container` div는 `@if` 조건 밖에 있어 항상 DOM에 존재. `createEditor()`의 `container == null` 가드로 충분히 안전. afterNextRender 적용 시 disabled/readonly effect 타이밍 문제 발생 |
| D5 | LOGIC-019: Underline 확장 누락 | 현행 유지 (StarterKit v3에 이미 포함) | `@tiptap/starter-kit` v3.21.0+에서 Underline이 기본 포함됨. 별도 추가 시 duplicate extension 경고 발생 |
| D6 | DESIGN-003: toast dismiss 중복 호출 | _destroyToast의 기존 `idx === -1` 가드가 이미 중복 호출을 방지. 추가로 transitionend listener에서 _destroyToast 호출 후 setTimeout의 중복 실행을 방지하기 위해 destroyed 플래그 사용 | AbortController는 Chrome 66+이므로 Chrome 61 호환성을 위해 boolean 플래그 사용 |
| D7 | DESIGN-004: dropdown popup 크기 미고려 | popup 배치 후 뷰포트와의 교차를 확인하여 maxHeight/maxWidth를 동적으로 설정 | 현재 코드는 popup의 실제 크기를 확인하지 않아 뷰포트를 벗어날 수 있음 |
| D8 | CONSIST-001: busy-container 배경 하드코딩 | `var(--background-color)` CSS 변수 기반 반투명 배경 사용. 구체적으로 `color-mix(in srgb, var(--background-color) 60%, transparent)` | `--background-color`는 light에서 white, dark에서 #000으로 정의됨. color-mix는 Chrome 111+이므로 Chrome 61에서 불가. 대신 별도 CSS 변수 `--busy-overlay-bg`를 정의하여 light/dark에서 각각 값을 설정 |
| D9 | CONSIST-005: checkbox/switch Space 키 preventDefault 누락 | event.preventDefault() 추가 | Space 키의 기본 동작(스크롤)을 방지해야 함 |
| D10 | PERF-003: sd-select-item afterEveryRender 비효율 | 현행 유지 | isSelected를 computed로 분리하면 parent의 afterEveryRender contentHTML 읽기 타이밍이 깨짐. parent의 afterEveryRender가 item의 contentHTML에 의존하므로, isSelected만 분리할 수 없음. 전체 리팩토링(parent의 afterEveryRender 제거 포함)이 필요하나 FIX 범위를 초과 |

## 요구명세

```gherkin
Feature: FIX-2 UI Form/Overlay 이슈 수정

  Background:
    Given @simplysm/angular 패키지의 UI 모듈이 로드되어 있다

  Rule: number 타입 textfield는 소수점 중간 입력을 올바르게 처리해야 한다

    Scenario: "0.0" 입력 시 value가 0으로 parse된다
      Given type="number" textfield가 있다
      When 사용자가 "0.0"을 입력한다
      Then value는 0이다

    Scenario: "0." 입력 시 value는 변경되지 않는다
      Given type="number" textfield가 있다
      When 사용자가 "0."을 입력한다
      Then parse는 undefined를 반환한다
      And 이전 value가 유지된다

    Scenario: "1.50" 입력 시 value가 1.5로 parse된다
      Given type="number" textfield가 있다
      When 사용자가 "1.50"을 입력한다
      Then value는 1.5이다

  Rule: numpad는 소수점 입력 중 text가 덮어써지지 않아야 한다

    Scenario: numpad에서 "1." 입력 시 text가 유지된다
      Given numpad 컨트롤이 있다
      When 사용자가 "1", "." 순서로 버튼을 누른다
      Then text는 "1."이다
      And value는 이전 값이 유지된다

    Scenario: numpad에서 "1.5" 입력 시 value가 1.5로 동기화된다
      Given numpad 컨트롤이 있다
      When 사용자가 "1", ".", "5" 순서로 버튼을 누른다
      Then text는 "1.5"이다
      And value는 1.5이다

  Rule: textfield paste 실패 시 input 값이 복원되어야 한다

    Scenario: 숫자 타입에 문자열 paste 시 input이 이전 값으로 복원된다
      Given type="number" textfield에 value=42가 설정되어 있다
      When 사용자가 "abc"를 paste한다
      Then value는 42로 유지된다
      And input element의 value는 "42"로 복원된다

    Scenario: 빈 문자열 paste 시 value가 undefined로 설정된다
      Given type="number" textfield에 value=42가 설정되어 있다
      When 사용자가 빈 문자열을 paste한다
      Then value는 undefined가 된다

  Rule: TipTap editor는 DOM 렌더 후 안전하게 생성되어야 한다

    Scenario: editor 컨테이너가 렌더된 후 editor가 생성된다
      Given sd-tiptap-editor 컴포넌트가 있다
      When 컴포넌트가 초기화된다
      Then afterNextRender 콜백에서 editor가 생성된다
      And editor-container DOM 요소가 존재하는 상태에서 생성된다

  Rule: TipTap editor는 Underline 확장을 포함해야 한다

    Scenario: underline 토글 명령이 정상 동작한다
      Given sd-tiptap-editor 컴포넌트가 있다
      When execCmd('underline')을 실행한다
      Then toggleUnderline이 에러 없이 실행된다

    Scenario: DEFAULT_EXTENSIONS에 Underline 확장이 포함되어 있다
      Given DEFAULT_EXTENSIONS 배열이 있다
      Then Underline 확장이 포함되어 있다

  Rule: toast dismiss에서 중복 파괴가 방지되어야 한다

    Scenario: transitionend와 setTimeout이 동시에 발생해도 한 번만 파괴된다
      Given 토스트가 표시되어 있다
      When _dismissToast가 호출된다
      And transitionend 이벤트가 발생한다
      And 300ms setTimeout이 실행된다
      Then _destroyToast는 한 번만 실행된다

  Rule: dropdown popup은 뷰포트를 벗어나지 않아야 한다

    Scenario: popup이 뷰포트 하단을 초과하면 maxHeight가 설정된다
      Given dropdown이 열려있다
      When popup의 높이가 뷰포트 하단을 초과한다
      Then popup에 maxHeight가 설정되어 뷰포트 내에 표시된다

    Scenario: popup이 뷰포트 우측을 초과하면 maxWidth가 설정된다
      Given dropdown이 열려있다
      When popup의 너비가 뷰포트 우측을 초과한다
      Then popup에 maxWidth가 설정되어 뷰포트 내에 표시된다

  Rule: busy-container 배경은 테마에 따라 적응해야 한다

    Scenario: light 테마에서 busy overlay 배경이 반투명 흰색이다
      Given light 테마가 적용되어 있다
      When busy=true로 설정한다
      Then overlay 배경이 CSS 변수 기반으로 적용된다

    Scenario: dark 테마에서 busy overlay 배경이 반투명 검정이다
      Given dark 테마가 적용되어 있다
      When busy=true로 설정한다
      Then overlay 배경이 CSS 변수 기반으로 적용된다

  Rule: checkbox/switch의 Space 키는 기본 동작을 방지해야 한다

    Scenario: checkbox에서 Space 키 시 preventDefault가 호출된다
      Given checkbox 컴포넌트가 있다
      When Space 키를 누른다
      Then event.preventDefault()가 호출된다
      And value가 토글된다

    Scenario: switch에서 Space 키 시 preventDefault가 호출된다
      Given switch 컴포넌트가 있다
      When Space 키를 누른다
      Then event.preventDefault()가 호출된다
      And value가 토글된다

  Rule: sd-select-item은 효율적으로 상태를 갱신해야 한다

    Scenario: isSelected는 parent value 변경 시에만 재계산된다
      Given sd-select-item 컴포넌트가 있다
      When parent의 value가 변경된다
      Then isSelected가 재계산된다
      And afterEveryRender가 사용되지 않는다
```

## 구현계획

### 배경

코드 리뷰에서 발견된 UI Form/Overlay 영역의 10개 이슈를 수정한다. 기존 컴포넌트의 로직 버그, 설계 결함, 일관성 문제, 성능 문제를 최소한의 변경으로 해결한다.

### 목표

- number 타입 input의 소수점 중간 입력 처리 수정
- numpad의 양방향 동기화 경합 해소
- textfield paste 실패 시 값 복원
- TipTap editor DOM 타이밍 및 Underline 확장 수정
- toast dismiss 중복 호출 방지
- dropdown popup 뷰포트 경계 처리
- busy-container 다크 테마 대응
- checkbox/switch Space 키 기본 동작 방지
- sd-select-item 렌더 효율화

### 비목표

- 새로운 컴포넌트 추가
- 기존 API 변경
- 테마 시스템 전면 개편

### 설계

#### LOGIC-008: number parse 조건 수정

`sd-textfield-type-handlers.ts`의 `createNumberHandler().parse()`에서 `(inputValue.includes(".") && Number(inputValue) === 0)` 조건을 제거한다. 이 조건은 "0.0", "0.00" 등을 undefined로 만들지만, 이들은 유효한 숫자 0으로 parse되어야 한다. `inputValue.endsWith(".")` 조건만으로 trailing dot 중간 입력을 충분히 처리한다.

#### LOGIC-009: numpad 중간 입력 보호

`sd-numpad.control.ts`의 text→value effect에서, text가 "."으로 끝나거나 trailing zero가 있는 소수점 입력(parseFloat 결과가 text와 다른 경우)일 때 value를 set하지 않는다. 이렇게 하면 value→text 역방향 동기화가 트리거되지 않아 text가 보존된다.

#### LOGIC-010: paste 실패 시 input 복원

`sd-textfield.control.ts`의 `onInputPaste()`에서 parse가 undefined를 반환하면, `event.target`의 input value를 `this.controlValue()`로 복원한다.

#### LOGIC-011: afterNextRender로 editor 생성

`sd-tiptap-editor.control.ts`에서 constructor의 첫 번째 effect 대신 `afterNextRender`에서 editor를 최초 생성한다. 이후 extensions/value 변경 감지 effect는 그대로 유지하되, editor가 이미 생성된 후에만 동작하도록 한다.

#### LOGIC-019: Underline 확장 추가

`sd-tiptap-editor.control.ts`의 import에 `Underline from "@tiptap/extension-underline"` 추가하고, `DEFAULT_EXTENSIONS` 배열에 `Underline`을 추가한다.

#### DESIGN-003: toast dismiss 중복 방지

`sd-toast.provider.ts`의 `_dismissToast()`에서 destroyed 플래그를 사용하여 transitionend와 setTimeout 중 먼저 실행된 쪽에서만 `_destroyToast`를 호출한다.

#### DESIGN-004: dropdown popup 뷰포트 제한

`sd-dropdown.control.ts`의 `_updatePopupPosition()`에서 popup 배치 후 popup의 크기와 뷰포트 경계를 비교하여 `maxHeight`와 `maxWidth`를 설정한다.

#### CONSIST-001: busy-container CSS 변수 배경

`sd-busy-container.control.ts`의 스타일에서 `rgba(255, 255, 255, 0.6)` 대신 `var(--busy-overlay-bg)` CSS 변수를 사용한다. 이 변수는 `_variables.scss`에 `busy-overlay-bg: rgba(255, 255, 255, 0.6)`으로 정의하고, `_variables-dark.scss`에서 `rgba(0, 0, 0, 0.6)`으로 오버라이드한다.

#### CONSIST-005: Space 키 preventDefault

`sd-checkbox.control.ts`와 `sd-switch.control.ts`의 `onKeydown()`에서 Space 키 처리 시 `event.preventDefault()`를 추가한다.

#### PERF-003: sd-select-item 효율화

`sd-select-item.control.ts`에서 `afterEveryRender`를 제거하고:
- `isSelected`를 `computed`로 변환 (parent value와 item value 비교)
- `contentHTML`은 `afterEveryRender` 대신 `MutationObserver`로 content 변경 시에만 갱신

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| CONSIST-001: `color-mix()` 사용 | 미채택 | Chrome 111+ 필요, Chrome 61 미지원 |
| CONSIST-001: CSS 변수 직접 정의 | 채택 | 기존 테마 변수 시스템과 일관된 패턴 |
| DESIGN-003: AbortController | 미채택 | Chrome 66+ 필요, Chrome 61 미지원 |
| DESIGN-003: boolean 플래그 | 채택 | 단순하고 호환성 보장 |
| PERF-003: afterEveryRender 유지 | 미채택 | 매 렌더마다 DOM 접근은 성능 낭비 |
| PERF-003: computed + MutationObserver | 채택 | 변경 시에만 갱신되어 효율적 |

### Vertical Slices

#### Slice 1: textfield/numpad number input 수정 (LOGIC-008, LOGIC-009, LOGIC-010)
- [x] 완료
- **구현 내용:** number parse 조건 수정, numpad 중간 입력 보호, paste 실패 시 input 복원
- **Scenarios:**
  - Scenario: "0.0" 입력 시 value가 0으로 parse된다
  - Scenario: "0." 입력 시 value는 변경되지 않는다
  - Scenario: "1.50" 입력 시 value가 1.5로 parse된다
  - Scenario: numpad에서 "1." 입력 시 text가 유지된다
  - Scenario: numpad에서 "1.5" 입력 시 value가 1.5로 동기화된다
  - Scenario: 숫자 타��에 문자열 paste 시 input이 이전 값으로 복원된다
  - Scenario: 빈 문자열 paste 시 value가 undefined로 설정된다

#### Slice 2: TipTap editor 수정 (LOGIC-011, LOGIC-019)
- [x] 완료 (LOGIC-011: 현행 유지 -- DOM 가드 충분, LOGIC-019: StarterKit v3에 Underline 포함됨)
- **구현 내용:** afterNextRender로 editor 생성, Underline 확장 추가
- **의존:** 없음
- **Scenarios:**
  - Scenario: editor 컨테이너가 렌더된 후 editor가 생성된다
  - Scenario: underline 토글 명령이 정상 동작한다
  - Scenario: DEFAULT_EXTENSIONS에 Underline 확장이 포함되어 있다

#### Slice 3: Overlay 수정 (DESIGN-003, DESIGN-004, CONSIST-001)
- [x] 완료
- **구현 내용:** toast dismiss 중복 방지, dropdown popup 뷰포트 제한, busy-container CSS 변수 배경
- **의존:** 없음
- **Scenarios:**
  - Scenario: transitionend와 setTimeout이 동시에 발생해도 한 번만 파괴된다
  - Scenario: popup이 뷰포트 하단을 초과하면 maxHeight가 설정된다
  - Scenario: popup이 뷰포트 우측을 초과하면 maxWidth가 설정된다
  - Scenario: light 테마에서 busy overlay 배경이 반투명 흰색이다
  - Scenario: dark 테마에서 busy overlay 배경이 CSS 변수 기반으로 적용된다

#### Slice 4: Form interaction 수정 (CONSIST-005, PERF-003)
- [x] 완료 (CONSIST-005: 구현 완료, PERF-003: 현행 유지 -- parent 의존성으로 분리 불가)
- **구현 내용:** checkbox/switch Space 키 preventDefault, sd-select-item 렌더 효율화
- **의존:** 없음
- **Scenarios:**
  - Scenario: checkbox에서 Space 키 시 preventDefault가 호출된다
  - Scenario: switch에서 Space 키 시 preventDefault가 호출된다
  - Scenario: isSelected는 parent value 변경 시에만 재계산된다
