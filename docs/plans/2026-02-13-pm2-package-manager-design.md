# PM2 packageManager 옵션 설계

## 개요

CLI 서버 빌드 시 PM2 설정에 `packageManager` 옵션을 추가하여 Volta 또는 Mise 중 선택할 수 있도록 한다.
- **Mise**: `mise.toml` 생성 + `mise which node` interpreter 사용
- **Volta**: `package.json`에 volta 설정 추가 + `volta which node` interpreter 사용
- **미지정**: 시스템 PATH의 node 사용 (interpreter 생략)

---

## 변경 대상

### 1. 타입 정의 (`packages/sd-cli/src/sd-config.types.ts`)

**변경 전:**
```typescript
pm2?: {
  name?: string;
  ignoreWatchPaths?: string[];
  noInterpreter?: boolean;  // ← 제거
};
```

**변경 후:**
```typescript
export interface SdServerPackageConfig {
  target: "server";
  /** Node.js 버전 매니저. 미지정 시 시스템 PATH의 node 사용 */
  packageManager?: "volta" | "mise";
  // ... 기타 필드
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
    // noInterpreter 제거됨
  };
}
```

**변경 사항:**
- `noInterpreter` 옵션 제거
- `packageManager` 옵션을 `pm2` 내부가 아닌 **서버 패키지 최상위**에 추가
  - pm2 설정이 없는 서버도 packageManager를 지정할 수 있음
  - `mise.toml` / volta 설정이 pm2 외부에서도 생성됨

---

### 2. 파일 생성 로직 (`packages/sd-cli/src/workers/server.worker.ts`)

#### A. `generateProductionFiles()` 함수 확장

**현재 동작:**
```typescript
// dist/mise.toml: 항상 생성
// dist/pm2.config.cjs: pm2 설정이 있을 때만 생성
```

**변경 후:**

```typescript
function generateProductionFiles(
  info: ServerBuildInfo,
  externals: string[],
  packageManager?: "volta" | "mise"  // ← 새 파라미터
): void {
  const distDir = path.join(info.pkgDir, "dist");
  const pkgJson = JSON.parse(fs.readFileSync(path.join(info.pkgDir, "package.json"), "utf-8"));

  // dist/package.json
  // (기존 로직 유지)
  const distPkgJson: Record<string, unknown> = {
    name: pkgJson.name,
    version: pkgJson.version,
    type: pkgJson.type,
  };
  if (externals.length > 0) {
    distPkgJson["dependencies"] = { /* ... */ };
  }

  // ✅ volta 설정 추가
  if (packageManager === "volta") {
    const nodeVersion = execSync("node -v").toString().trim().slice(1); // "v20.11.0" → "20.11.0"
    distPkgJson["volta"] = { node: nodeVersion };
  }

  fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(distPkgJson, undefined, 2));

  // dist/mise.toml: packageManager 조건에 따라 생성
  if (packageManager === "mise") {
    logger.debug("GEN mise.toml...");
    const rootMiseTomlPath = path.join(info.cwd, "mise.toml");
    let nodeVersion = "20";
    if (fs.existsSync(rootMiseTomlPath)) {
      const miseContent = fs.readFileSync(rootMiseTomlPath, "utf-8");
      const match = /node\s*=\s*"([^"]+)"/.exec(miseContent);
      if (match != null) {
        nodeVersion = match[1];
      }
    }
    fs.writeFileSync(path.join(distDir, "mise.toml"), `[tools]\nnode = "${nodeVersion}"\n`);
  }

  // dist/openssl.cnf (기존대로)
  fs.writeFileSync(/* ... */);

  // dist/pm2.config.cjs (pm2 설정이 있을 때만)
  if (info.pm2 != null) {
    const pm2Name = /* ... */;
    const ignoreWatch = /* ... */;
    const envObj = /* ... */;

    // ✅ interpreter 선택: packageManager에 따라 결정
    let interpreterLine = "";
    if (packageManager === "mise") {
      interpreterLine = `  interpreter: cp.execSync("mise which node").toString().trim(),\n`;
    } else if (packageManager === "volta") {
      interpreterLine = `  interpreter: cp.execSync("volta which node").toString().trim(),\n`;
    }
    // packageManager 미지정 또는 기타: interpreterLine 생략 (시스템 PATH 사용)

    const pm2Config = [
      /* ... */
      interpreterLine.trimEnd(),  // ← 공백 줄 처리
      /* ... */
    ].filter((line) => line !== "").join("\n");

    fs.writeFileSync(path.join(distDir, "pm2.config.cjs"), pm2Config);
  }
}
```

#### B. 호출 방식 변경

**현재 (`build()` 함수에서):**
```typescript
generateProductionFiles(info, externals);
```

**변경 후:**
```typescript
generateProductionFiles(info, externals, packageManager);
```

---

## 사용 예시

### 예시 1: Mise 사용

**`sd.config.ts`:**
```typescript
"my-server": {
  target: "server",
  packageManager: "mise",
  pm2: {
    name: "my-app",
  },
}
```

**생성되는 파일:**
- `dist/mise.toml`: Node 버전 포함
- `dist/pm2.config.cjs`: `interpreter: cp.execSync("mise which node").toString().trim()`
- `dist/package.json`: 기존 구조

### 예시 2: Volta 사용

**`sd.config.ts`:**
```typescript
"my-server": {
  target: "server",
  packageManager: "volta",
  pm2: {
    name: "my-app",
  },
}
```

**생성되는 파일:**
- `dist/package.json`:
  ```json
  {
    "name": "@my/server",
    "version": "1.0.0",
    "volta": {
      "node": "20.11.0"
    }
  }
  ```
- `dist/pm2.config.cjs`: `interpreter: cp.execSync("volta which node").toString().trim()`

### 예시 3: 버전 매니저 미지정

**`sd.config.ts`:**
```typescript
"my-server": {
  target: "server",
  pm2: {
    name: "my-app",
  },
}
```

**생성되는 파일:**
- `dist/pm2.config.cjs`: interpreter 줄 생략 (시스템 PATH의 node 사용)

### 예시 4: PM2 없이 Mise만 지정

**`sd.config.ts`:**
```typescript
"my-server": {
  target: "server",
  packageManager: "mise",
}
```

**생성되는 파일:**
- `dist/mise.toml`: 생성
- `dist/pm2.config.cjs`: 생성 안 함

---

## 구현 세부사항

### 1. Node 버전 추출 (Volta용)

```typescript
// 빌드 시점에 실행되는 Node 버전 정확하게 추출
const nodeVersion = execSync("node -v").toString().trim().slice(1);
// "v20.11.0" → "20.11.0"
```

### 2. Mise 설정 읽기 (기존)

```typescript
// 루트 mise.toml에서 node 버전 읽기
const rootMiseTomlPath = path.join(info.cwd, "mise.toml");
let nodeVersion = "20"; // 기본값
if (fs.existsSync(rootMiseTomlPath)) {
  const miseContent = fs.readFileSync(rootMiseTomlPath, "utf-8");
  const match = /node\s*=\s*"([^"]+)"/.exec(miseContent);
  if (match != null) {
    nodeVersion = match[1];
  }
}
```

### 3. 후방 호환성

**기존 코드에 미치는 영향:**

- `noInterpreter` 옵션 제거 → 기존 코드에서 사용 중이면 ESLint 규칙 검토 필요
  - 현재 프로젝트에서는 사용하지 않음 (확인 필요)

- `packageManager` 미지정 시:
  - 기존: `mise which node`로 동적 감지
  - 변경 후: 시스템 PATH의 node 사용
  - **→ 명시적으로 `packageManager: "mise"`를 추가해야 기존 동작 유지**

**마이그레이션 가이드:**
```typescript
// 기존 코드
pm2: {
  ignoreWatchPaths: [],
  noInterpreter: false,  // 제거
}

// 변경 후 (기존 동작 유지)
packageManager: "mise",
pm2: {
  ignoreWatchPaths: [],
}
```

---

## 테스트 계획

### 단위 테스트
- `generateProductionFiles()` 함수:
  - packageManager별 파일 생성 검증
  - volta: `package.json`에 volta 필드 포함 확인
  - mise: `mise.toml` 생성 확인
  - 미지정: interpreter 줄 생략 확인

### 통합 테스트
- 빌드 후 생성 파일 구조 검증
- PM2 설정 + packageManager 조합 테스트
- PM2 없이 packageManager만 지정한 경우 테스트

### 배포 테스트 (선택사항)
- Volta + PM2 실행 테스트
- Mise + PM2 실행 테스트

---

## 변경 사항 요약

| 항목 | 기존 | 변경 후 |
|------|------|--------|
| `noInterpreter` 옵션 | pm2 내부 | 제거 |
| `packageManager` 옵션 | - | 서버 최상위 |
| mise.toml 생성 | 항상 | packageManager 조건부 |
| volta 설정 | - | package.json에 추가 |
| PM2 interpreter | mise which node (고정) | packageManager에 따라 선택 |

---

## 구현 순서

1. **타입 정의 업데이트** (`sd-config.types.ts`)
   - `SdServerPackageConfig`에 `packageManager` 추가
   - `pm2.noInterpreter` 제거

2. **`generateProductionFiles()` 함수 확장** (`server.worker.ts`)
   - packageManager 파라미터 추가
   - volta 분기 추가 (package.json에 volta 필드 작성)
   - mise.toml 생성 조건부 변경
   - PM2 interpreter 로직 확장

3. **호출 지점 수정** (`server.worker.ts` build 함수)
   - `generateProductionFiles()` 호출 시 `packageManager` 전달

4. **마이그레이션**
   - `sd.config.ts` 업데이트 (기존 pm2 설정)
   - 다른 프로젝트의 pm2 설정 확인

5. **테스트**
   - 기존 빌드 테스트 (packageManager 미지정)
   - Mise 설정 테스트
   - Volta 설정 테스트
