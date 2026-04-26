# `ZipArchive`

> **읽어야 하는 상황**: ZIP 파일 읽기/쓰기/압축/해제가 필요할 때. 사용 후 반드시 `close()`를 호출해야 한다.

ZIP 파일 처리 클래스. ZIP 파일의 읽기, 쓰기, 압축, 해제를 처리한다. 동일 파일의 중복 해제를 방지하기 위해 내부 캐싱을 사용한다. `@zip.js/zip.js` 기반.

```typescript
import { ZipArchive } from "@simplysm/core-common";

export class ZipArchive {
  constructor(data?: Blob | Bytes);
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `extractAll` | method | `(progressCallback?) => Promise<Map<string, Bytes \| undefined>>` | 모든 파일 추출 |
| `get` | method | `(fileName: string) => Promise<Bytes \| undefined>` | 특정 파일 추출. 내부 캐시 활용 |
| `exists` | method | `(fileName: string) => Promise<boolean>` | 파일 존재 여부 확인 |
| `write` | method | `(fileName: string, bytes: Bytes) => void` | 파일 쓰기 (캐시에 저장) |
| `compress` | method | `() => Promise<Bytes>` | 캐시된 파일을 ZIP으로 압축 |
| `close` | method | `() => Promise<void>` | 리더 닫기 및 캐시 비우기 |

## Related Types

### `ZipArchiveProgress`

`extractAll()` 진행률 콜백의 파라미터 타입:

```typescript
export interface ZipArchiveProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `fileName` | `string` | 현재 처리 중인 파일명 |
| `totalSize` | `number` | 전체 파일 크기 (바이트) |
| `extractedSize` | `number` | 현재까지 추출된 크기 (바이트) |

## Usage

```typescript
import { ZipArchive } from "@simplysm/core-common";

// ZIP 파일 읽기
const archive = new ZipArchive(zipBytes);
try {
  const content = await archive.get("file.txt");
} finally {
  await archive.close();
}

// ZIP 파일 생성
const newArchive = new ZipArchive();
try {
  newArchive.write("file.txt", textBytes);
  newArchive.write("data.json", jsonBytes);
  const zipBytes = await newArchive.compress();
} finally {
  await newArchive.close();
}

// 모든 파일 추출 (진행률 보고 포함)
const archive2 = new ZipArchive(zipBytes);
try {
  const files = await archive2.extractAll((progress) => {
    const pct = (progress.extractedSize / progress.totalSize * 100).toFixed(1);
    console.log(`${progress.fileName}: ${pct}%`);
  });
} finally {
  await archive2.close();
}
```
