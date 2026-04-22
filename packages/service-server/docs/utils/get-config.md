# getConfig

`.config.json` 파일을 읽고 캐싱한다. 파일 변경 시 자동 리로드되며, 캐시는 1시간 후 만료된다.

```typescript
async function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `filePath` | `string` | `.config.json` 파일의 절대 경로 |

## Returns

`Promise<TConfig | undefined>` — 파싱된 설정 객체. 파일이 존재하지 않으면 `undefined`.

캐싱 동작:
- `LazyGcMap`을 사용하여 캐시를 관리한다 (10분 간격 GC, 1시간 후 만료)
- 캐시 히트 시 파일을 다시 읽지 않는다 (접근 시간이 자동 갱신됨)
- `FsWatcher`로 파일 변경을 감시하고, 변경 시 100ms 지연 후 리로드한다
- 파일이 삭제되면 캐시와 워처를 모두 해제한다
- 캐시 만료 시 워처도 함께 해제한다
