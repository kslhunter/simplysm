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

## `TXT_CHANGE_IGNORE_CONFIRM`

변경사항 무시 확인 메시지 문자열 상수.

```typescript
const TXT_CHANGE_IGNORE_CONFIRM: string
```

내용: `"변경사항이 있습니다. 모든 변경사항을 무시하시겠습니까?\n- 확인: 변경사항을 무시하고, 현재 요청한 작업을 수행\n- 취소: 현재 요청한 작업을 취소하고, 변경사항 재검토"`
