# SdIntersectionDirective 전환 — LLM 검증

## 검증 항목

- plugin 파일 삭제: `packages/angular/src/core/events/sd-intersection-event.plugin.ts` 존재하지 않음 확인
- provideSdAngular 등록 제거: `SdIntersectionEventPlugin` 문자열이 `packages/angular/src/` 전체에서 0건 확인
- index.ts export 갱신: `SdIntersectionDirective`와 `type SdIntersectionEvent`가 `sd-intersection` 모듈에서 export됨 확인
