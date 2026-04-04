# Feature: sd-cli dev 에러 수정

## 참조 자료

- [debug.md](./debug.md)

### 관련 파일

- `packages/sd-cli/src/angular/vite-angular-plugin.ts:150-154` — declarationMap 누락
- `packages/angular/src/ui/data/list/sd-list-item.control.ts` — contentStyle/contentClass 미존재
- `packages/sd-cli/src/electron/electron.ts:59` — shell: false로 Windows .cmd 실행 불가

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | declarationMap 해결 | transformer에 `declarationMap: false` 추가 | `declaration: false` 설정 시 논리적으로 일관 |
| D2 | sd-list-item API 확장 | `contentStyle` + `contentClass` input 추가 | sd-checkbox, sd-select 등 기존 패턴과 통일 |
| D3 | electron ENOENT 해결 | `_exec`에서 `shell: true` 전달 | Windows `.cmd` 래퍼 실행을 위해 필요 |

## 요구명세

```gherkin
Feature: sd-cli dev 에러 수정

  Rule: Angular dev 빌드 시 declarationMap 충돌이 발생하지 않는다

    Scenario: tsconfig에 declarationMap: true가 있는 프로젝트의 dev 빌드
      Given 소비 프로젝트의 tsconfig.json에 declarationMap: true가 설정되어 있다
      When sd-cli dev로 Angular 타입체크를 실행한다
      Then declarationMap 관련 에러가 발생하지 않는다

  Rule: sd-list-item에 contentStyle과 contentClass를 바인딩할 수 있다

    Scenario: contentStyle 바인딩
      Given sd-list-item 컴포넌트를 사용한다
      When [contentStyle]="'padding: 10px'" 바인딩을 설정한다
      Then _content div에 해당 스타일이 적용된다

    Scenario: contentClass 바인딩
      Given sd-list-item 컴포넌트를 사용한다
      When [contentClass]="'custom-class'" 바인딩을 설정한다
      Then _content div에 해당 클래스가 적용된다

  Rule: Windows에서 electron-rebuild 실행이 성공한다

    Scenario: Windows에서 _exec로 .bin 바이너리 실행
      Given Windows 환경에서 node_modules/.bin에 .cmd 래퍼가 있다
      When _exec로 electron-rebuild를 실행한다
      Then ENOENT 에러 없이 정상 실행된다
```

## 구현계획

- [x] Slice 1: vite-angular-plugin.ts — declarationMap: false 추가
- [x] Slice 2: sd-list-item.control.ts — contentStyle/contentClass input 추가
- [x] Slice 3: electron.ts — _exec에 shell: true 전달
