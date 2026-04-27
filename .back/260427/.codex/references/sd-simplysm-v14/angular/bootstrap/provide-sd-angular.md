# `provideSdAngular`

> **읽어야 하는 상황**: 앱 부트스트랩 시 `@simplysm/angular`의 모든 기반 설정(Zoneless, 에러 핸들러, 테마, Service Worker 등)을 등록할 때.

모든 기반 설정을 제공하는 환경 프로바이더 팩토리. `bootstrapApplication`의 `providers`에 추가한다.

```typescript
function provideSdAngular(opt: { clientName: string }): EnvironmentProviders
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `opt.clientName` | `string` | 클라이언트 이름 (localStorage 키 접두사 등에 사용) |

## 제공하는 기능

- `provideZonelessChangeDetection()` — Zone 없는 변경 감지
- `IMAGE_CONFIG` — 이미지 크기/지연 로딩 경고 비활성화
- `provideNgIconsConfig({ strokeWidth: 1.5, size: "1.33em" })`
- `SdOptionEventPlugin` 등록 (`EVENT_MANAGER_PLUGINS` multi-provider) — `.capture`/`.passive`/`.once` 이벤트 수식어
- `SdGlobalErrorHandlerPlugin` — 글로벌 에러 핸들러
- 테마 초기화 (localStorage 동기화, body 클래스 토글)
- Service Worker 업데이트 폴링 (5분 간격, 실패 시 exponential backoff, 최대 1시간)
- 라우터 네비게이션 busy 상태 추적 (`SdBusyProvider.globalBusyCount` signal 증감)

## Usage

```typescript
import { provideSdAngular } from "@simplysm/angular";

bootstrapApplication(AppComponent, {
  providers: [
    provideSdAngular({ clientName: "my-app" }),
    provideRouter(routes),
  ],
});
```
