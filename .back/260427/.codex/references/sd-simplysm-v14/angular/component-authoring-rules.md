# 소비 컴포넌트 작성 공통 규칙

> **읽어야 하는 상황**: `@simplysm/angular`를 사용하는 앱 컴포넌트에서 `data`, `item`, `filter`, `form`
> 같은 로컬 상태 타입과 초기값을 정의할 때.

이 문서는 컴포넌트의 로컬 상태 모델링 규칙만 다룬다. 화면 렌더링 시점, input required 여부,
shared-data 사용 여부와는 별개로 적용한다.

## 미지정 가능한 필드는 optional property로 작성한다

`data`, `item`, `filter`, `form` 같은 소비 컴포넌트 로컬 상태에서 프로퍼티가 없을 수 있으면
`T | undefined` 대신 optional property(`?`)로 표현한다.

권장:

```typescript
interface IData {
  customerId?: number;
  dueDate?: DateOnly;
  memo?: string;

  items: IItem[];
}
```

비권장:

```typescript
interface IData {
  customerId: number | undefined;
  dueDate: DateOnly | undefined;
  memo: string | undefined;

  items: IItem[];
}
```

`T | undefined`는 프로퍼티 자체가 항상 존재해야 하는 별도 계약이 있을 때만 사용한다. 일반적인
소비 컴포넌트 로컬 상태에서는 미지정 가능한 프로퍼티를 `?`로 둔다.

## 미지정 상태를 가짜 기본값으로 표현하지 않는다

초기값에는 실제 의미가 있는 값만 넣는다. 로드 전, 미선택, 미입력 상태를 표현하려고 `0`, `""`,
임의 날짜, 임의 ID 같은 값을 넣지 않는다.

권장:

```typescript
data = signal<IData>({
  items: [],
  attachments: [],
});
```

비권장:

```typescript
data = signal<IData>({
  code: "",
  customerId: 0,
  items: [],
  attachments: [],
});
```

위 예시에서 `items: []`, `attachments: []`는 실제 초기 상태가 빈 컬렉션이므로 정상 기본값이다.
반면 `code: ""`, `customerId: 0`은 미지정 상태를 실제 값처럼 위장하므로 사용하지 않는다.

## 실제 업무 기본값은 초기값으로 둔다

금지 대상은 특정 리터럴 값이 아니라 "미지정 상태를 숨기기 위한 값"이다. 신규 데이터가 업무적으로
명확한 초기 상태를 가져야 한다면 그 값은 기본값으로 둔다.

권장:

```typescript
newInstruction = signal<IInstruction>({
  state: "작성",
  items: [],
});
```

이 예시에서 `"작성"`은 미지정 상태를 숨기는 값이 아니라 신규 지시의 실제 초기 상태이므로 정상
기본값이다.
