---
name: sd-dev
description: SD 워크플로(spec/demo/plan/impl/verify) 오케스트레이터. 입력 분석으로 시작 단계를 판별하고, 단일 단위(REQ 1개·R 1개)는 자동 chain, 분기점에서는 멈춤+보고. Use when raw input부터 끝까지 한 번에 진행하거나, 중간 산출물(spec.md/plan.md)에서 이어서 진행할 때
---

# SD 오케스트레이터

5개 sd-* 스킬(sd-spec/sd-demo/sd-plan/sd-impl/sd-verify)을 입력 따라 자동 chain.

## 입력 분석 → 시작 스킬

| 입력 상태 | 시작 스킬 |
|---|---|
| spec.md(`상태: specified`) 존재 | sd-plan |
| plan.md(`상태: planned`) 존재 | sd-impl |
| impl.md(`상태: implemented`) 존재 | sd-verify |
| 그 외 (raw input / draft / 없음) | sd-spec |

> 입력에 spec.md/plan.md 경로가 명시되어 있거나 사용자가 특정 REQ ID 지목한 경우 그대로 사용.
> 모호하면 그 외로 판단 → sd-spec.

## 자동 chain 분기

```
sd-spec 끝:
  ├─ REQ 1개:
  │   ├─ demo 후보 (UI 키워드) → "demo 만들까요?" 묻기
  │   │   ├─ Yes → sd-demo → 종료(보고)
  │   │   └─ No → 자동 sd-plan
  │   └─ demo 불필요 → 자동 sd-plan
  └─ REQ N개 → 멈춤(보고)

sd-plan 끝:
  ├─ skip-to-verify → 자동 sd-verify
  └─ proceed → 자동 sd-impl

sd-impl 끝 → 자동 sd-verify

sd-verify → 종료(보고)
```

## demo 필요 판단 (휴리스틱)

spec.md R 항목 본문에 다음 UI 키워드 **1개 이상** 등장 → demo 후보:
- `화면`, `UI`, `표시`, `버튼`, `필드`, `폼`, `목록`, `리스트`, `클릭`, `입력`

그 외(백엔드 로직, 마이그레이션, 데이터 변환, 검증 함수 등) → demo 불필요.

## sd-* 스킬 호출 방식

각 단계에서 해당 sd-* 스킬을 호출. sd-* 스킬 내부 동작/결정엔 개입 X (sd-* 스킬의 자체 체크포인트가 그대로 통과).

## 멈춤 시 보고 형식

```
[현재까지 만든 것]
- <단계>: <산출물 요약 — 산출물 소비자가 봐도 이해 가능한 자연어>

[멈춤 사유]
- <왜 멈췄는지>

[다음 권장 액션]
- <다음 단계>를 진행하려면: <명령 예시>
```

## 종료 시 보고 형식

```
[완료된 것]
- <REQ ID>: <기능 요약 — 산출물 소비자 이해 가능 자연어>
- 산출물: spec.md / plan.md / impl.md / verify.md (또는 demo.md)
```

## 핵심 원칙

- REQ 단일 단위만 자동 chain (REQ 다수 → 멈춤)
- 단계 사이(plan→impl, impl→verify)는 자동 진행
- 자체 산출물 만들지 말 것 (chain만 담당)
- sd-* 스킬 결정엔 개입 X
- demo는 후보 판단 시만 묻기 (강제 X)

## 안티패턴

- ❌ REQ 여러 개를 자동으로 모두 처리 (사용자 결정 필요)
- ❌ sd-impl 안에서 R 사이에 멈춤 (REQ 완료 전 중단 금지)
- ❌ demo를 매번 묻기 (UI 키워드 없으면 안 물음)
- ❌ sd-* 스킬 내부 결정 침범 (예: sd-spec의 Q 풀이를 sd-dev가 대신함)
- ❌ 자체 dev.md 같은 산출물 만들기
- ❌ 멈췄는데 자체 판단으로 "그냥 진행" 하기 (멈춤 = 사용자 결정 대기)
