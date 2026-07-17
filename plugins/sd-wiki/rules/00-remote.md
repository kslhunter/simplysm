# 원격 공용 위키

누적 지식 위키의 구조:

- 위치: 로컬 파일이 아닌 팀 공용 원격 서버.
- 페이지 구성: `topic`(유니크 키) + 제목·요약·본문(마크다운)·버전 + **상위 페이지**. 페이지가 상위-자식 관계로 **재귀 트리(forest)** 를 이룸 — 자식 있는 노드는 hub, 자식 없는 노드는 leaf(별도 종류 구분 없이 파생).
- 자동 주입: SessionStart 훅이 세션 시작 시 **ROOT MAP**(상위 없는 최상위 노드의 라우팅 목록)만 주입 — 전체 목차 아님. 그 아래 지식은 트리를 따라 온디맨드로 펼침.

읽기·기록·검색·탐색은 위키 CLI 로 함 — 실행 형식 `bun "${CLAUDE_PLUGIN_ROOT}/cli/wiki.ts" <명령>`. 이 경로는 sd-wiki 플러그인 설치 위치로 CLI 실행 전용임 — 현재 작업 프로젝트가 아니며, 이 경로 기준으로 파일을 읽거나 쓰지 말 것. 사용 가능한 명령:

| 명령               | 동작                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `rootmap`          | 최상위 노드의 라우팅 목록(topic·제목·요약·자식 유무). ROOT MAP — 세션에 자동 주입되므로 보통 갱신 후 새로 볼 때만 호출      |
| `children <topic>` | 그 노드의 직속 자식 라우팅 목록(자식 유무 포함). 없는 topic 이면 에러, 자식 없는 leaf 면 빈 목록                            |
| `read <topic>`     | 페이지 1건 조회 — 제목·요약·본문·버전. 없으면 빈 결과                                                                       |
| `write <topic>`    | 페이지 생성·갱신 — 제목·요약·본문, `--parent <topic>` 로 상위 지정, 갱신 시 기준 버전(낙관락)                               |
| `search <keyword>` | 제목·요약·본문 키워드 검색 — 라우팅 항목 반환                                                                               |
| `toc`              | 전체 페이지 평면 목록. 온디맨드 fallback(자동 주입 아님) — 트리 탐색으로 진입점을 못 찾을 때만                              |
| `delete <topic>`   | 페이지 삭제 — 자식이 있으면 상위로 재배치(reparent) 후 노드만 삭제(서브트리 보존). `--base-version` 으로 낙관락             |
| `move <topic>`     | 내용 변경 없이 상위만 이동 — `--parent <topic>` 또는 `--root`(최상위로). 순수 위치 변경(`write` 와 달리 본문 재전송 불필요) |
| `lint`             | 위키 점검 — 끊긴 상위·cross-link·고아·트리 통계 진단. 정리 판단은 결과를 받아 직접                                          |

각 명령의 인자·옵션(`[]` 선택 · `|` 택일 · 모든 명령 앞에 `[--no-browser]` 가능):

```
rootmap
toc
lint
read <topic>
children <topic>
search <keyword>
write <topic> --title <제목> --summary <요약> (--body <본문> | --body-file <경로> | stdin 파이프) [--parent <topic>] [--base-version <기준버전>]
delete <topic> [--base-version <기준버전>]
move <topic> (--parent <topic> | --root)
```

`write` 본문은 `--body`·`--body-file`·stdin 중 하나로만 입력할 것(`--body` 와 `--body-file` 동시 금지). 인증·토큰 갱신은 CLI 가 자동 처리함(만료 시 브라우저 로그인). 결과는 JSON임.

## 페이지 탐색

세션엔 ROOT MAP 만 주입됨(전체 목차 아님) — 필요한 지식은 트리를 따라 펼쳐 찾을 것.

- 경로: 주입된 ROOT MAP 에서 관련 최상위 노드 식별 → `children <topic>` 로 자식 펼침 → 더 깊으면 자식의 `children` 반복 → 목표 leaf 의 `read <topic>` 로 본문 활용.
- 자식 유무(`hasChildren`)로 펼칠지 결정할 것 — hub(자식 있음)면 `children` 으로 더 펼치고, leaf(자식 없음)면 바로 `read` 할 것(leaf 에 불필요한 `children` 호출하지 말 것).
- ROOT MAP 에 관련 진입점이 안 보이면 `search` 로 키워드 검색해 진입점을 찾을 것.
- 본문이 다른 `topic` 을 가리키면(cross-link) 그 topic 도 `read` 로 확인할 것.
- 페이지가 노후했고 현재 작업과 맞지 않으면, 사용자 요청을 기다리지 말고 그 자리에서 재검증·갱신할 것.
