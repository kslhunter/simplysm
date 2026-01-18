## 필수 규칙

| 항목      | 규칙                                    |
|---------|---------------------------------------|
| 언어      | 모든 응답은 한국어로 작성                        |
| Bash 환경 | `gitbash` 환경                          |
| 파일 경로   | Edit 도구는 백슬래시(`\`), Bash는 슬래시(`/`) 사용 |

## 개발 환경

| 항목    | 값                    |
|-------|----------------------|
| IDE   | WebStorm             |
| 버전 관리 | Volta (Node.js/Yarn) |

## 기술 스택

| 분류       | 기술         | 버전         |
|----------|------------|------------|
| 공통       | Node.js    | 20.x       |
| 공통       | Yarn       | 4.x        |
| 공통       | TypeScript | 5.8.x      |
| 공통       | Vitest     | 4.x        |
| 공통       | ESLint     | 9.x        |
| 공통       | Prettier   | *          |
| Frontend | Angular    | 20.x       |
| Frontend | 지원 브라우저    | Chrome 79+ |
| Database | MySQL      | 8.0.14+    |
| Database | MSSQL      | 2012+      |
| Database | PostgreSQL | 9.0+       |

## 브라우저 빌드 환경

- ES2022 + esbuild 번들링 (`browserslist: Chrome > 79`)
- Node.js 폴리필:

```typescript
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";

nodeModulesPolyfillPlugin({
  include: ["path", "buffer", "crypto", "events", "util", "stream", "assert"],
  globals: {Buffer: true, process: true}
})
```
