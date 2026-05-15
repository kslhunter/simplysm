# 창고 관리 요구 분석서

## 1. 개요

### 1.1 핵심 목적

창고 입출고 및 기준정보를 관리한다.

## 4. 화면

| §   | 분류     | 화면            | 유형     | 장치 |
| --- | -------- | --------------- | -------- | ---- |
| 4.1 | 기준정보 | Item List       | 조회     | PC   |
| 4.2 | 기준정보 | Item Edit Modal | 트랜잭션 | PC   |

### 4.1 Item List (PC) [확정: 2026-05-13]

Actor: Warehouse Manager

기능 개요:

- Browse items registered in the warehouse.

와이어프레임:

```
[Register]
| Code | Name | Edit |
```

항목:

**시트 컬럼**

| 컬럼 | 종류   | 도메인 매핑      | 비고 |
| ---- | ------ | ---------------- | ---- |
| Code | 텍스트 | [모델.Item.code] | -    |
| Name | 텍스트 | [모델.Item.name] | -    |

동작:

- [Register]: → [화면.Item Edit Modal] 을 모달로 띄움.
- [Edit] (행 버튼): → [화면.Item Edit Modal] 을 모달로 띄움.

### 4.2 Item Edit Modal (PC) [확정: 2026-05-13]

Actor: Warehouse Manager

기능 개요:

- Create or edit an item via modal.

와이어프레임:

```
┌──────────────────────────┐
│ Code [          ]        │
│ Name [          ]        │
│ [Save] [Cancel]          │
└──────────────────────────┘
```

항목:

**입력 폼**

| 항목 | 종류   | 필수 | 도메인 매핑      | 비고 |
| ---- | ------ | ---- | ---------------- | ---- |
| Code | 텍스트 | O    | [모델.Item.code] | -    |
| Name | 텍스트 | O    | [모델.Item.name] | -    |

동작:

- [Save]: Save and close the modal.
- [Cancel]: Close without saving.
