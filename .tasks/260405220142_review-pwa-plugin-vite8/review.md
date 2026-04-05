# 코드 리뷰: PWA 플러그인 직접 구현 및 Vite 8 업그레이드

| 항목 | 내용 |
|------|------|
| 분석 대상 | `.tasks/260405193705_pwa-plugin-vite8/*.md` 계획 vs 구현 코드 |
| 일시 | 2026-04-05 |
| 분석 파일 수 | 12 (계획 5, 소스 3, 테스트 7) |
| 발견 이슈 | 3건 (Critical 0, Medium 1, Low 2) |

---

## 이슈 목록

### Medium

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/sd-cli/src/utils/vite-pwa-plugin.ts:150-159
title: SW fetch navigate fallback에서 index.html 캐시 미스 시 네트워크 에러 발생
description: |
  SW의 fetch 핸들러에서 navigate 요청 시 `caches.match(BASE_URL + "index.html")`을 반환한다.
  모바일 브라우저에서 스토리지 압박(storage pressure)으로 캐시가 제거되면 이 호출이
  undefined로 resolve되고, `event.respondWith(undefined)`는 TypeError를 발생시켜
  사용자에게 네트워크 에러 페이지를 보여준다.
  
  정상적인 상황에서는 install에서 addAll로 캐시가 보장되지만, 브라우저의 캐시 퇴거
  (cache eviction)는 앱 외부에서 발생하는 이벤트이므로 방어 코드가 필요하다.
suggestion: |
  navigate fallback에 네트워크 폴백을 추가한다:
  ```javascript
  if (event.request.mode === "navigate") {
    return caches.match(BASE_URL + "index.html")
      .then((resp) => resp || fetch(event.request));
  }
  ```
```

### Low

```
id: CONSIST-001
severity: Low
category: 일관성
location: .tasks/260405193705_pwa-plugin-vite8/2.1-vite8-upgrade.md (Rule "oxc config으로 마이그레이션")
title: 구현계획의 oxc.target 명세와 실제 구현(build.target)이 불일치
description: |
  구현계획의 요구명세 시나리오 3개가 `config.oxc.target`이 설정된다고 기술하고 있지만,
  실제 구현(`vite-config.ts:177`)과 테스트(`vite-config.spec.ts:87`)는 `config.build.target`만
  설정한다. Vite 8에서 `build.target`이 dev/build 모든 환경의 통합 target이므로 구현이 올바르지만,
  계획 문서가 실제 동작과 달라 향후 참조 시 혼동을 줄 수 있다.
suggestion: |
  `2.1-vite8-upgrade.md`의 Scenario "기본 target 설정", "browserslist target 설정",
  "dev 모드에서도 oxc target 적용"에서 `config.oxc.target` → `config.build.target`으로 수정한다.
  설계 섹션 (a)의 `oxc: { target: esbuildTarget }` → `build: { target: esbuildTarget }`로 수정한다.
```

```
id: CONSIST-002
severity: Low
category: 일관성
location: packages/sd-cli/src/utils/vite-pwa-plugin.ts:5
title: path 모듈 import 형식이 코어 노드 모듈 프리픽스 규칙과 불일치
description: |
  같은 파일 내에서 `fs`는 `import fs from "node:fs"` (node: 프리픽스)로 import하고,
  `path`는 `import path from "path"` (프리픽스 없음)로 import한다.
  기능상 동일하지만 동일 파일 내 일관성이 깨진다.
suggestion: |
  `import path from "path"` → `import path from "node:path"`로 변경하여 fs와 통일한다.
```

---

## 총평

구현이 계획과 높은 일치도를 보이며, 3개 Feature(1.1 커스텀 PWA 플러그인, 1.2 의존성 교체, 2.1 Vite 8 업그레이드)의 요구명세를 충실히 반영했다.

**잘된 점:**
- SW 생명주기(install/activate/fetch/message) 4개 이벤트가 WBS 범위 그대로 구현됨
- precache 목록에서 sw.js/manifest.webmanifest 제외, 백슬래시 정규화 등 에지케이스 처리
- Vite 8 마이그레이션이 `rolldownOptions`, `hotUpdate`, `this.environment.moduleGraph` 등 핵심 변경점을 모두 반영
- 테스트 커버리지가 충분 — 단위/인수 테스트 분리, 캐시 히트/미스/무효화, HMR 시나리오별 검증
- vite-plugin-pwa/workbox-build/workbox-window 3개 외부 의존성 제거 완료
