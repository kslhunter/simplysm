# Icon 컴포넌트 설계

## 목적

`@tabler/icons-solidjs` 아이콘을 래핑하여 기본 크기를 `1lh`로 설정하는 컴포넌트.

## 결정 사항

- **위치:** `packages/solid/src/components/display/Icon.tsx`
- **기본 크기:** `1lh` (텍스트 라인 높이에 맞춤)
- **크기 오버라이드:** `size` prop으로 가능 (tabler icon의 size에 그대로 전달)
- **기타 props:** tabler icon에 그대로 전달 (`class`, `color`, `strokeWidth` 등)

## 구현

```tsx
import { type Component, splitProps } from "solid-js";
import type { IconProps as TablerIconProps } from "@tabler/icons-solidjs";

export interface IconProps extends Omit<TablerIconProps, "size"> {
  icon: Component<TablerIconProps>;
  size?: string | number;
}

export const Icon: Component<IconProps> = (props) => {
  const [local, rest] = splitProps(props, ["icon", "size"]);
  return local.icon({ size: local.size ?? "1lh", ...rest });
};
```

## 사용 예시

```tsx
import { Icon } from "@simplysm/solid";
import { IconHome } from "@tabler/icons-solidjs";

<Icon icon={IconHome} />              // 기본 1lh
<Icon icon={IconHome} size="24" />    // 24px
<Icon icon={IconHome} size="2rem" />  // 2rem
<Icon icon={IconHome} class="text-red-500" />  // 색상 변경
```

## 작업 목록

1. `packages/solid/src/components/display/` 폴더 생성
2. `Icon.tsx` 파일 생성
3. `packages/solid/src/index.ts`에서 export 추가
4. 기존 코드에서 아이콘 사용 부분을 Icon 컴포넌트로 마이그레이션 (선택)
