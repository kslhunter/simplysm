# FormTable Row/Item Sub-component Design

## Context

FormTable의 Tr/Th/Td sub-component를 FormGroup.Item 패턴과 통일하여 Row/Item으로 변경.
Field(→Item)가 th+td를 함께 렌더링하여 보일러플레이트를 줄이고 API 일관성을 확보.

## API

```tsx
<FormTable>
  <FormTable.Row>
    <FormTable.Item label="Name"><TextInput /></FormTable.Item>
    <FormTable.Item label="Email"><TextInput /></FormTable.Item>
  </FormTable.Row>
  <FormTable.Row>
    <FormTable.Item label="Remark" colspan={3}><TextInput /></FormTable.Item>
  </FormTable.Row>
  <FormTable.Row>
    <FormTable.Item colspan={3}><TextInput /></FormTable.Item>
  </FormTable.Row>
</FormTable>
```

## Component Structure

### FormTable (main)
- `<table>` + `<tbody>` 자동 생성
- Props: `JSX.HTMLAttributes<HTMLTableElement>`

### FormTable.Row
- `<tr>` wrapper
- 마지막 행/마지막 셀 패딩 제거 로직 유지
- Props: `JSX.HTMLAttributes<HTMLTableRowElement>`

### FormTable.Item
- `label` 있으면: `<th>label</th><td>children</td>`
- `label` 없으면: `<td colspan={auto+1}>children</td>`
- Props: `label?: JSX.Element`, `colspan?: number`, + `JSX.TdHTMLAttributes`

## colspan Auto-calculation

```tsx
const effectiveColspan = props.label ? props.colspan : (props.colspan ?? 1) + 1;
```

- label 없으면 th가 빠지므로 td의 colspan을 자동 +1
- 사용자는 "td가 차지할 논리적 칸 수"만 지정

## Style Classes

```tsx
// Row
const rowClass = clsx(
  "[&>*:last-child]:pr-0",  // 행의 마지막 셀: 우측 패딩 제거
  "last:[&>*]:pb-0",        // 마지막 행: 모든 셀 하단 패딩 제거
);

// th (label)
const thClass = clsx(
  "align-middle pr-1.5 pb-1",
  "w-0 whitespace-nowrap pl-1 text-right",
);

// td (content)
const tdClass = clsx("align-middle pr-1.5 pb-1");
```

## Modified Files

| File | Change |
|------|--------|
| `packages/solid/src/components/layout/FormTable.tsx` | Tr/Th/Td → Row/Item |
| `packages/solid-demo/src/pages/layout/FormTablePage.tsx` | Demo update |
| `packages/solid/tests/components/layout/FormTable.spec.tsx` | Test update |

## Design Decisions

- **Item (not Field)**: FormGroup.Item과 API 이름 통일
- **label: JSX.Element**: FormGroup.Item과 동일 타입, 아이콘+텍스트 등 유연한 표현 가능
- **tbody 자동 생성**: 사용자가 매번 `<tbody>` 작성할 필요 없음
- **colspan 자동 보정**: label 유무에 따라 컴포넌트가 알아서 처리
