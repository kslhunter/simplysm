# 디버그: sd-cli typecheck가 client 패키지의 Angular 템플릿 에러를 감지하지 못함

## 출처

- **origin:** `kslhunter/simplysm#24`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: Angular 컴파일러가 `NG8002` 에러를 보고 / 실제: 타입체크 0개 에러로 통과. IDE는 정상 감지함.
- **위치:** `sd-cli check --type typecheck` → `NgtscEngine` → `ngtsc-build.worker.ts` → `AngularBuildPipeline`
- **재현 절차:** `target: "client"` 패키지에 `strictTemplates: true` 설정 후 `ng-template`에 존재하지 않는 프로퍼티 바인딩 추가

## 근본 원인

Angular 21 NgtscProgram이 `checkTypeOfDomBindings`를 **`false`로 하드코딩** (strictTemplates와 무관):

```javascript
// @angular/compiler-cli chunk-MWNGW6T3.js:4670-4672
checkTypeOfAttributes: strictTemplates,
// Even in full template type-checking mode, DOM binding checks are not quite ready yet.
checkTypeOfDomBindings: false,
```

이 설정 때문에 `TcbUnclaimedInputsOp.execute()`에서 property binding 검증 코드가 ngtypecheck 파일에 생성되지 않는다:

```javascript
// chunk-XSJXGXZW.js:15666
if (this.tcb.env.config.checkTypeOfDomBindings && isPropertyBinding) {
  // property 검증 코드 생성 ← 실행 안 됨 (false)
} else {
  this.scope.addStatement(expr); // 표현식만 추가
}
```

IDE의 Angular Language Service는 NgtscProgram의 `getDiagnosticsForFile`과 **별도의 진단 경로**를 사용하여 이 에러를 감지한다. NgtscProgram의 batch 컴파일 경로에서는 이 검증이 비활성화되어 있다.

### 검증 과정

1. `parsedConfig.raw?.angularCompilerOptions` 정상 반환 확인 (strictTemplates: true)
2. NgtscEngine 선택 확인 (debug 로그: "ngtsc worker build 시작")
3. TypeScript 5.9 크래시 미발생 확인
4. NgtscProgram 직접 실행: 94개 ngtypecheck 파일 생성, 모두 type-check 블록 미포함
5. type-check program(내부)에서 UserPage.ngtypecheck.ts는 11KB이지만 "cell" 문자열 없음
6. `RegistryDomSchemaChecker`의 `checkTypeOfDomBindings: false` 하드코딩 확인

## 해결 방안

- **방안:** Angular NgtscProgram 한계를 인지하고, sd-cli 수준에서 가능한 개선 적용
- **설명:**
  1. `angularCompilerOptions`로 Angular 패키지 감지하도록 변경 (사용자 요청)
  2. Angular 측 이슈로 `checkTypeOfDomBindings: true` 지원 요청 검토
- **선택 사유:** NgtscProgram의 internal config `checkTypeOfDomBindings`는 외부 API로 노출되지 않아 sd-cli에서 직접 수정 불가. Angular 프로젝트에 이슈 제출이 필요.
