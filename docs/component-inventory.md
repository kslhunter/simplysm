# 컴포넌트 인벤토리

> 생성일: 2026-02-01
> 버전: 13.0.0-beta.0

## @simplysm/solid 컴포넌트

> ⚠️ **현재 상태**: Tailwind CSS로 마이그레이션 진행 중
>
> 기존 vanilla-extract 기반 컴포넌트들이 백업되었으며, Tailwind CSS 기반으로 재작성 중입니다.

### 활성 컴포넌트

| 컴포넌트 | 파일 | 설명 | 상태 |
|----------|------|------|------|
| `Button` | `components/controls/Button.tsx` | 기본 버튼 컴포넌트 | ✅ 활성 |

### 제공 유틸리티

| 유틸리티 | 파일 | 설명 |
|----------|------|------|
| `tailwindPreset` | `tailwind-preset.ts` | Tailwind CSS 프리셋 (Chrome 84+ 호환) |

## 마이그레이션 계획 (백업된 컴포넌트)

기존 컴포넌트들은 `.back/260201/solid/` 디렉토리에 백업되어 있습니다.
마이그레이션 완료 후 다음 컴포넌트들이 Tailwind CSS 기반으로 재작성될 예정입니다:

### Controls (입력 컴포넌트) - 예정

| 컴포넌트 | 설명 | 마이그레이션 상태 |
|----------|------|------------------|
| `Checkbox` | 체크박스 컴포넌트 | 📋 예정 |
| `Switch` | 토글 스위치 컴포넌트 | 📋 예정 |
| `Radio` | 라디오 버튼 컴포넌트 | 📋 예정 |
| `TextField` | 텍스트 입력 필드 | 📋 예정 |
| `Textarea` | 멀티라인 텍스트 입력 | 📋 예정 |
| `NumberField` | 숫자 입력 필드 | 📋 예정 |
| `DateField` | 날짜 선택 필드 | 📋 예정 |
| `TimeField` | 시간 선택 필드 | 📋 예정 |
| `DatetimeField` | 날짜+시간 선택 필드 | 📋 예정 |
| `ColorField` | 색상 선택 필드 | 📋 예정 |

### Overlay (오버레이 컴포넌트) - 예정

| 컴포넌트 | 설명 | 마이그레이션 상태 |
|----------|------|------------------|
| `Dropdown` | 드롭다운 래퍼 | 📋 예정 |
| `DropdownPopup` | 드롭다운 팝업 | 📋 예정 |

### Navigator (네비게이션 컴포넌트) - 예정

| 컴포넌트 | 설명 | 마이그레이션 상태 |
|----------|------|------------------|
| `Collapse` | 접기/펼치기 컴포넌트 | 📋 예정 |
| `Sidebar` | 사이드바 | 📋 예정 |
| `SidebarMenu` | 사이드바 메뉴 | 📋 예정 |
| `Topbar` | 상단바 | 📋 예정 |
| `TopbarMenu` | 상단바 메뉴 | 📋 예정 |

### Data (데이터 표시 컴포넌트) - 예정

| 컴포넌트 | 설명 | 마이그레이션 상태 |
|----------|------|------------------|
| `List` | 리스트 컴포넌트 | 📋 예정 |
| `ListItem` | 리스트 아이템 | 📋 예정 |

## 컴포넌트 통계

| 카테고리 | 활성 | 예정 |
|----------|------|------|
| Controls | 1 | 10 |
| Overlay | 0 | 2 |
| Navigator | 0 | 5 |
| Data | 0 | 2 |
| **총계** | **1** | **19** |

## 스타일링 시스템

### 현재: Tailwind CSS

```typescript
// tailwind-preset.ts
import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  content: [`${__dirname}**/*.{ts,tsx}`],
  corePlugins: {
    aspectRatio: false, // Chrome 84 미지원
  },
};

export default preset;
```

### 사용법

```typescript
// tailwind.config.ts
import { tailwindPreset } from "@simplysm/solid";

export default {
  presets: [tailwindPreset],
  content: ["./src/**/*.{ts,tsx}"],
} satisfies Config;
```

## 사용 예시

### Button 컴포넌트

```tsx
import { Button } from "@simplysm/solid";

function App() {
  return (
    <Button onClick={() => console.log("clicked")}>
      클릭
    </Button>
  );
}
```

### Button Props

```typescript
interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  // HTML button 속성 모두 지원
}
```

## 브라우저 호환성

- **Chrome 84+** 지원 필수
- TypeScript는 esbuild로 Chrome 84 타겟으로 트랜스파일됨
- **CSS는 트랜스파일되지 않음** - Chrome 84 미지원 CSS 기능 사용 금지
  - ✅ 사용 가능: Flexbox gap
  - ❌ 사용 금지: `aspect-ratio`, `inset`, `:is()`, `:where()` (Chrome 88+)

## 반응형 디자인

- **모바일 브레이크포인트**: 520px 미만
- Tailwind CSS 반응형 유틸리티 사용 권장

---

*이 문서는 document-project 워크플로우에 의해 자동 생성되었습니다.*
