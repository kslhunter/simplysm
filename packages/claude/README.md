# @simplysm/claude

심플리즘 프레임워크의 Claude Code 확장 패키지입니다. 프로젝트에 설치하면 Claude Code 관련 설정 파일들을 자동으로 복사합니다.

## 설치

```bash
npm install --save-dev @simplysm/claude
# or
yarn add -D @simplysm/claude
```

## 기능

### postinstall

패키지 설치 시 자동으로 `dist` 폴더의 하위 디렉토리와 `settings.json` 파일을 프로젝트 루트의 `.claude` 폴더로 복사합니다.

패키지가 `devDependencies`에 직접 설치된 경우에만 동작합니다. (다른 패키지의 의존성으로 간접 설치된 경우 동작하지 않음)

### prepack

패키지 배포 시 Claude Code 관련 파일들을 `dist` 폴더로 복사합니다.

## 구조

```
dist/
├── rules/        # 규칙 설정
├── settings.json # 설정 파일
└── skills/       # 스킬 정의
```

## 주의사항

- 설치 시 프로젝트 루트의 `.claude` 폴더 내용이 덮어쓰기됩니다.
- 기존 `.claude` 커스텀 설정이 있는 경우 백업을 권장합니다.
- 이 패키지는 외부 프로젝트에서 사용하기 위한 패키지입니다. monorepo 내부에서는 postinstall이 동작하지 않습니다.

## 라이선스

Apache-2.0
