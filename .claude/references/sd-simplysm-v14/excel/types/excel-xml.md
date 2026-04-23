# ExcelXml

XML 처리 클래스가 구현하는 인터페이스이다. `xml/` 디렉터리의 내부 클래스들이 이를 구현한다. 외부에서 직접 사용하지 않는다.

```typescript
export interface ExcelXml {
  readonly data: unknown;
  cleanup(): void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | `unknown` | XML 파싱된 데이터 (read-only) |
| `cleanup` | `() => void` | `ZipCache.toBytes()` 직전에 호출되어 직렬화 전 데이터를 정리한다 |
