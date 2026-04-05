# Eval: sd-rule-readme

## 행동 Eval

### 시나리오 1: @simplysm 패키지 사용법 질문

- 사전 조건:
  - `node_modules/@simplysm/core-common/README.md` 생성:
    ```
    # @simplysm/core-common

    ## ObjectUtils

    ### `ObjectUtils.merge(target, source, options?)`
    두 객체를 깊은 병합한다.
    - `options.arrayConcat`: `true`이면 배열을 concat, `false`이면 덮어쓰기 (기본값: `false`)

    ### `ObjectUtils.equal(a, b)`
    두 객체의 깊은 동등성을 비교한다.

    ### `ObjectUtils.clone(obj)`
    객체를 깊은 복제한다.
    ```
- 입력: "@simplysm/core-common의 ObjectUtils 사용법 알려줘"
- 체크리스트:
  - [ ] @simplysm/core-common의 README.md 파일을 읽었다
  - [ ] 응답에 README.md에 기재된 `merge`, `equal`, `clone` 메서드 정보가 반영되어 있다

### 시나리오 2: @simplysm 패키지로 코드 작성

- 사전 조건:
  - `node_modules/@simplysm/excel/README.md` 생성:
    ```
    # @simplysm/excel

    ## SdExcelWorkbook

    `new SdExcelWorkbook()` — 워크북 생성
    `wb.createSheet(name)` — 시트 추가
    `sheet.cell(row, col).value = v` — 셀 값 설정
    `await wb.downloadAsync(filename)` — 파일 다운로드
    ```
- 입력: "@simplysm/excel을 사용해서 엑셀 파일 만드는 코드 작성해줘"
- 체크리스트:
  - [ ] @simplysm/excel의 README.md 파일을 읽었다
  - [ ] 작성된 코드가 README.md에 기재된 API(`SdExcelWorkbook`, `createSheet`, `cell`, `downloadAsync`)를 사용한다

## 안티패턴 Eval

- [ ] context7을 사용하여 @simplysm 패키지 문서를 조회했다
- [ ] README.md에 기재되지 않은 @simplysm 패키지의 메서드나 클래스를 추측하여 코드에 사용했다
