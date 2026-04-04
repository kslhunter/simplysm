# 디버그: Angular HMR 컴포넌트 업데이트 요청이 base path 환경에서 404 실패

## 출처

- **origin:** `kslhunter/simplysm#10`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 에러 증상

- **에러 메시지:** `GET http://localhost:40480/client-pda/src/services/@ng/component?c=packages%2Fclient-pda%2Fsrc%2Fservices%2Fmodalprovider.ts%40ModalControl&t=1775018088692 net::ERR_ABORTED 404 (Not Found)`
- **위치:** `packages/sd-cli/src/angular/vite-angular-plugin.ts:432`
- **재현:** Vite base path(`/client-pda/`)가 설정된 Angular 프로젝트에서 컴포넌트 파일 수정 시 HMR 업데이트 요청이 404로 실패

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: URL `/{base}/@ng/component` 404 | E2: base=`/`이면 정상 | E3: `startsWith("/@ng/component")` (L432) | E4: Vite `baseMiddleware`가 base strip (config.js:20563) | E5: `configureServer` 미들웨어는 Vite 내부보다 먼저 실행 |
|----|-------|-------|-------|-------|-------|
| H1: 미들웨어가 baseMiddleware보다 먼저 실행되어 base strip 전 URL을 받음 | C(code) | C(code) | C(code) | C(code) | C(code) |
| H2: Vite가 base path를 strip하지 않음 | C(infer) | C(infer) | N | I → 폐기 | N |
| H3: Angular HMR 상대 경로 resolve | C(infer) | I → 폐기 | N | N | N |

### 결과: 확정 — H1

`angularComponentMiddleware`가 Vite의 `baseMiddleware`보다 먼저 실행(pre-middleware)되어, base path가 strip되지 않은 `req.url`을 받아 `startsWith("/@ng/component")` 매칭이 실패. C(code) 5건으로 확정.

## 해결 방안

### 방안 A: `configureServer`에서 post-middleware로 등록

- **설명:** `configureServer`에서 함수를 반환하여 Vite 내부 미들웨어 이후에 실행
- **장점:** Vite의 base path 처리에 자연스럽게 의존. Vite 공식 패턴.
- **반론:** post-middleware는 `transformMiddleware` 이후에 실행되므로, `/@ng/component` 요청이 먼저 transformMiddleware에서 처리/실패될 위험. pre-middleware로 유지해야 하는 기술적 제약과 충돌.
- **점수:** 안정성 9/10, 정확성 8/10, 근본성 9/10 → **평균 8.7/10** (초기 평가, transformMiddleware 충돌 위험 미반영)

### 방안 B: 미들웨어 내에서 base path를 직접 strip

- **설명:** 미들웨어에 `basePath` 파라미터를 추가하고, URL에서 base를 제거한 뒤 매칭. `configureServer`에서 `server.config.base`를 전달.

```typescript
function angularComponentMiddleware(
  templateUpdates: Map<string, string>,
  basePath: string,
): ... {
  return (req, res, next) => {
    const url = req.url ?? "";
    const strippedUrl = basePath !== "/" && url.startsWith(basePath)
      ? "/" + url.slice(basePath.length)
      : url;
    if (!strippedUrl.startsWith("/@ng/component")) {
      next();
      return;
    }
    // ...
  };
}
```

- **장점:** pre-middleware 위치 유지(transformMiddleware보다 먼저 실행). 캡슐화됨 — 미들웨어 등록 순서에 무관하게 동작.
- **반론:** Vite의 base stripping을 부분적으로 재구현.
- **점수:** 안정성 8/10, 정확성 9/10, 근본성 7/10 → **평균 8.0/10**

### 방안 C: URL 매칭을 `includes`로 변경

- **설명:** `startsWith`를 `includes`로 변경
- **장점:** 최소 변경 (1줄)
- **반론:** 의도치 않은 URL 매칭 위험. 근본 원인 미해결.
- **점수:** 안정성 6/10, 정확성 7/10, 근본성 5/10 → **평균 6.0/10**

## 선택 결과

**방안 B** (평균 8.0/10)

pre-middleware 위치를 유지하면서 base path를 자체 처리. 캡슐화 관점에서 미들웨어 등록 순서에 무관하게 동작하는 자기 완결적 설계. 방안 A는 post-middleware 위치로 인해 transformMiddleware 충돌 위험이 있어 기각.
