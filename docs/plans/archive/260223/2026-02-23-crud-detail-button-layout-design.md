# CrudDetail 버튼 배치 수정 설계

## 버그

페이지 모드에서 저장/새로고침 버튼이 topbar + inline toolbar 두 곳에 중복 렌더링됨.

## 수정 사양

### page 모드 (`!isModal && topbarCtx`)

| 영역 | 내용 |
|------|------|
| **topbar** | 저장(`canEdit`) + 삭제(`canEdit`) + 새로고침(항상) |
| **toolbar** | Tools 존재 시만 표시 |
| **modalBottom** | 없음 |

### modal 모드 (`isModal`)

| 영역 | 내용 |
|------|------|
| **topbar** | X |
| **toolbar** | Tools 존재 시만 표시 |
| **modalBottom** | 저장(`canEdit`) + 삭제(`canEdit`) — `canEdit()`으로 컨테이너 자체를 감쌈 |
| **ModalAction** | 새로고침 (canEdit 무관, 항상 표시) |

### control 모드 (`!isModal && !topbarCtx`)

| 영역 | 내용 |
|------|------|
| **topbar** | X |
| **toolbar** | 저장(`canEdit`) + 삭제(`canEdit`) + 새로고침(항상) + Tools 존재 시 우측에 추가 |
| **modalBottom** | 없음 |

### toolbar 컨테이너 표시 조건

`(!isModal && !topbarCtx) || defs().tools`

- control 모드: 항상 표시 (최소 새로고침 있음)
- page 모드: Tools 존재 시에만
- modal 모드: Tools 존재 시에만

## 변경 대상

- `packages/solid/src/components/data/crud-detail/CrudDetail.tsx`

## 현재 코드 대비 변경점

| # | 변경 | 위치 |
|---|------|------|
| 1 | topbar에 삭제 버튼 추가 | L189-209 |
| 2 | toolbar 컨테이너 조건을 `(!isModal && !topbarCtx) \|\| defs().tools`로 변경 | L259 |
| 3 | toolbar 내 저장/새로고침/삭제를 `!topbarCtx` 조건으로 감싸기 | L260-290 |
| 4 | toolbar 내 Tools를 canEdit 밖으로 분리 (독립 표시) | L291 |

ModalAction, ModalBottom은 **변경 없음**.
