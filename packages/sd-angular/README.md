# SD Angular

Custom Signal-Based Angular UI Framework

`sd-angular`는 **Angular 16+ (Signal 기반)** 환경을 위해 설계된
고급 UI 컴포넌트 + 애플리케이션 인프라 + 화면 패턴(Feature)을 제공하는
**풀스택 UI 프레임워크**입니다.

Simplysm 플랫폼에서 실제 운영되는 UI 시스템을 기반으로 설계되었으며,
기업용 Admin UI/업무 시스템/대규모 Feature 기반 프로젝트에 적합하도록 구성되었습니다.

---

## ✨ 주요 특징

### 🚀 Signal 기반 고성능 UI

* Angular Signals 를 기반으로 모든 상태 흐름을 관리
* ChangeDetection 전략 최적화
* template → signal 연동을 위한 custom binding 유틸리티 제공

### 🧱 재사용 UI 컴포넌트 (UI Layer)

아래와 같이 역할별로 잘 정리된 UI 컴포넌트를 제공합니다.

* **Form Controls**: button, input, select, date-range, switch, checkbox group 등
* **Layout Controls**: grid, flex, pane, dock, view, kanban
* **Navigation Controls**: tab, sidebar, topbar, pagination
* **Data Controls**: sheet(고성능 테이블), list
* **Overlay Controls**: modal, toast, busy, dropdown
* **Visual Controls**: barcode, calendar, echarts wrapper, progress, note, label

### 🔧 Core Infrastructure

애플리케이션 전역에 필요한 인프라 도구들을 제공합니다.

* Directive / Pipes / Event Plugins
* 시스템 구성 Provider
* LocalStorage / FileDialog / ServiceClient 유틸
* Signal Helpers (`$signal`, `$effect`, `$computed` 등)
* DOM/Manager/Setup 계열 유틸리티

### 📦 Feature Layer (업무 화면 패턴)

일반 UI가 아닌 **업무/도메인 기능을 구현하는 컴포넌트 모음**입니다.

* DataView / DataSheet / DataDetail
* Shared Data Selection
* Permission Table
* Address Search
* Theme Selection (Theme Selector)

### 🎨 확장 가능한 테마 시스템

* ThemeProvider(core 레이어)
* ThemeSelector(Feature 레이어)
* SCSS 기반 multi-theme (compact / mobile / kiosk / modern / dark)

---

## 📁 폴더 구조

`sd-angular`는 크게 **core, ui, features** 3개의 레이어로 구성됩니다.

```
src/
  core/        # 인프라/환경/DI/Signals/Directives/Pipes
  ui/          # UI 컴포넌트 + Overlay 시스템
  features/    # 실제 화면 기능(도메인 단위)
```

### 🔹 Core Layer

플랫폼/인프라 레벨 기능을 담당합니다.

```
core/
  directives/
  pipes/
  plugins/
  providers/
  utils/
    bindings/
    managers/
    setups/
    signals/
    transforms/
```

### 🔹 UI Layer

Signal 기반의 디자인 시스템 + Overlay 인프라를 제공하는 레이어입니다.

```
ui/
  form/
  layout/
  data/
  navigation/
  overlay/    # busy / modal / toast / dropdown
  visual/
```

### 🔹 Feature Layer

업무/도메인 기능으로 구성된 상위 레이어입니다.

```
features/
  theme/
  data-view/
  permission-table/
  shared-data/
  address/
  base/
```

---

## 📦 설치

```
npm install sd-angular
```

Angular 16 이상을 권장하며 `provideSdAngular()`를 통해 초기 설정을 진행합니다.

---

## ⚙️ 초기 설정

`main.ts` 혹은 bootstrap 영역:

```ts
import { provideSdAngular } from "sd-angular";

bootstrapApplication(AppComponent, {
  providers: [
    provideSdAngular({
      defaultTheme: "compact",
      defaultDark: false
    })
  ]
});
```

---

## 🧩 간단 사용 예시

### Form 예시

```html
<sd-form>
  <sd-textfield label="Name" />
  <sd-select label="Type" [items]="types" />
  <sd-button (click)="save()">Save</sd-button>
</sd-form>
```

### Sheet 예시

```html
<sd-sheet
  [items]="rows"
  (itemSelect)="onSelect($event)"
></sd-sheet>
```

---

## 🎨 테마 변경 예시

```html
<sd-theme-selector></sd-theme-selector>
```

Signal 기반 테마와 연동되어 자동 업데이트 됩니다.

---

## 🔌 Overlay 예시 (Toast)

```ts
import { inject } from "@angular/core";
import { SdToastProvider } from "sd-angular/ui/overlay/toast";

export class Example {
  #toast = inject(SdToastProvider);

  show() {
    this.#toast.info("Hello World!");
  }
}
```

---

## 📚 개발 포맷

* Angular 20
* Standalone Components
* Signals 기반 상태 관리
* SCSS 모듈 및 Multi Theme 전략
* Strict Mode / TypeScript 기반 개발

---

## 🤝 라이선스

MIT

---

## 📢 문의 / 기여

이 패키지는 Simplysm 내부 프로젝트의 기반 UI 시스템이며,
기여 또는 제안은 이슈로 등록해주세요.
