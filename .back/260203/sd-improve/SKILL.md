---
name: sd-improve
description: "이 스킬은 프로젝트/패키지의 문제점/개선점을 종합 검토할 때 사용한다."
argument-hint: "[패키지명]"
model: inherit
disable-model-invocation: true
---

# 종합 검토

이 스킬은 **오케스트레이터**로서 내부 스킬을 Task(subagent_type:general-purpose)로 호출하여 검토를 수행한다.

## 인자

- `$ARGUMENTS` (선택): 검토 대상 패키지명 (예: `core-common`)
  - 지정 시: `packages/<패키지명>` 디렉토리를 대상으로 검토
  - 미지정 시: 프로젝트 전체를 대상으로 검토

## 제한 사항

- 직접 코드나 파일을 읽지 않는다.
- 직접 검토를 수행하지 않는다.

## 작업 흐름

1. 모든 검토 관점(logic, code, architect, test, docs)에 대해 Task(subagent_type:general-purpose)를 병렬 호출(Background 아님) → 지적 목록 수집
   - 각 Task의 prompt: "Skill 도구로 sd-improve-scan 스킬을 다음 인자로 호출: {{해당 관점의 호출 양식}}"
   - 수집된 지적이 없으면 보고 후 종료

2. 수집된 모든 지적을 병합함
   - 제안이 상충될 경우, 관련 파일을 재확인하여 더 좋은 방법 도출 (혹은 제거)
   - 동일한 제안일 경우, 완전 병합

3. 병합된 지적들을 파일별로 그룹핑. 각 그룹에 대해 Task(subagent_type:general-purpose)를 병렬 호출(Background 아님) → 검증된 지적 목록 수집
   - 각 Task의 prompt: "Skill 도구로 sd-improve-validate 스킬을 다음 인자로 호출: {{해당 파일 그룹의 지적 목록}}"
   - 검증된 지적이 없으면 보고 후 종료

4. 검증된 지적 각각에 대해, logic, code, architect, test, docs순+중요도순으로 정렬한다.

5. 검증된 지적사항 전체를 정리해서 출력

6. 그 중, logic, code, architect 지적에 대해 순차적으로 각각 **하나씩** 자세히 설명하고, 동의 혹은 선택사항을 `AskUserQuestion` 도구로 사용자에게 답변을 받는다.
   - 설명과 선택은 별개이다. 설명을 먼저 하고, 답변을 받는다.
   - 절대로 한꺼번에 설명하지 않는다. 하나씩 자세히 설명한다.
   - test, docs는 모두 동의한 것으로 본다.

7. ExitPlanMode 호출

## 호출 양식

아래 양식은 작업 흐름 1번에서 Task가 sd-improve-scan 스킬 호출 시 인자(`$ARGUMENTS`)로 전달할 내용이다.

### logic 호출 양식

```
대상: {{대상 경로}}
참고자료:
- .claude/rules/TYPESCRIPT_RULES.md
지침:
- 테스트 코드는 검토 대상이 아님.
- 로직 정확성: 조건문/반복문 흐름이 의도대로 동작하는지, off-by-one 에러, 경계 조건 누락
- 알고리즘 효율성: 시간/공간 복잡도 개선 가능 여부 (예: O(n²) → O(n log n))
- 로직 단순화: 불필요하게 복잡한 로직(조건문, 반복문 포함)을 더 단순하고 읽기 쉽게 재구성할 수 있는지
- 의도 명확성: 로직이 작성자의 의도와 목적을 명확히 표현하는지
```

---

### code 호출 양식

```
대상: {{대상 경로}}
참고자료:
- .claude/rules/TYPESCRIPT_RULES.md
- .claude/rules/SD_PKG_IDX.md
지침:
- 테스트 코드는 검토 대상이 아님.
- 에러 처리: try-catch 누락, 에러 전파 방식, 에러 메시지 품질
- 엣지 케이스: null/undefined 처리, 빈 배열/객체 처리, 경계값 처리
- 타입 안전성: `as any` 사용, 타입 가드 누락, 타입 캐스팅 남용
- 표준 기능 대체: 직접 구현 대신 표준 기능 또는 외부 npm 라이브러리로 대체 가능 여부
- simplysm 패키지 활용: @simplysm/* 패키지 기능 우선 사용 권장 (필요시 의존성 추가)
- 지침 준수: TYPESCRIPT_RULES.md 준수 여부
- deprecated API: deprecated API 사용 여부
- 코드 레벨 최적화: 불필요한 연산, 중복 계산, 메모리 누수 가능성
```

---

### architect 호출 양식

```
대상: {{대상 경로}}
참고자료:
- .claude/rules/TYPESCRIPT_RULES.md
지침:
- 테스트 코드는 검토 대상이 아님.
- 설계 원칙: SOLID 원칙 위반, 관심사 분리 미흡
- 의존성: 순환 의존성, 잘못된 의존성 방향
- 결합도/응집도: 모듈 간 과도한 결합, 단일 책임 위반
- 일관성: 기존 패턴과 다른 구현, 유사 기능의 상이한 방식, 기존 추상화 미활용
- 확장성: 변경 시 기술 부채 발생 가능성
- 추상화 적정성: 불필요한 추상화 또는 필요한 추상화 누락 (10줄 이상 2회 반복, 3회 이상 반복 시 추상화 검토)
- API 설계 및 사용성: 입출력 타입의 적절성, 불필요한 변환/준비 작업 여부, 더 나은 인터페이스 제공 방법
```

---

### test 호출 양식

```
대상: {{대상 경로}}
참고자료:
- .claude/rules/TYPESCRIPT_RULES.md
- CLAUDE.md
지침:
- 테스트 커버리지: 기존 테스트가 실제 기능을 충분히 커버하는지 확인
- 엣지 케이스: 누락된 엣지 케이스나 시나리오에 대한 테스트 추가 필요 여부
- 단위 테스트: 개별 함수/클래스에 대한 테스트 적절성
- 통합 테스트: 모듈 간 상호작용 테스트 적절성 (프로젝트 루트의 tests/ 검토 필요)
- 테스트 품질: 테스트 코드의 가독성, 유지보수성, 중복 여부
- 테스트가 문제인지 사용자 구현이 문제인지 면밀히 파악할 것.
```

---

### docs 호출 양식

```
대상: {{대상 경로}}
참고자료:
- .claude/rules/TYPESCRIPT_RULES.md
- .claude/rules/MD_RULES.md
지침:
- TSDoc: 공개 API에 대한 TSDoc 존재 여부 및 품질
- README: README.md 내용의 정확성 및 최신성
- 주석 적절성: 복잡한 로직에 대한 주석 적절성
- 문서화 위치: 코드 관련 내용 중 사용자가 알아야 할 것은 TSDoc (우선), 내부 로직은 일반 주석, 구조적/설계 관련 내용은 README.md
- 직역등 어색한 표현을 확인, 수정한다.
- 로직이 복잡한 경우, TSDoc과 주석을 적극 활용한다.
```
