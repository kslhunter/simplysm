---
name: sd-wiki-login
description: 원격 공용 위키에 브라우저 재로그인을 강제 (기존 토큰 폐기). Use when 사용자가 직접 호출할 때만.
---

아래 명령을 실행하세요. 저장된 토큰을 폐기하고 브라우저 로그인을 새로 띄웁니다.

```
python "${CLAUDE_SKILL_DIR}/../../cli/wiki.py" login
```

- 브라우저에서 로그인을 마칠 때까지 최대 300초 대기합니다.
- 종료코드 0 + `{"success": true}` 면 완료입니다. 실패하면 stderr 메시지를 사용자에게 그대로 보고하세요.
