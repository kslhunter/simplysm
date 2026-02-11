# Tab 컴포넌트 설계

> 작성일: 2026-02-09

## 개요

탭 헤더(버튼 바)만 제공하는 컴포넌트. 콘텐츠 전환은 사용자가 `<Show>`로 직접 처리한다.

## API

```tsx
interface TabProps {
  value?: string;
  onValueChange?: (value: string) => void;
  size?: "sm" | "lg";
  class?: string;
  children: JSX.Element;
}

interface TabItemProps {
  value: string;
  disabled?: boolean;
  class?: string;
  children: JSX.Element;
}
```

## Compound Component

- `Tab` (루트) + `Tab.Item` (탭 버튼)
- dot notation으로 접근: `Tab.Item`
- Context로 부모-자식 상태 공유
- `createPropSignal`로 controlled/uncontrolled 지원

## 스타일

- **언더라인 스타일** (단일, variant 없음)
- 탭 리스트 하단에 연한 border 경계선
- 선택된 탭: primary 색상 밑줄(2~3px) + primary 텍스트
- 미선택 탭: base 색상 텍스트
- hover: 배경 살짝 변경
- disabled: opacity 처리

## 사이즈

| size        | 설명      |
| ----------- | --------- |
| `sm`        | 작은 패딩 |
| `undefined` | 기본      |
| `lg`        | 큰 패딩   |

## 사용 예시

```tsx
const [tab, setTab] = createSignal("general");

<Tab value={tab()} onValueChange={setTab}>
  <Tab.Item value="general">일반</Tab.Item>
  <Tab.Item value="advanced">고급</Tab.Item>
</Tab>

<Show when={tab() === "general"}>
  <GeneralSettings />
</Show>
<Show when={tab() === "advanced"}>
  <AdvancedSettings />
</Show>
```

## 설계 결정 사유

- **헤더만 제공**: `<Show>`는 SolidJS 핵심 패턴이므로 콘텐츠 전환을 다시 감쌀 필요 없음
- **언더라인 스타일**: ERP 등 정보 밀도가 높은 화면에서 시각적 노이즈가 적고, 기존 border 기반 컴포넌트들과 조화
- **variant 없음**: YAGNI 원칙. 필요 시 추후 추가
