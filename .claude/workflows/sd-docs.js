export const meta = {
  name: 'sd-docs',
  description: '@simplysm/* 라이브러리 패키지 API 문서를 코드 기준으로 풀 재작성하고 상위 README 패키지 인덱스를 갱신',
  phases: [
    { title: '발견', detail: 'packages/*/package.json 에서 라이브러리 패키지 목록 수집' },
    { title: '문서화', detail: '라이브러리 패키지 1개당 agent 1개 팬아웃, sd-docs.rules.md 규칙대로 apis/<패키지>/ 산출' },
    { title: '인덱스 취합', detail: '전 패키지 결과로 상위 README 패키지 인덱스 섹션 1회 갱신' },
  ],
}

// 경로는 모두 워크스페이스 루트(cwd) 상대 — 소비 프로젝트에 배포돼도 동작.
const DOC_RULES = '.claude/workflows/sd-docs.rules.md'
const APIS_DIR = '.claude/references/sd-simplysm14/apis'
const ROOT_README = '.claude/references/sd-simplysm14/README.md'

const PKG_SCHEMA = {
  type: 'object',
  properties: {
    packages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          shortName: { type: 'string', description: '@simplysm/ 접두사를 제외한 짧은 이름' },
          dir: { type: 'string', description: '패키지 디렉토리 경로' },
        },
        required: ['shortName', 'dir'],
      },
    },
  },
  required: ['packages'],
}

const DOC_SCHEMA = {
  type: 'object',
  properties: {
    shortName: { type: 'string' },
    mode: { type: 'string', enum: ['신규', '갱신'] },
    writtenFiles: { type: 'array', items: { type: 'string' } },
    deletedFiles: { type: 'array', items: { type: 'string' } },
    triggerSummary: { type: 'string', description: '상위 README 인덱스에 옮겨 적을 패키지 한 줄 트리거 요약' },
  },
  required: ['shortName', 'mode', 'writtenFiles', 'deletedFiles', 'triggerSummary'],
}

phase('발견')
const discovery = await agent(
  `현재 워크스페이스의 packages/*/package.json 을 모두 확인해 문서화 대상 패키지 목록을 반환해.\n` +
  `- 대상 = package.json 에 "private": true 가 없고, 동시에 src/index.ts 가 존재하는 라이브러리 패키지. 둘 중 하나라도 어긋나면 제외(예: src/index.ts 가 없는 scripts/bin 전용 패키지는 라이브러리 API 가 없으므로 제외).\n` +
  `- 각 항목: shortName(name 필드에서 @simplysm/ 접두사를 제외한 짧은 이름), dir(워크스페이스 루트 기준 패키지 디렉토리 경로. 예: packages/excel).`,
  { phase: '발견', schema: PKG_SCHEMA }
)
const pkgs = discovery.packages
log(`라이브러리 패키지 ${pkgs.length}개 발견: ${pkgs.map(p => p.shortName).join(', ')}`)

phase('문서화')
const results = (await parallel(pkgs.map(p => () =>
  agent(
    `@simplysm/${p.shortName} 패키지의 API 문서를 풀 재작성한다. 반드시 ${DOC_RULES} 를 먼저 읽고 그 작성 규칙(입력 분석·사용 트리거 군 분류·산출 단위 판정·풀 재작성 모드·README/분할 형식·식별자 풀이 의무·작성 원칙)을 그대로 따른다.\n\n` +
    `진실 근거: ${p.dir}/src/index.ts 의 export 와 그 정의 파일(타입+본문)·JSDoc, 그리고 tests/ 중 이 패키지를 import 해 검증하는 테스트 코드뿐. 외부 자료·과거 git 기록·다른 패키지의 사용처 참조 금지.\n\n` +
    `산출 자리: ${APIS_DIR}/${p.shortName}/ — README.md 1장 필수, 큰 군만 <군명>.md 로 분할. 풀 재작성 모드이므로 기존 파일은 참고하지 말고 처음부터 작성. 코드에서 사라진 군의 분할 파일은 삭제.\n` +
    `상위 README(${ROOT_README})는 절대 건드리지 말 것 — 인덱스는 별도 단계에서 처리.\n\n` +
    `완료 후 ${DOC_RULES} "8. 구조화 결과 반환" 형식으로 결과 반환.`,
    { label: `docs:${p.shortName}`, phase: '문서화', schema: DOC_SCHEMA }
  )
))).filter(Boolean)

phase('인덱스 취합')
const sorted = results.slice().sort((a, b) => (a.shortName < b.shortName ? -1 : a.shortName > b.shortName ? 1 : 0))
const indexLines = sorted.map(r =>
  `- **${r.shortName}** — ${r.triggerSummary} 자세히: [apis/${r.shortName}/README.md](./apis/${r.shortName}/README.md)`
)
await agent(
  `${ROOT_README} 의 "## 패키지 인덱스" 섹션 본문(항목 리스트)만 아래 내용으로 교체한다.\n` +
  `- 건드리지 않음: 섹션 머리(## 패키지 인덱스), 다른 모든 섹션, 파일 상단/하단 텍스트.\n` +
  `- 항목 리스트는 이미 패키지명 알파벳순으로 정렬되어 있으니 순서 그대로 사용.\n\n` +
  `교체할 항목 리스트:\n${indexLines.join('\n')}`,
  { phase: '인덱스 취합' }
)

return {
  count: results.length,
  written: sorted.map(r => ({ shortName: r.shortName, mode: r.mode, writtenFiles: r.writtenFiles, deletedFiles: r.deletedFiles })),
}
