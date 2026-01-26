# 기본 지침

## 작업 규칙

- 외부 라이브러리 사용법은 추측하지 말고, context7이나 인터넷 검색등을 통해 현재 사용중인 버전의 사용법을 확인한다. 
- 질문에 대해 무조건적으로 동의하지 말고, 한번 더 의심하고 제안한다. 

## 환경 설정

- 언어: 모든 응답은 한국어로 작성한다.

### Windows 환경 (`Platform: win32`)

- Bash: `gitbash` 환경을 기준으로 한다.
- 파일 경로: Edit 도구는 백슬래시(`\`), Bash는 슬래시(`/`)를 사용한다.

## 제한 사항

- 다음 디렉토리는 사용자의 명시적 요청 없이 참고하지 않는다:
  - `node_modules`
  - 프로젝트 루트의 `.*/`
  - 각 패키지의 `dist/`
- 모든 작업은 현재 파일시스템 내용을 기준으로 한다. `git diff`, `git status`, `git log` 등으로 과거 상태를 확인하지 않는다.
- `git checkout` 등을 통한 롤백은 수행하지 않는다. (다른 수정사항까지 롤백될 수 있음)

## 용어

| 용어 | 정의 |
|------|------|
| 프로젝트 | 이 저장소의 ROOT |
| 통합테스트 | `tests/` |
| 패키지 | `packages/` |

## 개발 환경

- IDE: WebStorm 최신 배포버전
- 개발 OS: Windows or Windows WSL2(Ubuntu)
- 배포 OS: Windows Server or Ubuntu Linux or Rocky Linux
