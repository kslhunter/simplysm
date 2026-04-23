# `SdTopbar`

탑바 컴포넌트. `SdTopbarContainer` 내부에서 사용하며, 사이드바 토글 버튼과 콘텐츠 슬롯을 제공한다.

```typescript
@Component({ selector: "sd-topbar", ... })
export class SdTopbar
```

`SdSidebarContainer`가 상위에 있으면 자동으로 사이드바 토글 버튼을 표시한다.

### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — `<h4>` 타이틀 (조회 전용이라 버튼 없음)
- [crud-list.md §5 확장 A: inline 편집/저장](../recipes/crud-list.md#5-확장-a-inline-편집저장) — 저장·등록 버튼 추가
- [crud-detail.md §3 최소 뼈대: 읽기 전용 상세 폼](../recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — `<h4>` 타이틀 (읽기 전용이라 버튼 없음)
- [crud-detail.md §7 확장 C: modal 뷰](../recipes/crud-detail.md#7-확장-c-modal-뷰) — `@if (viewType() === "page")` 조건부 렌더

## Usage

```html
<sd-topbar-container>
  <sd-topbar>
    <h1>앱 타이틀</h1>
    <sd-topbar-menu [menus]="menus()" />
    <sd-topbar-user [menus]="userMenus()" />
  </sd-topbar>
  ...
</sd-topbar-container>
```
