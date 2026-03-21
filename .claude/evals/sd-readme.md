# Eval: sd-readme

## 행동 Eval

### 시나리오 1: simplysm 패키지 사용 시 README 참조
- 입력: "@simplysm/sd-core-common 패키지의 DateOnly 클래스 사용법을 알려주세요."
- 체크리스트:
  - [ ] `node_modules/@simplysm/sd-core-common/README.md` 파일의 내용에 기반한 답변을 포함한다
  - [ ] context7보다 로컬 README를 먼저 참조한다

### 시나리오 2: 모노레포 내부 패키지 사용 시 README 참조
- 입력: "packages/sd-angular 패키지의 SdSheetControl 사용법을 알려주세요."
- 체크리스트:
  - [ ] `packages/sd-angular/README.md` 파일의 내용에 기반한 답변을 포함한다

## 안티패턴 Eval

- [ ] `@simplysm/*` 패키지 사용법 질문에 README 내용을 반영하지 않고 답변한다
- [ ] context7로 simplysm 패키지 문서를 먼저 조회한다 (로컬 README 우선)
