# sd-select 스타일 복원 — LLM 검증

검증 대상: `packages/angular/src/controls/select/sd-select.ts:98-237`

## Slice 1: 컨테이너 구조 및 기본 모드 복원

### Rule: 기본 크기 설정

- [x] `sd-select` 루트에 `width: 100%` 존재: :105
- [x] `sd-select` 루트에 `min-width: 10em` 존재: :106

### Rule: 시각적 컨테이너는 sd-dropdown

- [x] `> sd-dropdown`에 `display: flex` 존재: :109
- [x] `> sd-dropdown`에 `overflow: hidden` 존재: :110
- [x] `> sd-dropdown`에 `border: 1px solid var(--trans-lighter)` 존재: :112
- [x] `> sd-dropdown`에 `border-radius: var(--border-radius-default)` 존재: :113
- [x] `> sd-dropdown`에 `background: var(--theme-secondary-lightest)` 존재: :114
- [x] `._sd-select-control`에 `border`, `border-radius`, `background` 직접 선언 없음: form-control-base()의 transparent border만 존재
- [x] `._sd-select-control`에 `flex-grow: 1` 존재: :124

### Rule: 포커스 시 primary 색상 피드백

- [x] `> sd-dropdown`에 `&:focus, &:focus-within { border-color: var(--theme-primary-default) }` 존재: :116-119
- [x] 이전의 `--theme-secondary-default` 색상 사용 없음: 파일 전체에서 제거 확인

### Rule: 컨트롤 내 gap 간격

- [x] `._sd-select-control`에 `gap: var(--gap-default)` 존재: :126
- [x] `._sd-select-control-icon`에 `margin-left` 없음: :136-138에 opacity만 존재

### Rule: 아이콘 인터랙션 피드백

- [x] `._sd-select-control-icon`에 기본 `opacity: 0.3` 존재: :137
- [x] `._sd-select-control` hover/focus/active 시 `._sd-select-control-icon`의 `opacity: 1` 규칙 존재: :140-144

### Rule: sd-select-button 컨테이너 내 배치

- [x] `> sd-dropdown > sd-select-button`에 `padding: var(--gap-sm)` 존재: :148
- [x] `> sd-dropdown > sd-select-button`에 `border-left: 1px solid var(--theme-gray-lightest)` 존재: :149
- [x] `> sd-dropdown > sd-select-button:last-of-type`에 `border-top-right-radius`, `border-bottom-right-radius` 존재: :151-154

### Rule: Disabled 시각적 구분

- [x] disabled 시 `> sd-dropdown`에 `background: var(--theme-gray-lightest)` 존재: :160
- [x] disabled 시 `._sd-select-control`에 `color: var(--text-trans-light)` 존재: :163
- [x] disabled 시 `._sd-select-control`에 `cursor: default` 존재: :164
- [x] disabled 시 `._sd-select-control-icon`에 `display: none` 존재: :167

## Slice 2: Variant 모드 복원

### Rule: Inline 수직 정렬

- [x] inline 모드에 `vertical-align: top` 존재: :176

### Rule: Size variant 스케일링

- [x] size sm 시 `._sd-select-control`에 `gap: var(--gap-sm)` 존재: :183
- [x] size sm 시 `sd-select-button`에 `padding: var(--gap-xs)` 존재: :187
- [x] size lg 시 `._sd-select-control`에 `gap: var(--gap-lg)` 존재: :196
- [x] size lg 시 `sd-select-button`에 `padding: var(--gap-default)` 존재: :200

### Rule: Inset 모드 통합 스타일

- [x] inset 시 `min-width: auto` 존재: :206
- [x] inset 시 `border-radius: 0` (루트) 존재: :207
- [x] inset 시 `> sd-dropdown`에 `border: none; border-radius: 0` 존재: :210-211
- [x] inset 시 `> sd-select-button`에 `border-radius: 0` 존재: :214
- [x] inset focus 시 `outline: 1px solid var(--theme-primary-default)` + `outline-offset: -1px` 존재: :219-220
- [x] inset focus 시 `> sd-select-button`에도 동일한 outline 존재: :222-225
- [x] inset disabled 시 `sd-dropdown`에 `background: var(--control-color)` 존재: :230
- [x] inset disabled 시 `._sd-select-control`에 `color: var(--text-trans-default)` 존재: :233
