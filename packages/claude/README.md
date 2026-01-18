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

패키지 설치 시 자동으로 `dist` 폴더의 내용을 프로젝트 루트의 `.claude` 폴더로 복사합니다.

### prepack

패키지 배포 시 Claude Code 관련 파일들을 `dist` 폴더로 복사합니다.

## 구조

```
dist/
├── rules/        # 규칙 설정
├── scripts/      # 스크립트
├── settings.json # 설정 파일
└── skills/       # 스킬 정의
```

## 라이선스

Apache-2.0
