# Feature 1.1 Infrastructure provider를 core/로 이동 — LLM 검증

## 검증 항목

- [x] SdBusyProvider가 core/providers/sd-busy.provider.ts에 존재: `packages/angular/src/core/providers/sd-busy.provider.ts` 확인됨
- [x] SdToastProvider가 core/providers/sd-toast.provider.ts에 존재: `packages/angular/src/core/providers/sd-toast.provider.ts` 확인됨
- [x] SdActivatedModalProvider가 core/providers/sd-activated-modal.provider.ts에 존재: `packages/angular/src/core/providers/sd-activated-modal.provider.ts` 확인됨
- [x] ISelectModalOutputResult가 core/types/select-modal-output-result.ts에 존재: `packages/angular/src/core/types/select-modal-output-result.ts` 확인됨
- [x] 구 경로 `ui/overlay/busy/sd-busy.provider` 참조 0건: grep 결과 없음
- [x] 구 경로 `ui/overlay/toast/sd-toast.provider` 참조 0건: grep 결과 없음
- [x] sd-modal.provider.ts에서 SdActivatedModalProvider class 정의 제거됨: import로 대체
- [x] sd-modal-select-button.control.ts에서 ISelectModalOutputResult 정의 제거됨: import로 대체
- [x] index.ts에서 SdBusyProvider export 경로가 core/providers/를 가리킴
- [x] index.ts에서 SdToastProvider export 경로가 core/providers/를 가리킴
- [x] index.ts에서 SdActivatedModalProvider export 경로가 core/providers/를 가리킴
- [x] index.ts에서 ISelectModalOutputResult export 경로가 core/types/를 가리킴
- [x] SdActivatedModalProvider의 ISdModal type-only 의존: core/ → ui/ type-only import 1건 (런타임 의존 아님, 허용됨)
- [x] 전체 테스트 통과: 137파일 1261테스트 전체 PASS
