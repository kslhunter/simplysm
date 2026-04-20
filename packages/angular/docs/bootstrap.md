# Bootstrap

## `provideSdAngular`

모든 기반 설정을 제공하는 환경 프로바이더 팩토리. `bootstrapApplication`의 providers에 추가한다.

```typescript
function provideSdAngular(opt: { clientName: string }): EnvironmentProviders
```

제공하는 기능:
- `provideZonelessChangeDetection()` - Zone 없는 변경 감지
- `IMAGE_CONFIG` - 이미지 크기/지연 로딩 경고 비활성화
- `provideNgIconsConfig({ strokeWidth: 1.5, size: "1.33em" })`
- 6개 커스텀 이벤트 플러그인 등록 (sdSaveCommand, sdRefreshCommand, sdInsertCommand, sdResize, sdIntersection, option)
- `SdGlobalErrorHandlerPlugin` - 글로벌 에러 핸들러
- 테마 초기화 (localStorage 동기화, body 클래스 토글)
- Service Worker 업데이트 폴링 (5분 간격, 실패 시 exponential backoff, 최대 1시간)
- 라우터 네비게이션 busy 상태 추적

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt.clientName` | `string` | 클라이언트 이름 (localStorage 키 접두사 등에 사용) |

## `SdAngularConfigProvider`

`clientName` 설정을 보유하는 프로바이더. `provideSdAngular`에서 자동 설정된다.

```typescript
@Injectable({ providedIn: "root" })
class SdAngularConfigProvider {
  clientName!: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `clientName` | `string` | 클라이언트 이름 |
