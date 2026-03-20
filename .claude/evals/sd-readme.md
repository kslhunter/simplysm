# Eval: sd-readme

## Behavioral Eval

### 시나리오 1: simplysm 패키지 사용 시 README 참조
- Input: "@simplysm/sd-core-common 패키지의 DateOnly 클래스 사용법을 알려주세요."
- 체크리스트:
  - [ ] `node_modules/@simplysm/sd-core-common/README.md` 파일을 읽으려고 시도한다 (Read 도구 호출)
  - [ ] context7 도구보다 로컬 README를 먼저 참조한다

### 시나리오 2: 모노레포 내부 패키지 사용 시 README 참조
- Input: "packages/sd-angular 패키지의 SdSheetControl 사용법을 알려주세요."
- 체크리스트:
  - [ ] `packages/sd-angular/README.md` 파일을 읽으려고 시도한다 (Read 도구 호출)

## Anti-pattern Eval

- [ ] `@simplysm/*` 패키지 사용법 질문에 README를 읽지 않고 답변하지 않는다
- [ ] context7로 simplysm 패키지 문서를 먼저 조회하지 않는다 (로컬 README 우선)
