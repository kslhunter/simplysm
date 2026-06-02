---
name: sd-spec
description: SI/업무시스템 요구사항을 분석해 spec.md 로 구조화. Use when "요구사항 분석", "SI 분석", "업무시스템 spec 작성" 을 요청할 때.
---

# sd-spec

요구 분석을 spec.md 1개로 작성·수정.

## 입출력

- **입력**: Requirement Source (회의록·메일·문서·PDF·발화 등 비정형 자료) + 사용자와의 대화 + (재진입 시) 기존 spec.md.
  - Requirement Source 가 비정형 파일(eml·xlsx 등)이면 먼저 `/sd-unpack` 스킬로 펼쳐 입력으로 사용.
  - Requirement Source 의 부정확성(STT 오타·화자 모호·발화 모호·용어 다의성)은 `../../references/sd-requirement-source-handling.md` 참조.
- **출력**: spec.md 1개
- **대상**: `.specs/{yyMMddHHmmss}_{slug}/spec.md`.
  - `yyMMddHHmmss`: PowerShell `Get-Date -Format "yyMMddHHmmss"` 명령으로 생성 (예: `260513204500` = 2026-05-13 20:45:00).
  - `slug`: 짧은 한·두 단어. 허용 문자는 한글·영문·`_`·`-`·공백.

## 진행

spec.md 존재 여부로 분기:

- **없음 (신규)**: Requirement Source 를 `references/spec-authoring.md` 형식에 따라 workflow를 활용하여 spec.md 로 작성.
- **있음 (변경)**: 사용자 요청에 따라 `references/spec-authoring.md` 작성법대로 해당 섹션을 수정·추가.

## 확정 섹션 수정·구현 무효화

- 헤더 `[확정]` 섹션을 수정할 때는 사용자 합의 필수.
- 사용자가 섹션을 검토·수정 지시하면 → 반영 + 헤더 `[확정: 날짜]` 부착. 사용자가 LLM 없이 직접 검토·확정한 섹션은 사용자가 손으로 마커를 편집 — 그 결과를 존중하고 덮어쓰지 않음.
- 수정으로 그에 기반해 구현된 §4/§5/§6 의 구현이 어긋나면, 그 헤더의 `, 구현:` 도 함께 제거(재구현 대기).
