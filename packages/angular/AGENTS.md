# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/angular/README.md`를 참조한다.

## Package Overview

- 패키지: `@simplysm/angular`
- 설명: Angular 21 기반 Simplysm UI 컴포넌트, 디렉티브, 프로바이더, 스타일 패키지
- 소스 파일 수: `src/` 기준 135개
- 공개 진입점: `src/index.ts`
- 스타일 진입점: `scss/styles.scss`

## Architecture

`src/`는 공개 UI 요소와 런타임 프로바이더를 기능별로 나눈다.

```text
src/
  controls/   버튼, 입력, 선택, 목록, 탭, 드롭다운 같은 기본 UI 컨트롤
  core/       bootstrap, DI provider, modal/toast/busy, 이벤트/라우팅/검증 유틸
  data/       sheet, CRUD, kanban, shared-data, permission table 같은 데이터 UI
  features/   주소 검색, Tiptap editor, theme, barcode/calendar/chart 등 고수준 기능
  layout/     dock, sidebar, topbar 레이아웃 컴포넌트
```

`scss/`는 전역 스타일 API를 제공한다.

```text
scss/
  commons/    변수, 테마 변수, mixin, 공통 스타일
  controls/   flex/grid/table/form/card 유틸리티 클래스
  themes/     dark 테마 변수 오버라이드
  styles.scss 공개 스타일 진입점
```

## Key Patterns

### Standalone Angular API

컴포넌트와 디렉티브는 standalone 선언을 사용하고, 소비자가 필요한 항목을 직접 imports에 넣는 구조다. 입력은 Angular signal input/model API로 노출한다.

```typescript
export class SdButton {
  readonly type = input<"button" | "submit" | "reset">("button");
  readonly theme = input<"primary" | "secondary" | "warning" | "danger" | "info">();
}
```

새 공개 UI 요소를 추가할 때는 `src/index.ts`에서 명시 export하고, 소비자 문서의 작업 라우터와 `_api-index.md`에 함께 반영한다.

### Provider 기반 런타임 기능

모달, 토스트, busy, 인쇄, shared-data, 시스템 설정은 injectable provider로 구현된다. provider는 내부 signal 또는 private 필드를 관리하고 public 메서드로만 소비자 동작을 열어 둔다.

```typescript
export class SdBusyProvider {
  readonly countSignal = signal(0);

  async run<T>(fn: () => T | Promise<T>, type?: SdBusyType): Promise<T> {
    // busy count/type을 증가시킨 뒤 작업 종료 시 원복한다.
  }
}
```

서비스성 API 문서는 provider 문서에 호출 시그니처와 결과 수신 방식을 같이 적는다.

### Modal/Toast Content Contract

동적으로 렌더링되는 모달과 토스트는 content definition interface를 구현한다. 입력 데이터는 `sdInput`으로 받고, 결과는 `sdSubmit` output으로 돌려준다.

```typescript
export interface SdModalContentDef<O> {
  sdSubmit?: OutputEmitterRef<O>;
}
```

커스텀 모달 문서를 수정할 때는 `SdModalProvider.showAsync(...)`, `SdActivatedModalProvider`, `SdModalContentDef`의 역할을 분리해서 설명한다.

### Shared Data 계열

공유 데이터는 `SharedDataBase<TKey>`를 기준으로 provider, select 컴포넌트, modal select button, sheet cell 사용 패턴이 연결된다. 같은 주제를 문서화할 때 `SdSharedDataProvider`와 UI 컴포넌트 문서가 서로 다른 작업을 담당하도록 유지한다.

### SCSS 공개 API

`package.json`의 `style` 필드와 `files`의 `scss` 포함 때문에 SCSS도 소비자 API다. `scss/styles.scss`에서 `@use`하는 전역 클래스, CSS custom property, theme, 공개 mixin/function을 문서에 반영한다.

## Testing

테스트는 `packages/angular/tests` 아래에 기능별로 배치된다.

```text
tests/
  *.spec.ts                  패키지 수준 provider/bootstrap 테스트
  *.acc.spec.ts              접근성 또는 수용 기준 테스트
  controls/**                컨트롤별 fixture + spec
  data/**, core/**, features/** 기능별 테스트
  *.verify.md                테스트 의도와 검증 기준 문서
```

Angular 컴포넌트 테스트는 fixture 컴포넌트를 별도 파일로 두는 패턴이 많다. 기존 fixture가 있는 기능은 같은 디렉터리에 `*-test.fixture.ts`를 추가하거나 확장한다.

## Package-specific Compiler Settings

- DOM 런타임 대상이므로 `lib`에 `DOM`, `DOM.Iterable`을 포함한다.
- `customConditions`는 `browser`를 사용한다.
- Angular compiler는 `strictTemplates`, `strictStandalone`, `typeCheckHostBindings`, `extendedDiagnostics.defaultCategory: "error"`를 켠다.
