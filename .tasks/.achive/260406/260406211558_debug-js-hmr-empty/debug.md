# 디버그: replaceDeps 라이브러리 .js 변경 시 Angular HMR 빈 응답

## 출처

- **origin:** `kslhunter/simplysm#20`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: replaceDeps 라이브러리의 스타일 변경이 브라우저에 실시간 반영됨 / 실제: HMR `/@ng/component?c=...&t=...` 응답 본문이 비어있으며, CTRL+SHIFT+R 강제 새로고침에서도 스타일 변경 미반영
- **위치:** `packages/sd-cli/src/angular/vite-angular-plugin.ts:304-310` (`hotUpdate` 훅 확장자 필터)
- **재현 절차:**
  1. `sd.config.ts`에서 `replaceDeps` 설정
  2. `sd-cli dev`로 Vite dev server 실행
  3. 교체된 라이브러리 소스 수정 → 빌드되어 dist/.js 파일의 styles 갱신
  4. CLI 로그에 `의존성 변경 감지됨` 출력 확인
  5. 브라우저에서 `/@ng/component?c=...&t=...` 응답이 비어있음 확인

## 근본 원인 추적 (ACH)

### 가설

- **H1:** `hotUpdate`의 확장자 필터(`.ts`/`.html`/`.scss`)가 `.js` 파일을 거부하여 Angular HMR 재컴파일 미실행 → `templateUpdates` 빈 상태로 `/@ng/component` 빈 응답 반환
- **H2:** `hotUpdate`의 `isInProgram` 체크가 `node_modules` `.js` 파일을 거부 (H1 수정 시 두 번째 관문)

### ACH 매트릭스

|                      | E1: `hotUpdate` `.js` early return (코드) | E2: `templateUpdates.get() ?? ""` 빈 응답 (코드) | E3: `isInProgram`에서 `.js` 거부 (코드) | E4: `/@ng/component` 요청 발생 (이슈) | E5: 강제 새로고침 미반영 (이슈) |
|----------------------|------------------------------------------|------------------------------------------------|----------------------------------------|--------------------------------------|-------------------------------|
| **H1: 확장자 필터**   | C(code)                                  | C(code)                                        | N                                      | C(infer)                             | C(infer)                      |
| **H2: isInProgram**  | N                                        | C(code)                                        | C(code)                                | N                                    | N                             |

### 결과: 확정 — H1 (H2는 H1 해결 시 추가 고려사항)

**근본 원인 체인:**

1. `vite-angular-plugin.ts:304-310` — `.js` 확장자가 `hotUpdate` 필터에서 거부됨
2. Angular 재컴파일(`compiler.update()`) 미실행 → `templateUpdates` 미갱신
3. `angularComponentMiddleware`가 `templateUpdates.get(componentId) ?? ""` → 빈 문자열 반환
4. H1 수정 시에도 `vite-angular-plugin.ts:322-329`의 `isInProgram` 체크가 `node_modules` `.js` 파일을 거부하므로, `.js`→의존 `.ts` 역추적이 필요

**분석 한계:** E5(강제 새로고침 미반영)의 정확한 원인은 런타임 디버깅(Vite 모듈 그래프 상태, `node_modules` 모듈 캐시 무효화 동작) 없이는 확정 불가. `C(infer)` 등급.

## 해결 방안

### 방안 A: `hotUpdate`에서 replaceDeps `.js` 변경 시 full-reload 강제

- **설명:** `hotUpdate` 훅에서 `.js` 파일이 replaceDeps 패키지의 `dist/` 경로에 해당하면, `server.hot.send({ type: 'full-reload' })`로 전체 페이지 새로고침을 강제 발행하고 `[]`을 반환하여 Angular HMR 건너뜀
- **장점:** 구현 단순 / Angular 재컴파일 없이 확실한 갱신 / 기존 HMR 로직 변경 최소화
- **반론:** HMR 대비 DX 열화 (전체 페이지 새로고침) / replaceDeps 스타일 한 줄 변경에도 전체 리로드
- **점수:** 안정성 9/10, 정합성 7/10, DX 5/10 → **평균 7.0/10**

### 방안 B: `hotUpdate`에서 replaceDeps `.js` 변경 시 의존 컴포넌트를 찾아 Angular HMR 수행

- **설명:** `hotUpdate`에서 `.js` 파일 변경 감지 시, Vite `moduleGraph`를 역추적하여 해당 `.js`를 import하는 앱 소스 `.ts` 파일을 찾고, 해당 파일들을 `compiler.update()`에 전달하여 Angular 증분 재컴파일 수행. `templateUpdates`가 갱신되어 `/@ng/component`에서 정상 응답 반환
- **장점:** 진정한 HMR 달성 (페이지 새로고침 없이 스타일 갱신) / Angular HMR 프로토콜 정상 활용
- **반론:** 구현 복잡도 높음 (모듈 그래프 역추적 + Angular 재컴파일 연동) / `compiler.update()`가 `.ts` 파일 변경을 전제로 설계되어 `.js` 의존성 변경에 대한 `sourceFileCache` 무효화 전략이 불명확
- **점수:** 안정성 5/10, 정합성 9/10, DX 9/10 → **평균 7.7/10**

### 방안 C: `sdScopeWatchPlugin`에서 직접 모듈 무효화 + full-reload

- **설명:** `sdScopeWatchPlugin`에서 `.js` 변경 시 `server.watcher.emit("change")` 대신, 직접 모듈 그래프에서 해당 모듈을 찾아 `invalidateModule()` 호출 후 `server.hot.send({ type: 'full-reload' })`
- **장점:** Angular 플러그인 코드 수정 불필요 / 모듈 캐시 무효화를 명시적으로 수행
- **반론:** 방안 A와 DX 동일 (full-reload) / Vite 내부 API 의존도 높음 / 관심사 혼입
- **점수:** 안정성 7/10, 정합성 6/10, DX 5/10 → **평균 6.0/10**

## 선택 결과

**방안 B** (평균 7.7/10)

Angular HMR 프로토콜을 정상 활용하여 진정한 HMR을 달성하는 방안 선택. 구현 중 기술적 장벽 발생 시 방안 A(full-reload)로 전환.
