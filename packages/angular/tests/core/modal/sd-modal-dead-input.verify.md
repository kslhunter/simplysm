# SdModal dead input 제거 및 tabindex 통일 — LLM 검증

## 검증 항목

- [x] headerStyle이 SdModal input에 존재하지 않는다: `sd-modal.ts:305-311` 확인 — `widthPx` 다음이 `actionTplRef`이며, `headerStyle` input 없음
- [x] SdModalOptions에서 headerStyle 프로퍼티가 제거되었다: `sd-modal.provider.ts:55-71` 확인 — `SdModalOptions` 인터페이스에 `headerStyle` 프로퍼티 없음
- [x] noFirstControlFocusing이 SdModal input에 존재하지 않는다: `sd-modal.ts:305-311` 확인 — `noFirstControlFocusing` input 없음
- [x] provider의 setInput 루프가 noFirstControlFocusing을 SdModal에 전달하지 않는다: `sd-modal.provider.ts:128-133` 확인 — `key !== "noFirstControlFocusing"` 필터 조건 추가됨
- [x] SdCheckbox의 tabindex 바인딩이 `"'0'"` 형태이다: `sd-checkbox.ts:250` 확인 — `"[attr.tabindex]": "'0'"` (SdSwitch와 동일)
