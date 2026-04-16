# PostCSS 문자열 교체 청크화 — LLM 검증

## 검증 항목

- [x] 정방향 청크 배열 + join이 역순 slice와 수학적으로 동일한 결과를 생성하는가:
  역순 slice 방식은 `code[0..start_n] + rep_n + code[end_n..start_{n-1}] + rep_{n-1} + ... + code[end_1..]` 순서로 최종 문자열을 구성한다.
  정방향 청크 방식은 `code[0..start_1] + rep_1 + code[end_1..start_2] + rep_2 + ... + code[end_n..]` 순서로 청크를 수집하고 join한다.
  두 방식 모두 원본 텍스트의 비교체 구간과 PostCSS 처리된 교체 텍스트를 동일한 순서로 결합하므로, replacements가 비중첩(acorn AST 노드 보장)인 한 결과가 동일하다.
  검증 결과: **동일성 보장됨**

- [x] cursor 초기값 0과 마지막 `code.slice(cursor)` 호출이 파일 전체를 커버하는가:
  cursor는 0에서 시작하여 각 replacement의 end로 갱신된다. 마지막 `chunks.push(code.slice(cursor))`가 마지막 replacement 이후의 원본 텍스트를 수집한다. replacements가 0건이면 `code.slice(0)` = 전체 코드가 되지만, 이 경우 `replacements.length === 0`에서 continue되므로 도달하지 않는다.
  검증 결과: **전체 커버됨**

- [x] `replacements.sort()`가 원본 배열을 변경하는 것이 문제되지 않는가:
  `replacements`는 각 파일 처리 시 새로 생성되는 로컬 배열이므로 in-place sort가 안전하다. 기존 코드도 동일하게 in-place sort를 사용했다.
  검증 결과: **문제 없음**
