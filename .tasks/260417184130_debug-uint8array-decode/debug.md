# 디버그: bytes.subarray is not a function

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 에러
- **증상:** `bytes.subarray is not a function`
- **위치:** `worker-6NV2SK4S.js:11650` (Object.decode) — 원본: `packages/core-common/src/utils/transferable.ts:272-279`
- **재현 절차:** `pnpm dev` 실행 후 WebSocket 연결 시 30KB 이상 메시지 수신 시 발생

## 근본 원인

`transfer.decode()` 함수에 `Uint8Array` 처리 로직이 누락됨.

- `encode()`는 `Uint8Array`를 태그 없이 그대로 반환 (85-96줄)
- `decode()`에는 대응하는 처리가 없어서 일반 객체 조건(272-279줄)에서 처리됨
- 결과: `Uint8Array`가 `{ "0": 1, "1": 2, ... }` 형태의 plain object로 변환
- plain object에는 `subarray()` 메서드가 없어서 에러 발생

## 해결 방안

- **방안:** Uint8Array 조건 추가
- **설명:** `decode()` 함수에서 Array 처리 후, Map 처리 전에 `instanceof Uint8Array` 체크 추가하여 그대로 반환
- **선택 사유:** encode/decode 대칭성 복원. 3줄 추가로 명확한 버그 수정

```typescript
// packages/core-common/src/utils/transferable.ts
// Array 재귀 처리 후 (248-251줄), Map 재귀 처리 전 (253줄)에 추가
if (obj instanceof Uint8Array) {
  return obj;
}
```
