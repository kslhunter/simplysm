각 패키지의 특성을 파악하기 위해 먼저 기본 설정을 확인해보겠습니다.

Read file: tsconfig.base.json
패키지들의 특성에 따라 다음과 같이 테스트 환경을 구성하는 것을 추천드립니다:

1. **공통 테스트 설정**

모든 패키지에 공통적으로 필요한 의존성:
```json
{
  "devDependencies": {
    "mocha": "^10.2.0",
    "ts-node": "^10.9.1",
    "@types/mocha": "^10.0.1",
    "chai": "^4.3.7",
    "@types/chai": "^4.3.5"
  }
}
```

2. **패키지별 tsconfig.test.json 설정**

각 패키지의 루트에 `tsconfig.test.json`을 생성하고, 다음과 같이 구성합니다:

**Node.js 환경 패키지** (sd-core-node, sd-orm-node 등):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["mocha", "chai", "node"],
    "module": "CommonJS",
    "outDir": "./dist-test",
    "rootDir": "./",
    "paths": {
      "@simplysm/*": ["../../packages/*/src/index.ts"]
    }
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

**브라우저 환경 패키지** (sd-angular, sd-core-browser 등):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["mocha", "chai", "node"],
    "module": "CommonJS",
    "outDir": "./dist-test",
    "rootDir": "./",
    "paths": {
      "@simplysm/*": ["../../packages/*/src/index.ts"]
    },
    "lib": ["ES2021", "DOM"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

3. **패키지별 .mocharc.js 설정**

각 패키지의 루트에 `.mocharc.js`를 생성:

```javascript
module.exports = {
  extension: ['ts'],
  require: ['ts-node/register', 'tsconfig-paths/register'],
  spec: ['test/**/*.test.ts'],
  timeout: 5000
};
```

4. **패키지별 특수 의존성**

**sd-core-common, sd-core-node:**
```json
{
  "devDependencies": {
    "sinon": "^15.0.0",
    "@types/sinon": "^10.0.15"
  }
}
```

**sd-orm 관련 패키지:**
```json
{
  "devDependencies": {
    "sqlite3": "^5.1.6",  // sqlite 테스트용
    "mysql2": "^3.6.0",   // mysql 테스트용
    "mssql": "^9.1.1",    // mssql 테스트용
    "testcontainers": "^10.2.1"  // 데이터베이스 컨테이너 테스트용
  }
}
```

**sd-angular:**
```json
{
  "devDependencies": {
    "@angular/core": "^16.0.0",
    "@angular/platform-browser-dynamic": "^16.0.0",
    "@angular/platform-browser": "^16.0.0",
    "karma": "^6.4.0",
    "karma-chrome-launcher": "^3.1.1",
    "karma-mocha": "^2.0.1",
    "karma-coverage": "^2.2.0"
  }
}
```

5. **패키지별 test 스크립트**

각 패키지의 `package.json`에 다음과 같이 테스트 스크립트를 추가:

**Node.js 환경 패키지:**
```json
{
  "scripts": {
    "test": "mocha --config .mocharc.js"
  }
}
```

**브라우저 환경 패키지 (sd-angular 등):**
```json
{
  "scripts": {
    "test": "karma start",
    "test:watch": "karma start --auto-watch --no-single-run"
  }
}
```

6. **루트 package.json 설정**

프로젝트 루트의 `package.json`에 다음 스크립트를 추가:
```json
{
  "scripts": {
    "test": "lerna run test --stream",
    "test:core": "lerna run test --stream --scope @simplysm/sd-core-*",
    "test:orm": "lerna run test --stream --scope @simplysm/sd-orm-*"
  }
}
```

이렇게 구성하면:
1. TypeScript와 Mocha가 잘 통합되어 작동합니다.
2. 각 패키지의 특성에 맞는 테스트 환경이 구성됩니다.
3. 패키지 간 의존성이 올바르게 해결됩니다.
4. 테스트 실행 시 소스맵이 제대로 동작하여 디버깅이 용이합니다.
5. 필요한 경우 특정 그룹의 패키지만 테스트할 수 있습니다.

각 패키지의 특성에 따라 추가적인 설정이 필요할 수 있으니, 실제 구현 시에는 각 패키지의 요구사항을 고려하여 조정하시면 됩니다.
