# inject 네이밍 컨벤션 섹션 — LLM 검증

## 검증 항목

### Scenario: 네이밍 컨벤션 섹션이 추가된다

- [x] "inject 네이밍 컨벤션" 관련 섹션이 존재한다: usage.md:341 `## inject 네이밍 컨벤션`
- [x] 소비앱에서의 규칙이 명시되어 있다: usage.md:345-346 "Sd 접두어 유지", "Provider 접미어 제거"
- [x] 클래스 필드(`_sdXxx`)와 로컬 변수(`sdXxx`) 구분이 예시로 포함되어 있다: usage.md:348-352 표에 3개 Provider 예시

### Scenario: 라이브러리 내부 규칙 차이점이 언급된다

- [x] 라이브러리 내부에서는 Sd 접두어를 제거한다는 차이점이 간단히 언급되어 있다: usage.md:354 `> 참고:` 블록에 한 줄 언급
- [x] 라이브러리 내부 규칙의 상세 설명은 포함되지 않는다: 상세 규칙 표나 전체 목록 없이 `_toast`, `_modal` 형태만 간단히 언급

### Scenario: 기존 예제가 소비앱 컨벤션과 일치한다

- [x] usage.md의 모든 inject 예제가 소비앱 컨벤션을 따른다: 329행 `_sdToast`, 376행 `sdModal`, 397행 `_sdServiceClientFactory`, 440행 `sdToast` — 모두 Sd 접두어 유지, Provider 접미어 제거
- [x] 보정이 필요한 예제가 없다: 4곳 모두 컨벤션 일치 확인
