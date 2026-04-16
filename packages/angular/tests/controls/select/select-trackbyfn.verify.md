# sd-select trackByFn input — LLM 검증

## 검증 항목

- [x] sd-select에 trackByFn input이 존재하고 기본값이 `(item) => item`: `sd-select.ts:267` — `trackByFn = input<(item: T, index: number) => unknown>((item) => item);` 확인
- [x] @for track 표현식이 trackByFn을 사용: `sd-select.ts:86` — `track trackByFn()(item.data, item.index)` 확인, _flatItems 래퍼의 `.data`와 `.index`를 올바르게 전달
- [x] sd-shared-data-select에서 [trackByFn] 바인딩 존재: `sd-shared-data-select.ts:64` — `[trackByFn]="trackByFn"` 확인
- [x] sd-shared-data-select에 trackByFn 프로퍼티가 __valueKey 반환: `sd-shared-data-select.ts:183` — `trackByFn = (item: TItem): TItem["__valueKey"] => item.__valueKey;` 확인
