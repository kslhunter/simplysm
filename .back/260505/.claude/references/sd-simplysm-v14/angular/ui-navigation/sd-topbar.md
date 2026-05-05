# `SdTopbar`

> **읽어야 하는 상황**: 탑바 내부에 제목, 메뉴, 사용자 영역을 배치할 때.

탑바 컴포넌트. `SdTopbarContainer` 내부에서 사용하며, 사이드바 토글 버튼과 콘텐츠 슬롯을 제공한다.

```typescript
@Component({ selector: "sd-topbar", ... })
export class SdTopbar
```

`SdSidebarContainer`가 상위에 있으면 자동으로 사이드바 토글 버튼을 표시한다.

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
