# sd-state-preset 스타일 복원 — LLM 검증

## 검증 항목

### 템플릿 검증
- Star 아이콘 `tx-theme-warning-default` 클래스: `sd-state-preset.ts:34` — `class="tx-theme-warning-default"` 확인
- Floppy 아이콘 `[size]="'1em'"`: `sd-state-preset.ts:42` — `[size]="'1em'"` 확인
- X 아이콘 `[size]="'1em'"`: `sd-state-preset.ts:45` — `[size]="'1em'"` 확인
- 프리셋 이름 앵커 `tx-trans-default` 클래스: `sd-state-preset.ts:38` — `class="_preset-name tx-trans-default"` 확인

### 스타일 검증
- Host display `inline-block; vertical-align: top`: `sd-state-preset.ts:54-55` — v12:47-49와 일치
- Add 버튼 `line-height: var(--line-height)`: `sd-state-preset.ts:64` — v12:53와 일치
- Add 버튼 `border: 1px solid transparent`: `sd-state-preset.ts:65` — v12:54와 일치
- Add 버튼 기본 padding `var(--gap-sm) var(--gap-default)`: `sd-state-preset.ts:66` — v12:55와 일치
- 프리셋 아이템 `line-height: var(--line-height)`: `sd-state-preset.ts:73` — v12:62와 일치
- 프리셋 아이템 `border: 1px solid transparent`: `sd-state-preset.ts:74` — v12:63와 일치 (v14는 `var(--trans-lighter)`였음)
- 프리셋 아이템 `border-radius: var(--border-radius-lg)`: `sd-state-preset.ts:75` — v12:67과 일치 (v14는 `var(--border-radius-default)`였음)
- 프리셋 아이템 기본 padding `var(--gap-sm) var(--gap-default)`: `sd-state-preset.ts:76` — v12:64와 일치
- 프리셋 아이템 `background: var(--theme-gray-lightest)`: `sd-state-preset.ts:77` — v12:66과 일치
- 프리셋 아이템 hover `background: var(--theme-gray-lighter)`: `sd-state-preset.ts:79-81` — v12:69-71과 일치
- 프리셋 아이템 내부 앵커 `padding: 0 var(--gap-sm)`: `sd-state-preset.ts:83-85` — v12:73-75와 일치
- sm 사이즈 padding `var(--gap-xs) var(--gap-default)`: `sd-state-preset.ts:91,95` — v12:80과 일치
- lg 사이즈 padding `var(--gap-default) var(--gap-lg)`: `sd-state-preset.ts:101,105` — v12:86과 일치
