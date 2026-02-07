Field.styles.ts 같이 폴더 국한 파일명 쓰지 말것

다음과 같은 스킬을 만듭니다.
1. claude code가 실행된 디렉토리에서 수행
2. 컨텍스트, 혹은 사용자 요청에 맞는 이름으로 `git worktree add .worktrees/{{kebab-case}}`
3. `cd .worktrees/{{kebab-case}}`
4. superpowers의 `brainstorm` 혹은 `writing-plans` 사용 안내 