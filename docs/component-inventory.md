# 컴포넌트 인벤토리

> 생성일: 2026-01-31

## @simplysm/solid 컴포넌트

### Controls (입력 컴포넌트)

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| `Button` | `components/controls/button.tsx` | 기본 버튼 컴포넌트 |
| `Checkbox` | `components/controls/checkbox.tsx` | 체크박스 컴포넌트 |
| `Radio` | `components/controls/radio.tsx` | 라디오 버튼 컴포넌트 |
| `TextField` | `components/controls/text-field.tsx` | 텍스트 입력 필드 |
| `NumberField` | `components/controls/number-field.tsx` | 숫자 입력 필드 |
| `DateField` | `components/controls/date-field.tsx` | 날짜 선택 필드 |
| `TimeField` | `components/controls/time-field.tsx` | 시간 선택 필드 |
| `DatetimeField` | `components/controls/datetime-field.tsx` | 날짜+시간 선택 필드 |
| `ColorField` | `components/controls/color-field.tsx` | 색상 선택 필드 |

### Overlay (오버레이 컴포넌트)

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| `Dropdown` | `components/overlay/dropdown.tsx` | 드롭다운 래퍼 |
| `DropdownPopup` | `components/overlay/dropdown-popup.tsx` | 드롭다운 팝업 |
| `DropdownContext` | `components/overlay/dropdown-context.tsx` | 드롭다운 컨텍스트 |

### Navigator (네비게이션 컴포넌트)

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| `Collapse` | `components/navigator/collapse.tsx` | 접기/펼치기 컴포넌트 |
| `CollapseIcon` | `components/navigator/collapse-icon.tsx` | 접기 아이콘 |
| `SidebarContainer` | `components/navigator/sidebar-container.tsx` | 사이드바 컨테이너 |
| `Sidebar` | `components/navigator/sidebar.tsx` | 사이드바 |
| `SidebarMenu` | `components/navigator/sidebar-menu.tsx` | 사이드바 메뉴 |
| `SidebarUser` | `components/navigator/sidebar-user.tsx` | 사이드바 사용자 정보 |
| `SidebarContext` | `components/navigator/sidebar-context.tsx` | 사이드바 컨텍스트 |
| `TopbarContainer` | `components/navigator/topbar-container.tsx` | 상단바 컨테이너 |
| `Topbar` | `components/navigator/topbar.tsx` | 상단바 |
| `TopbarMenu` | `components/navigator/topbar-menu.tsx` | 상단바 메뉴 |
| `TopbarUser` | `components/navigator/topbar-user.tsx` | 상단바 사용자 정보 |

### Data (데이터 표시 컴포넌트)

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| `List` | `components/data/list.tsx` | 리스트 컴포넌트 |
| `ListItem` | `components/data/list-item.tsx` | 리스트 아이템 |

### Contexts (컨텍스트)

| 컨텍스트 | 파일 | 설명 |
|----------|------|------|
| `ConfigContext` | `contexts/ConfigContext.tsx` | 앱 설정 컨텍스트 |
| `ThemeContext` | `contexts/ThemeContext.tsx` | 테마 컨텍스트 (다크/라이트) |

### Directives (디렉티브)

| 디렉티브 | 파일 | 설명 |
|----------|------|------|
| `ripple` | `directives/ripple.ts` | 리플 효과 디렉티브 |
| `invalid` | `directives/invalid.ts` | 유효성 검사 스타일 |

### Hooks

| 훅 | 파일 | 설명 |
|----|------|------|
| `useLocalStorage` | `hooks/useLocalStorage.ts` | 로컬 스토리지 상태 훅 |

## 스타일링 시스템

### vanilla-extract 기반 스타일

| 파일 | 설명 |
|------|------|
| `styles.ts` | 스타일 통합 export |
| `styles/global.css.ts` | 글로벌 스타일 |
| `styles/atoms.css.ts` | 원자 스타일 (sprinkles) |
| `styles/variables/colors.css.ts` | 색상 변수 |
| `styles/variables/theme.css.ts` | 테마 변수 |
| `styles/variables/token.css.ts` | 디자인 토큰 |
| `styles/variables/vars.css.ts` | CSS 변수 |
| `styles/mixins/boolean-transition.css.ts` | 트랜지션 믹스인 |

## 사용 예시

```tsx
import { ConfigProvider, ThemeProvider, Button, TextField } from "@simplysm/solid";
import "@simplysm/solid/styles"; // 스타일 import

function App() {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <div>
          <TextField placeholder="이름을 입력하세요" />
          <Button>저장</Button>
        </div>
      </ThemeProvider>
    </ConfigProvider>
  );
}
```

## 반응형 디자인

- **모바일 브레이크포인트**: 520px 미만
- 520px 미만에서 모바일 UI로 자동 전환
