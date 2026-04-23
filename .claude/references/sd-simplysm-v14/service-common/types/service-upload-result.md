# ServiceUploadResult

파일 업로드 결과. 서버에 업로드된 파일의 정보를 포함한다.

```typescript
export interface ServiceUploadResult {
  path: string;
  filename: string;
  size: number;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | 서버 내 저장 경로 |
| `filename` | `string` | 원본 파일명 |
| `size` | `number` | 파일 크기 (바이트) |
